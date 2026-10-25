//+------------------------------------------------------------------+
//|                                          SuperWarrior_Slave.mq5  |
//|                     SuperWarrior30 Slave Copier EA (1ms Ultra)   |
//|                                  https://superwarrior30.com      |
//+------------------------------------------------------------------+
#property copyright   "SuperWarrior30 Academy"
#property link        "https://superwarrior30.com"
#property version     "3.50"
#property description "MT5 Child Copier EA with Strict Capital Protection"
#property description "Rules: 0.01 lot per $300 balance, Max 2 open trades, 5% Daily DD, 15% Max DD exit."
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>

input group "=== 1. Channel & Terminal Setup ==="
input int             InpChannelID           = 1;              // Channel ID (Must match Master)
input int             InpSlotNumber          = 1;              // VPS Slot Number (for LMS Portal Remote Sync)
input ulong           InpMagicNumber         = 998877;         // Magic Number for Copied Positions
input int             InpMaxSlippagePoints   = 0;              // Max Slippage Points (0 = Instant Execution)
input int             InpMaxTradeAgeSec      = 5;              // Max Trade Age to Copy (Seconds, 0 = No Limit)

input group "=== 2. Capital Protection & Risk Rules ==="
input double          InpBalanceUnit         = 300.0;          // Balance Unit ($300 = 0.01 Lot)
input double          InpLotPerUnit          = 0.01;           // Lot increment per unit
input int             InpMaxOpenTrades       = 2;              // Max concurrent open trades (Strict 2)
input double          InpDailyDDPercent      = 5.0;            // Daily Drawdown Limit (%) -> Pause for Day
input double          InpMaxDDPercent        = 15.0;           // Max Overall Drawdown Limit (%) -> Permanent Exit
input bool            InpEmergencyCloseOnMaxDD = true;         // Auto-close open positions if 15% Max DD breached
input double          InpMaxLotCap           = 5.00;           // Absolute Maximum Lot Ceiling

//--- Objects
CTrade         trade;
CPositionInfo  posInfo;
CSymbolInfo    symInfo;

//--- Internal State
string         g_fileName             = "";
string         g_ctrlJson             = "";
string         g_ctrlTxt              = "";
string         g_lastReadHash         = "";
int            g_copiedCount          = 0;

// Drawdown & Risk State
double         g_initialDeposit       = 0.0;
double         g_startOfDayEquity     = 0.0;
datetime       g_currentDayIndex      = 0;
bool           g_isDailyLocked        = false;
bool           g_isPermanentlyStopped = false;
string         g_riskStopReason       = "";

// Dynamic LMS Portal Control State
bool           g_isPortalPaused       = false;
string         g_portalRiskMode       = "FIXED_LOT";
double         g_portalMultiplier     = 1.0;
double         g_portalFixedLot       = 0.01;
double         g_portalMaxLotCap      = 0.50;
ulong          g_lastCtrlReadMs       = 0;

struct MasterPosition
{
   ulong  ticket;
   string symbol;
   long   type; // 0 = BUY, 1 = SELL
   double volume;
   double openPrice;
   double sl;
   double tp;
   long   openTime;
};

//+------------------------------------------------------------------+
//| Set Safe Order Filling Mode                                      |
//+------------------------------------------------------------------+
void SetSafeFilling(string sym)
{
   if(trade.SetTypeFillingBySymbol(sym))
      return;
      
   uint filling = (uint)SymbolInfoInteger(sym, SYMBOL_FILLING_MODE);
   if((filling & SYMBOL_FILLING_IOC) != 0)
      trade.SetTypeFilling(ORDER_FILLING_IOC);
   else if((filling & SYMBOL_FILLING_FOK) != 0)
      trade.SetTypeFilling(ORDER_FILLING_FOK);
   else
      trade.SetTypeFilling(ORDER_FILLING_RETURN);
}

//+------------------------------------------------------------------+
//| Reset Daily Drawdown tracking at 00:00 Broker Server Time        |
//+------------------------------------------------------------------+
void CheckDailyReset()
{
   datetime today = TimeCurrent() / 86400;
   if(today != g_currentDayIndex)
   {
      g_currentDayIndex  = today;
      g_startOfDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);

      // Only reset daily lock if account has not breached the 15% Max DD hard stop
      if(!g_isPermanentlyStopped)
      {
         g_isDailyLocked  = false;
         g_riskStopReason = "";
         PrintFormat("[SW30 Slave] Daily Reset at New Day (00:00). Starting Day Equity: $%.2f. Daily Lock Cleared.", g_startOfDayEquity);
      }
   }
}

//+------------------------------------------------------------------+
//| Count active open copied positions for this account              |
//+------------------------------------------------------------------+
int CountOpenCopiedTrades()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(posInfo.SelectByIndex(i))
      {
         if(posInfo.Magic() == InpMagicNumber)
            count++;
      }
   }
   return count;
}

//+------------------------------------------------------------------+
//| Calculate Today's Closed Realized Profit / Loss from History      |
//+------------------------------------------------------------------+
double GetTodayRealizedPnL()
{
   datetime startOfDayTime = (datetime)(g_currentDayIndex * 86400);
   datetime now = TimeCurrent();

   if(!HistorySelect(startOfDayTime, now))
      return 0.0;

   double todayProfit = 0.0;
   int dealsTotal = HistoryDealsTotal();

   for(int i = 0; i < dealsTotal; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket > 0)
      {
         long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
         if(magic == InpMagicNumber)
         {
            long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
            if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT)
            {
               todayProfit += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
               todayProfit += HistoryDealGetDouble(dealTicket, DEAL_SWAP);
               todayProfit += HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
            }
         }
      }
   }
   return todayProfit;
}

//+------------------------------------------------------------------+
//| Calculate Current Floating Profit / Loss                         |
//+------------------------------------------------------------------+
double GetCurrentFloatingPnL()
{
   double floating = 0.0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(posInfo.SelectByIndex(i))
      {
         if(posInfo.Magic() == InpMagicNumber)
            floating += posInfo.Profit() + posInfo.Swap();
      }
   }
   return floating;
}

//+------------------------------------------------------------------+
//| Emergency Close: Close all positions on 15% Max DD breach        |
//+------------------------------------------------------------------+
void CloseAllCopiedPositions(string reason)
{
   PrintFormat("🚨 [15%% MAX DD BREACH] %s. Closing all positions immediately to preserve remaining capital!", reason);
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(posInfo.SelectByIndex(i))
      {
         if(posInfo.Magic() == InpMagicNumber)
         {
            trade.PositionClose(posInfo.Ticket());
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Calculate Lot Size strictly according to account balance         |
//| Linear Rule: $300 balance = 0.01 lot                             |
//+------------------------------------------------------------------+
double CalculateLots(string sym, double masterLot)
{
   double minLot  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
   if(minLot <= 0) minLot = 0.01;
   if(maxLot <= 0) maxLot = 100.0;
   if(stepLot <= 0) stepLot = 0.01;
   
   // 1. Core Rule: Every $300 balance = 0.01 Lot (Independent of Master Lots)
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   int units = (int)MathFloor(balance / InpBalanceUnit);
   if(units < 1) units = 1;
   double calculated = units * InpLotPerUnit;
   
   // 2. If LMS portal explicitly assigned a fixed lot override, honor it
   if(g_portalRiskMode == "FIXED_LOT" && g_portalFixedLot > 0)
   {
      calculated = g_portalFixedLot;
   }
   
   // 3. Apply lot safeguards
   if(g_portalMaxLotCap > 0 && calculated > g_portalMaxLotCap)
      calculated = g_portalMaxLotCap;
   if(calculated > InpMaxLotCap)
      calculated = InpMaxLotCap;
      
   if(calculated < minLot) calculated = minLot;
   if(calculated > maxLot) calculated = maxLot;
   
   calculated = MathFloor(calculated / stepLot) * stepLot;
   return NormalizeDouble(calculated, 2);
}

//+------------------------------------------------------------------+
//| Read Remote LMS Control File                                     |
//+------------------------------------------------------------------+
void ReadControlFile(string fName)
{
   int commonFlags = FILE_COMMON;
   if(!FileIsExist(fName, FILE_COMMON))
   {
      if(!FileIsExist(fName, 0))
         return;
      commonFlags = 0;
   }
      
   int handle = FileOpen(fName, FILE_READ | FILE_TXT | commonFlags | FILE_SHARE_READ);
   if(handle == INVALID_HANDLE)
      return;
      
   string content = "";
   while(!FileIsEnding(handle))
   {
      content += FileReadString(handle) + "\n";
   }
   FileClose(handle);
   
   if(StringLen(content) < 4) return;
   
   // Check PAUSE / DISCONNECT
   if(StringFind(content, "PAUSED") >= 0 || StringFind(content, "DISCONNECTED") >= 0)
   {
      g_isPortalPaused = true;
   }
   else if(StringFind(content, "ACTIVE") >= 0)
   {
      g_isPortalPaused = false;
   }
      
   // Parse fixedLot
   int fLotPos = StringFind(content, "fixedLot");
   if(fLotPos < 0) fLotPos = StringFind(content, "FIXEDLOT");
   if(fLotPos >= 0)
   {
      string sub = StringSubstr(content, fLotPos + 9, 10);
      StringReplace(sub, ":", "");
      StringReplace(sub, "=", "");
      StringReplace(sub, "\"", "");
      StringTrimLeft(sub);
      double fl = StringToDouble(sub);
      if(fl > 0.0) g_portalFixedLot = fl;
   }
   
   // Parse maxLotLimit
   int capPos = StringFind(content, "maxLotLimit");
   if(capPos >= 0)
   {
      string sub = StringSubstr(content, capPos + 12, 10);
      StringReplace(sub, ":", "");
      StringReplace(sub, "=", "");
      StringReplace(sub, "\"", "");
      StringTrimLeft(sub);
      double cap = StringToDouble(sub);
      if(cap > 0.0) g_portalMaxLotCap = cap;
   }
   
   // Parse riskMode
   if(StringFind(content, "FIXED_LOT") >= 0)
      g_portalRiskMode = "FIXED_LOT";
}

void CheckLmsPortalControl()
{
   ulong nowMs = GetTickCount64();
   if(nowMs - g_lastCtrlReadMs < 100) // Check every 100ms
      return;
   g_lastCtrlReadMs = nowMs;

   ReadControlFile(g_ctrlTxt);
   ReadControlFile(g_ctrlJson);
}

//+------------------------------------------------------------------+
//| Update Chart Information Display (HUD)                           |
//+------------------------------------------------------------------+
void UpdateComment(string extraStatus)
{
   bool termAllowed = (bool)TerminalInfoInteger(TERMINAL_TRADE_ALLOWED);
   bool eaAllowed   = (bool)MQLInfoInteger(MQL_TRADE_ALLOWED);
   string algoNotice = (termAllowed && eaAllowed) ? "🟢 ENABLED (Ready)" : "🔴 DISABLED (Click Algo Trading Toolbar Button!)";

   double balance    = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity     = AccountInfoDouble(ACCOUNT_EQUITY);
   double currentLot = CalculateLots(_Symbol, 0.01);
   int    openTrades = CountOpenCopiedTrades();

   double totalDrawdownUsd = g_initialDeposit - equity;
   double totalDDPct       = (g_initialDeposit > 0) ? (totalDrawdownUsd / g_initialDeposit) * 100.0 : 0.0;
   if(totalDDPct < 0) totalDDPct = 0.0;

   double todayPnL     = GetTodayRealizedPnL() + GetCurrentFloatingPnL();
   double todayLossUsd = (todayPnL < 0) ? MathAbs(todayPnL) : 0.0;
   double dailyDDPct   = (g_startOfDayEquity > 0) ? (todayLossUsd / g_startOfDayEquity) * 100.0 : 0.0;

   string statusBadge = "🟢 ACTIVE (Copying Live)";
   if(g_isPermanentlyStopped)
      statusBadge = "🔴 PERMANENTLY STOPPED (15% Max DD Breached)";
   else if(g_isDailyLocked)
      statusBadge = "🟡 PAUSED FOR TODAY (5% Daily DD Reached)";
   else if(g_isPortalPaused)
      statusBadge = "⏸️ PAUSED (Via LMS Web Portal)";
   else if(openTrades >= InpMaxOpenTrades)
      statusBadge = "🔵 MAX CONCURRENT TRADES (2/2 Active)";

   string hud = "\n" +
      "===============================================================\n" +
      "      SUPERWARRIOR30 SLAVE COPIER v3.50 (RISK GUARDIAN)        \n" +
      "===============================================================\n" +
      StringFormat(" Algo Trading   : %s\n", algoNotice) +
      StringFormat(" Terminal Status: %s\n", statusBadge) +
      StringFormat(" LMS Slot / Ch  : Slot #%d  |  Channel #%d\n", InpSlotNumber, InpChannelID) +
      "---------------------------------------------------------------\n" +
      StringFormat(" Account Balance: $%.2f USD\n", balance) +
      StringFormat(" Account Equity : $%.2f USD\n", equity) +
      StringFormat(" Sized Lot/Trade: %.2f Lot  (Rule: $300 = 0.01 lot)\n", currentLot) +
      StringFormat(" Open Positions : %d / %d Allowed (Max 2 Trades)\n", openTrades, InpMaxOpenTrades) +
      StringFormat(" Total Exposure : %.2f Lot  (Max %.2f)\n", currentLot * openTrades, currentLot * InpMaxOpenTrades) +
      "---------------------------------------------------------------\n" +
      StringFormat(" Daily DD (5%%)  : -$%.2f  (%.1f%% / 5.0%% Limit - Reset 00:00)\n", todayLossUsd, dailyDDPct) +
      StringFormat(" Max DD (15%%)   : -$%.2f  (%.1f%% / 15.0%% Hard Stop Exit)\n", (totalDrawdownUsd > 0 ? totalDrawdownUsd : 0.0), totalDDPct) +
      StringFormat(" 15%% Exit Cutoff: Below $%.2f Equity\n", g_initialDeposit * 0.85) +
      "---------------------------------------------------------------\n" +
      StringFormat(" Engine Status  : %s\n", extraStatus) +
      "===============================================================\n";

   Comment(hud);
}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   g_fileName = "SW_Master_Ch" + IntegerToString(InpChannelID) + ".txt";
   g_ctrlJson = "slot_" + IntegerToString(InpSlotNumber) + "_control.json";
   g_ctrlTxt  = "slot_" + IntegerToString(InpSlotNumber) + "_control.txt";
   
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(100);
   
   g_initialDeposit   = AccountInfoDouble(ACCOUNT_BALANCE);
   g_startOfDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(g_initialDeposit <= 0) g_initialDeposit = AccountInfoDouble(ACCOUNT_EQUITY);
   if(g_startOfDayEquity <= 0) g_startOfDayEquity = g_initialDeposit;
   g_currentDayIndex  = TimeCurrent() / 86400;

   g_isDailyLocked        = false;
   g_isPermanentlyStopped = false;
   g_riskStopReason       = "";

   // Read portal control immediately on init
   CheckLmsPortalControl();
   
   // High-Resolution 1ms Timer
   EventSetMillisecondTimer(1);
   
   PrintFormat("⚡ SuperWarrior Slave Copier v3.50 ACTIVE | Channel %d | Slot #%d | Sizing: $%.2f = %.2f lot | Max Trades: %d",
               InpChannelID, InpSlotNumber, InpBalanceUnit, InpLotPerUnit, InpMaxOpenTrades);
               
   UpdateComment(g_isPortalPaused ? "⏸️ PAUSED via Student Portal" : "Waiting for Master trades...");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
}

//+------------------------------------------------------------------+
//| Match Broker Symbol Name                                         |
//+------------------------------------------------------------------+
string MatchSymbol(string masterSym)
{
   if(SymbolSelect(masterSym, true))
      return masterSym;
      
   string upperSym = masterSym;
   StringToUpper(upperSym);
   if(SymbolSelect(upperSym, true))
      return upperSym;
      
   string lowerSym = masterSym;
   StringToLower(lowerSym);
   if(SymbolSelect(lowerSym, true))
      return lowerSym;

   string cleanMaster = upperSym;
   StringReplace(cleanMaster, "M", "");
   StringReplace(cleanMaster, "C", "");
   StringReplace(cleanMaster, ".", "");
   StringReplace(cleanMaster, "_", "");
   StringReplace(cleanMaster, "#", "");

   int totalSymbols = SymbolsTotal(false);
   for(int i = 0; i < totalSymbols; i++)
   {
      string localSym = SymbolName(i, false);
      string cleanLocal = localSym;
      StringToUpper(cleanLocal);
      StringReplace(cleanLocal, "M", "");
      StringReplace(cleanLocal, "C", "");
      StringReplace(cleanLocal, ".", "");
      StringReplace(cleanLocal, "_", "");
      StringReplace(cleanLocal, "#", "");

      if(cleanLocal == cleanMaster)
      {
         SymbolSelect(localSym, true);
         return localSym;
      }
   }

   int mwTotal = SymbolsTotal(true);
   for(int i = 0; i < mwTotal; i++)
   {
      string localSym = SymbolName(i, true);
      string upperLocal = localSym;
      StringToUpper(upperLocal);
      if(StringFind(upperLocal, cleanMaster) >= 0 || StringFind(cleanMaster, upperLocal) >= 0)
      {
         return localSym;
      }
   }

   return "";
}

//+------------------------------------------------------------------+
//| Process Master Positions with Strict Risk Protections            |
//+------------------------------------------------------------------+
void ProcessMasterPositions()
{
   CheckDailyReset();

   // -------------------------------------------------------------
   // A. Real-time 15% Max Lifetime Drawdown Check (Hard Kill-Switch)
   // -------------------------------------------------------------
   double currentEquity    = AccountInfoDouble(ACCOUNT_EQUITY);
   double totalDrawdownUsd = g_initialDeposit - currentEquity;
   double totalDDPct       = (g_initialDeposit > 0) ? (totalDrawdownUsd / g_initialDeposit) * 100.0 : 0.0;

   if(totalDDPct >= InpMaxDDPercent || g_isPermanentlyStopped)
   {
      if(!g_isPermanentlyStopped)
      {
         g_isPermanentlyStopped = true;
         g_riskStopReason = StringFormat("15%% Max DD Breached (-$%.2f / %.1f%%). Disconnected from copy trading.", totalDrawdownUsd, totalDDPct);
         PrintFormat("🛑 [CRITICAL RISK STOP] %s", g_riskStopReason);
         if(InpEmergencyCloseOnMaxDD && PositionsTotal() > 0)
            CloseAllCopiedPositions(g_riskStopReason);
      }
      return; // Never open trades again
   }

   // -------------------------------------------------------------
   // B. Real-time 5% Daily Drawdown Check (Daily Circuit Breaker)
   // -------------------------------------------------------------
   double todayPnL     = GetTodayRealizedPnL() + GetCurrentFloatingPnL();
   double todayLossUsd = (todayPnL < 0) ? MathAbs(todayPnL) : 0.0;
   double dailyDDPct   = (g_startOfDayEquity > 0) ? (todayLossUsd / g_startOfDayEquity) * 100.0 : 0.0;

   if(dailyDDPct >= InpDailyDDPercent || g_isDailyLocked)
   {
      if(!g_isDailyLocked)
      {
         g_isDailyLocked  = true;
         g_riskStopReason = StringFormat("5%% Daily DD Reached (-$%.2f / %.1f%%). Paused for today.", todayLossUsd, dailyDDPct);
         PrintFormat("⏸️ [DAILY DD PAUSE] %s", g_riskStopReason);
      }
      // Note: do not return yet; existing positions may still need close synchronization!
   }

   // -------------------------------------------------------------
   // Read Master positions from shared memory file
   // -------------------------------------------------------------
   if(!FileIsExist(g_fileName, FILE_COMMON))
      return;
      
   int fileHandle = FileOpen(g_fileName, FILE_READ | FILE_TXT | FILE_COMMON | FILE_SHARE_READ);
   if(fileHandle == INVALID_HANDLE)
      return;
      
   string fullContent = "";
   ulong masterMicroTime = 0;
   MasterPosition masterList[];
   ArrayResize(masterList, 0);
   
   bool firstLine = true;
   while(!FileIsEnding(fileHandle))
   {
      string line = FileReadString(fileHandle);
      StringTrimLeft(line);
      StringTrimRight(line);
      if(line == "") continue;
      
      fullContent += line + "\n";
      
      if(firstLine)
      {
         firstLine = false;
         string headerParts[];
         int hCount = StringSplit(line, '|', headerParts);
         if(hCount >= 3)
         {
            masterMicroTime = (ulong)StringToInteger(headerParts[2]);
         }
         continue;
      }
      
      string parts[];
      int count = StringSplit(line, '|', parts);
      if(count >= 8)
      {
         int idx = ArraySize(masterList);
         ArrayResize(masterList, idx + 1);
         masterList[idx].ticket    = (ulong)StringToInteger(parts[0]);
         masterList[idx].symbol    = parts[1];
         masterList[idx].type      = StringToInteger(parts[2]);
         masterList[idx].volume    = StringToDouble(parts[3]);
         masterList[idx].openPrice = StringToDouble(parts[4]);
         masterList[idx].sl        = StringToDouble(parts[5]);
         masterList[idx].tp        = StringToDouble(parts[6]);
         masterList[idx].openTime  = StringToInteger(parts[7]);
      }
   }
   FileClose(fileHandle);
   
   if(fullContent == g_lastReadHash)
      return;
      
   g_lastReadHash = fullContent;
   
   ulong nowMicro = GetMicrosecondCount();
   double latencyMs = 0.0;
   if(masterMicroTime > 0 && nowMicro >= masterMicroTime)
   {
      latencyMs = (double)(nowMicro - masterMicroTime) / 1000.0;
   }
   
   // -------------------------------------------------------------
   // 1. Synchronize Close: If position closed on Master, close on Slave
   // -------------------------------------------------------------
   int totalPositions = PositionsTotal();
   g_copiedCount = 0;
   
   for(int i = totalPositions - 1; i >= 0; i--)
   {
      if(posInfo.SelectByIndex(i))
      {
         if(posInfo.Magic() == InpMagicNumber)
         {
            g_copiedCount++;
            string comment = posInfo.Comment();
            ulong mTicket = (ulong)StringToInteger(comment);
            
            bool foundOnMaster = false;
            for(int m = 0; m < ArraySize(masterList); m++)
            {
               if(masterList[m].ticket == mTicket)
               {
                  foundOnMaster = true;
                  break;
               }
            }
            
            if(!foundOnMaster && mTicket > 0)
            {
               trade.PositionClose(posInfo.Ticket());
               Print("✅ Master closed ticket #", mTicket, ". Closed child position #", posInfo.Ticket(), " instantly.");
               g_copiedCount--;
            }
         }
      }
   }
   
   // If Account is Daily Locked by 5% DD, do not open new trades today
   if(g_isDailyLocked)
   {
      return;
   }

   // If Student has Paused on LMS, do not open new trades
   if(g_isPortalPaused)
   {
      return;
   }

   // -------------------------------------------------------------
   // 2. Synchronize Open: Copy new Master trades
   // -------------------------------------------------------------
   for(int m = 0; m < ArraySize(masterList); m++)
   {
      ulong targetTicket = masterList[m].ticket;
      
      if(InpMaxTradeAgeSec > 0)
      {
         long age = (long)TimeCurrent() - masterList[m].openTime;
         if(age > InpMaxTradeAgeSec)
            continue;
      }
      
      bool alreadyCopied = false;
      for(int p = 0; p < PositionsTotal(); p++)
      {
         if(posInfo.SelectByIndex(p))
         {
            if(posInfo.Magic() == InpMagicNumber && posInfo.Comment() == IntegerToString(targetTicket))
            {
               alreadyCopied = true;
               break;
            }
         }
      }
      
      if(alreadyCopied)
         continue;

      // STRICT CONCURRENCY CHECK: Exactly max 2 open trades at a time
      int currentOpenCount = CountOpenCopiedTrades();
      if(currentOpenCount >= InpMaxOpenTrades)
      {
         PrintFormat("🛡️ [MAX 2 TRADES REACHED] Account already has %d active open positions. Master trade #%d skipped to protect exposure.",
                     currentOpenCount, targetTicket);
         continue; // Reject 3rd trade!
      }
         
      string localSymbol = MatchSymbol(masterList[m].symbol);
      if(localSymbol == "")
      {
         Print("❌ Symbol not found for Master symbol: ", masterList[m].symbol);
         continue;
      }
      
      SetSafeFilling(localSymbol);
      
      // Calculate lots strictly based on account balance ($300 = 0.01 lot)
      double lots = CalculateLots(localSymbol, masterList[m].volume);
      string commentStr = IntegerToString(targetTicket);
      
      double ask = SymbolInfoDouble(localSymbol, SYMBOL_ASK);
      double bid = SymbolInfoDouble(localSymbol, SYMBOL_BID);
      double point = SymbolInfoDouble(localSymbol, SYMBOL_POINT);
      if(point <= 0) point = 0.00001;
      
      if(InpMaxSlippagePoints > 0)
      {
         double currentPrice = (masterList[m].type == 0) ? ask : bid;
         double diffPoints = MathAbs(currentPrice - masterList[m].openPrice) / point;
         if(diffPoints > InpMaxSlippagePoints)
         {
            Print("⚠️ Slippage exceeded (", diffPoints, " pts > ", InpMaxSlippagePoints, " pts). Skipped #", targetTicket);
            continue;
         }
      }
      
      bool res = false;
      if(masterList[m].type == 0) // BUY
      {
         res = trade.Buy(lots, localSymbol, ask, 0, 0, commentStr);
      }
      else if(masterList[m].type == 1) // SELL
      {
         res = trade.Sell(lots, localSymbol, bid, 0, 0, commentStr);
      }
      
      if(res)
      {
         g_copiedCount++;
         Print("🚀 [1ms Engine] COPIED Master #", targetTicket, " -> Child (", localSymbol, ", ", lots, " lots) | Latency: ", DoubleToString(latencyMs, 2), "ms");
      }
      else
      {
         Print("❌ Trade execution failed: ", trade.ResultRetcodeDescription());
      }
   }
}

//+------------------------------------------------------------------+
//| OnTick - Live execution and tick polling                         |
//+------------------------------------------------------------------+
void OnTick()
{
   CheckLmsPortalControl();
   UpdateComment(g_isPermanentlyStopped ? "🛑 PERMANENTLY STOPPED (15% Max DD Breached)" :
                 g_isDailyLocked ? "🟡 PAUSED FOR TODAY (5% Daily DD Reached)" :
                 g_isPortalPaused ? "⏸️ PAUSED via Student Portal" : "Streaming Live (1ms active)");
   ProcessMasterPositions();
}

//+------------------------------------------------------------------+
//| OnTimer - High-speed 1ms polling                                 |
//+------------------------------------------------------------------+
void OnTimer()
{
   CheckLmsPortalControl();
   static ulong lastCommentUpdate = 0;
   ulong nowMs = GetTickCount64();
   if(nowMs - lastCommentUpdate > 300) // Update UI comment every 300ms
   {
      lastCommentUpdate = nowMs;
      UpdateComment(g_isPermanentlyStopped ? "🛑 PERMANENTLY STOPPED (15% Max DD Breached)" :
                    g_isDailyLocked ? "🟡 PAUSED FOR TODAY (5% Daily DD Reached)" :
                    g_isPortalPaused ? "⏸️ PAUSED via Student Portal" : "Streaming Live (1ms active)");
   }
   ProcessMasterPositions();
}
//+------------------------------------------------------------------+
