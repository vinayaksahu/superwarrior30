//+------------------------------------------------------------------+
//|                               SuperWarrior30_Copier_Receiver.mq5 |
//|                                  SuperWarrior30 Trading Academy  |
//|                         https://superwarrior30.com               |
//+------------------------------------------------------------------+
#property copyright   "SuperWarrior30 Trading Academy"
#property link        "https://superwarrior30.com"
#property version     "2.00"
#property description "MT5 Copy Trading & Algo Risk Guardian"
#property description "Rules: 0.01 lot per $300 balance, Max 2 open trades, 5% Daily DD, 15% Max DD hard exit."
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\AccountInfo.mqh>

//--- Input Parameters
input group "=== 1. Lot Sizing Rules ==="
input double   InpBalancePerUnit    = 300.0;    // Balance Unit ($300 = 0.01 Lot)
input double   InpLotPerUnit        = 0.01;     // Lot increment per unit
input double   InpMinLot            = 0.01;     // Minimum lot size
input double   InpMaxLotCap         = 5.00;     // Maximum hard lot ceiling

input group "=== 2. Trade Concurrency Limit ==="
input int      InpMaxOpenTrades     = 2;        // Max concurrent open trades (Strict 2)

input group "=== 3. Drawdown Safeguards ==="
input double   InpDailyDDPercent    = 5.0;      // Daily Drawdown Limit (%) -> Pause for today
input double   InpMaxDDPercent      = 15.0;     // Max Overall Drawdown Limit (%) -> Permanent Exit
input bool     InpEmergencyCloseAll = true;     // Auto-close open trades if 15% Max DD breached

input group "=== 4. Trade Execution ==="
input ulong    InpMagicNumber       = 300300;   // Magic Number for Copier Trades
input ulong    InpDeviationPips     = 20;       // Max slippage deviation in points

//--- Global Objects & State
CTrade         m_trade;
CPositionInfo  m_position;
CAccountInfo   m_account;

double   g_initialDeposit         = 0.0;
double   g_startOfDayEquity       = 0.0;
datetime g_currentDayIndex        = 0;
bool     g_isDailyLocked          = false;
bool     g_isPermanentlyStopped   = false;
string   g_stopReason             = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   m_trade.SetExpertMagicNumber(InpMagicNumber);
   m_trade.SetDeviationInPoints(InpDeviationPips);
   m_trade.SetTypeFilling(ORDER_FILLING_IOC);

   g_initialDeposit   = m_account.Balance();
   g_startOfDayEquity = m_account.Equity();
   g_currentDayIndex  = TimeCurrent() / 86400;

   g_isDailyLocked        = false;
   g_isPermanentlyStopped = false;
   g_stopReason           = "ACTIVE";

   PrintFormat("[SW30 Algo] Initialized. Initial Balance: $%.2f | Starting Equity: $%.2f | Sizing: $%.2f = %.2f lot | Max Trades: %d",
               g_initialDeposit, g_startOfDayEquity, InpBalancePerUnit, InpLotPerUnit, InpMaxOpenTrades);

   UpdateChartHUD();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Comment(""); // Clear chart HUD
}

//+------------------------------------------------------------------+
//| Check and reset daily tracking at 00:00 Broker Server Time       |
//+------------------------------------------------------------------+
void CheckDailyReset()
{
   datetime today = TimeCurrent() / 86400;
   if(today != g_currentDayIndex)
   {
      g_currentDayIndex  = today;
      g_startOfDayEquity = m_account.Equity();
      
      // Reset daily lock if not permanently stopped by 15% Max DD
      if(!g_isPermanentlyStopped)
      {
         g_isDailyLocked = false;
         g_stopReason    = "ACTIVE";
         PrintFormat("[SW30 Algo] Daily Reset at New Day. Starting Day Equity: $%.2f. Daily Lock cleared.", g_startOfDayEquity);
      }
   }
}

//+------------------------------------------------------------------+
//| Calculate Lot Size strictly according to account balance         |
//| $300 -> 0.01, $600 -> 0.02, $900 -> 0.03, $1200 -> 0.04...      |
//+------------------------------------------------------------------+
double CalculateAlgoLotSize(double currentBalance)
{
   int units = (int)MathFloor(currentBalance / InpBalancePerUnit);
   if(units < 1) units = 1;
   
   double calculatedLot = units * InpLotPerUnit;
   
   // Apply broker symbol restrictions
   string symbol = _Symbol;
   double minLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

   if(calculatedLot < minLot) calculatedLot = minLot;
   if(calculatedLot > InpMaxLotCap) calculatedLot = InpMaxLotCap;
   if(calculatedLot > maxLot) calculatedLot = maxLot;

   // Normalize to valid lot step
   if(lotStep > 0)
      calculatedLot = MathFloor(calculatedLot / lotStep) * lotStep;

   return NormalizeDouble(calculatedLot, 2);
}

//+------------------------------------------------------------------+
//| Count active open positions for this EA / Account                |
//+------------------------------------------------------------------+
int CountOpenTrades()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         // Count all positions on the client account (strict safety)
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
         long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT)
         {
            todayProfit += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
            todayProfit += HistoryDealGetDouble(dealTicket, DEAL_SWAP);
            todayProfit += HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
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
      if(m_position.SelectByIndex(i))
      {
         floating += m_position.Profit() + m_position.Swap();
      }
   }
   return floating;
}

//+------------------------------------------------------------------+
//| Emergency: Close all open positions immediately                   |
//+------------------------------------------------------------------+
void CloseAllPositions(string reason)
{
   PrintFormat("[EMERGENCY ACTION] Closing all positions. Reason: %s", reason);
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(m_position.SelectByIndex(i))
      {
         m_trade.PositionClose(m_position.Ticket());
      }
   }
}

//+------------------------------------------------------------------+
//| Master Check: Can Algo Open A New Trade?                         |
//+------------------------------------------------------------------+
bool IsEligibleToTrade(double &outLotSize, string &outDeclineReason)
{
   CheckDailyReset();

   double currentEquity  = m_account.Equity();
   double currentBalance = m_account.Balance();

   // 1. Check 15% Max Lifetime Drawdown (Hard Stop & Disconnect)
   double totalDrawdownUsd = g_initialDeposit - currentEquity;
   double totalDDPct       = (g_initialDeposit > 0) ? (totalDrawdownUsd / g_initialDeposit) * 100.0 : 0.0;

   if(totalDDPct >= InpMaxDDPercent || g_isPermanentlyStopped)
   {
      g_isPermanentlyStopped = true;
      g_stopReason           = StringFormat("15%% Max DD Breached (-$%.2f / %.1f%%)", totalDrawdownUsd, totalDDPct);
      outDeclineReason       = g_stopReason;

      if(InpEmergencyCloseAll && PositionsTotal() > 0)
         CloseAllPositions(g_stopReason);

      return false;
   }

   // 2. Check 5% Daily Drawdown (Daily Circuit Breaker)
   double todayPnL = GetTodayRealizedPnL() + GetCurrentFloatingPnL();
   double todayLossUsd = (todayPnL < 0) ? MathAbs(todayPnL) : 0.0;
   double dailyDDPct   = (g_startOfDayEquity > 0) ? (todayLossUsd / g_startOfDayEquity) * 100.0 : 0.0;

   if(dailyDDPct >= InpDailyDDPercent || g_isDailyLocked)
   {
      g_isDailyLocked  = true;
      g_stopReason     = StringFormat("5%% Daily DD Hit (Loss: -$%.2f / %.1f%%). Paused until tomorrow.", todayLossUsd, dailyDDPct);
      outDeclineReason = g_stopReason;
      return false;
   }

   // 3. Check Max Open Positions Limit (Strictly 2 Trades)
   int currentOpen = CountOpenTrades();
   if(currentOpen >= InpMaxOpenTrades)
   {
      outDeclineReason = StringFormat("Max Open Trades Limit (%d) Reached. Currently active: %d", InpMaxOpenTrades, currentOpen);
      return false;
   }

   // 4. Calculate Sized Lot (e.g. $300 -> 0.01, $600 -> 0.02, $1200 -> 0.04)
   outLotSize = CalculateAlgoLotSize(currentBalance);
   return true;
}

//+------------------------------------------------------------------+
//| Execute Buy Order with Strict Risk Protection                    |
//+------------------------------------------------------------------+
bool OpenBuyOrder(string symbol, double slPrice = 0.0, double tpPrice = 0.0, string comment = "SW30 Buy")
{
   double lotSize = 0.0;
   string declineReason = "";

   if(!IsEligibleToTrade(lotSize, declineReason))
   {
      PrintFormat("[TRADE BLOCKED] %s", declineReason);
      return false;
   }

   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   if(m_trade.Buy(lotSize, symbol, ask, slPrice, tpPrice, comment))
   {
      PrintFormat("[BUY EXECUTED] %s | Lots: %.2f | Price: %.5f", symbol, lotSize, ask);
      UpdateChartHUD();
      return true;
   }

   PrintFormat("[BUY FAILED] Error: %d - %s", GetLastError(), m_trade.ResultComment());
   return false;
}

//+------------------------------------------------------------------+
//| Execute Sell Order with Strict Risk Protection                   |
//+------------------------------------------------------------------+
bool OpenSellOrder(string symbol, double slPrice = 0.0, double tpPrice = 0.0, string comment = "SW30 Sell")
{
   double lotSize = 0.0;
   string declineReason = "";

   if(!IsEligibleToTrade(lotSize, declineReason))
   {
      PrintFormat("[TRADE BLOCKED] %s", declineReason);
      return false;
   }

   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   if(m_trade.Sell(lotSize, symbol, bid, slPrice, tpPrice, comment))
   {
      PrintFormat("[SELL EXECUTED] %s | Lots: %.2f | Price: %.5f", symbol, lotSize, bid);
      UpdateChartHUD();
      return true;
   }

   PrintFormat("[SELL FAILED] Error: %d - %s", GetLastError(), m_trade.ResultComment());
   return false;
}

//+------------------------------------------------------------------+
//| OnTick - Live Continuous Risk Guard & Monitoring                |
//+------------------------------------------------------------------+
void OnTick()
{
   CheckDailyReset();

   // Real-time floating drawdown monitoring
   double currentEquity    = m_account.Equity();
   double totalDrawdownUsd = g_initialDeposit - currentEquity;
   double totalDDPct       = (g_initialDeposit > 0) ? (totalDrawdownUsd / g_initialDeposit) * 100.0 : 0.0;

   // Real-time 15% Max DD breach detection
   if(totalDDPct >= InpMaxDDPercent && !g_isPermanentlyStopped)
   {
      g_isPermanentlyStopped = true;
      g_stopReason = StringFormat("15%% Max DD Breach detected during live trade (-$%.2f / %.1f%%)", totalDrawdownUsd, totalDDPct);
      PrintFormat("[CRITICAL] %s", g_stopReason);

      if(InpEmergencyCloseAll)
         CloseAllPositions(g_stopReason);
   }

   // Real-time 5% Daily DD breach detection
   double todayPnL = GetTodayRealizedPnL() + GetCurrentFloatingPnL();
   double todayLossUsd = (todayPnL < 0) ? MathAbs(todayPnL) : 0.0;
   double dailyDDPct   = (g_startOfDayEquity > 0) ? (todayLossUsd / g_startOfDayEquity) * 100.0 : 0.0;

   if(dailyDDPct >= InpDailyDDPercent && !g_isDailyLocked)
   {
      g_isDailyLocked = true;
      g_stopReason    = StringFormat("5%% Daily DD Limit reached (-$%.2f). Paused for today.", todayLossUsd);
      PrintFormat("[WARNING] %s", g_stopReason);
   }

   UpdateChartHUD();
}

//+------------------------------------------------------------------+
//| Update On-Chart HUD Information Display                          |
//+------------------------------------------------------------------+
void UpdateChartHUD()
{
   double balance     = m_account.Balance();
   double equity      = m_account.Equity();
   double currentLot  = CalculateAlgoLotSize(balance);
   int    openTrades  = CountOpenTrades();
   
   double totalDDPct = (g_initialDeposit > 0) ? ((g_initialDeposit - equity) / g_initialDeposit) * 100.0 : 0.0;
   if(totalDDPct < 0) totalDDPct = 0.0;

   double todayPnL     = GetTodayRealizedPnL() + GetCurrentFloatingPnL();
   double todayLoss    = (todayPnL < 0) ? MathAbs(todayPnL) : 0.0;
   double dailyDDPct   = (g_startOfDayEquity > 0) ? (todayLoss / g_startOfDayEquity) * 100.0 : 0.0;

   string statusText = "🟢 ACTIVE (Ready to Copy)";
   if(g_isPermanentlyStopped)
      statusText = "🔴 PERMANENTLY STOPPED (15% Max DD Breached)";
   else if(g_isDailyLocked)
      statusText = "🟡 PAUSED FOR TODAY (5% Daily DD Limit Hit)";
   else if(openTrades >= InpMaxOpenTrades)
      statusText = "🔵 MAX POSITIONS ACTIVE (2/2 Trades Open)";

   string hud = "\n" +
      "==========================================================\n" +
      "      SUPERWARRIOR30 MT5 RISK GUARDIAN (ALGO COPIER)      \n" +
      "==========================================================\n" +
      StringFormat(" Status:               %s\n", statusText) +
      StringFormat(" Balance:              $%.2f USD\n", balance) +
      StringFormat(" Equity:               $%.2f USD\n", equity) +
      "----------------------------------------------------------\n" +
      StringFormat(" Sized Lot Per Trade:  %.2f Lot  ($300 = 0.01 lot)\n", currentLot) +
      StringFormat(" Open Positions:       %d / %d Allowed\n", openTrades, InpMaxOpenTrades) +
      StringFormat(" Total Max Exposure:   %.2f Lot\n", currentLot * InpMaxOpenTrades) +
      "----------------------------------------------------------\n" +
      StringFormat(" Daily DD Status:      -$%.2f  (%.1f%% / 5.0%% Limit)\n", todayLoss, dailyDDPct) +
      StringFormat(" Lifetime Max DD:      -$%.2f  (%.1f%% / 15.0%% Exit)\n", (g_initialDeposit - equity > 0 ? g_initialDeposit - equity : 0.0), totalDDPct) +
      StringFormat(" 15%% Exit Cutoff:      Below $%.2f Equity\n", g_initialDeposit * 0.85) +
      "==========================================================\n";

   Comment(hud);
}
//+------------------------------------------------------------------+
