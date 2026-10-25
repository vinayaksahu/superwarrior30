//+------------------------------------------------------------------+
//|                                     MT5_Copier_Risk_Guardian.mq5 |
//|                                  SuperWarrior30 Copy Trading     |
//|                         https://superwarrior30.com               |
//+------------------------------------------------------------------+
#property copyright "SuperWarrior30 Trading Academy"
#property link      "https://superwarrior30.com"
#property version   "1.00"
#property strict

//--- Input Parameters
input group "=== Risk Management Rules ==="
input double InpBalanceUnit       = 300.0;    // Balance Unit for 0.01 lot ($300 = 0.01)
input double InpLotPerUnit        = 0.01;     // Lot Size per $300 balance
input int    InpMaxOpenTrades     = 2;        // Max Concurrent Open Trades (Strict 2)
input double InpDailyDDPercent    = 5.0;      // Daily Drawdown Limit (%) -> Lock for Day
input double InpMaxDDPercent      = 15.0;     // Max Drawdown Limit (%) -> Exit Copy Trading

//--- Internal State
double g_InitialDeposit = 0.0;
double g_StartOfDayEquity = 0.0;
datetime g_CurrentDay = 0;
bool   g_IsPermanentlyDisconnected = false;
bool   g_IsDailyLocked = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   g_InitialDeposit = AccountInfoDouble(ACCOUNT_BALANCE);
   g_StartOfDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   g_CurrentDay = TimeCurrent() / 86400; // Day index

   PrintFormat("[Risk Guardian] Initialized. Initial Balance: $%.2f | Unit: $%.2f -> %.2f lot | Max Trades: %d",
               g_InitialDeposit, InpBalanceUnit, InpLotPerUnit, InpMaxOpenTrades);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Check and reset daily counter at new day (00:00 server time)     |
//+------------------------------------------------------------------+
void CheckDailyReset()
{
   datetime today = TimeCurrent() / 86400;
   if(today != g_CurrentDay)
   {
      g_CurrentDay = today;
      g_StartOfDayEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      g_IsDailyLocked = false;
      PrintFormat("[Risk Guardian] New Day Reset. Starting Equity: $%.2f. Daily Lock Cleared.", g_StartOfDayEquity);
   }
}

//+------------------------------------------------------------------+
//| Calculate Fixed Lot Size strictly by account balance             |
//+------------------------------------------------------------------+
double CalculateTierLot(double balance)
{
   // Add $2.00 commission/spread buffer so micro fees (e.g. $599.96 or $899.96)
   // do not drop the tier down to a lower lot size.
   double effectiveBalance = balance + 2.00;
   int units = (int)MathFloor(effectiveBalance / InpBalanceUnit);
   if(units < 1) units = 1;
   double lot = units * InpLotPerUnit;
   return NormalizeDouble(lot, 2);
}

//+------------------------------------------------------------------+
//| Count active open positions for this account                     |
//+------------------------------------------------------------------+
int CountOpenPositions()
{
   return PositionsTotal();
}

//+------------------------------------------------------------------+
//| Verify if account can open a new trade                           |
//+------------------------------------------------------------------+
bool CanCopyNewTrade(double &outLotSize, string &outReason)
{
   CheckDailyReset();

   double currentEquity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);

   // 1. Check Max Lifetime Drawdown (15%) -> Hard Exit
   double totalDrawdown = g_InitialDeposit - currentEquity;
   double totalDDPct    = (totalDrawdown / g_InitialDeposit) * 100.0;

   if(totalDDPct >= InpMaxDDPercent || g_IsPermanentlyDisconnected)
   {
      g_IsPermanentlyDisconnected = true;
      outReason = StringFormat("15%% Max DD Breached (Loss: $%.2f / %.1f%%). Disconnected from copy trading.", totalDrawdown, totalDDPct);
      return false;
   }

   // 2. Check Daily Drawdown (5%) -> Soft Lock for today
   double dailyDrawdown = g_StartOfDayEquity - currentEquity;
   double dailyDDPct    = (dailyDrawdown / g_StartOfDayEquity) * 100.0;

   if(dailyDDPct >= InpDailyDDPercent || g_IsDailyLocked)
   {
      g_IsDailyLocked = true;
      outReason = StringFormat("5%% Daily DD Breached (Today Loss: $%.2f / %.1f%%). Locked until next day.", dailyDrawdown, dailyDDPct);
      return false;
   }

   // 3. Check Max Open Positions (Max 2 trades)
   int openCount = CountOpenPositions();
   if(openCount >= InpMaxOpenTrades)
   {
      outReason = StringFormat("Max open positions limit (%d) reached. Current: %d", InpMaxOpenTrades, openCount);
      return false;
   }

   // 4. Calculate fixed lot based on balance tier
   outLotSize = CalculateTierLot(currentBalance);
   return true;
}

//+------------------------------------------------------------------+
//| Expert tick function (Continuous Monitoring)                     |
//+------------------------------------------------------------------+
void OnTick()
{
   CheckDailyReset();

   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   double totalDDPct = ((g_InitialDeposit - currentEquity) / g_InitialDeposit) * 100.0;

   // If 15% breached in real-time, close all open trades to preserve capital
   if(totalDDPct >= InpMaxDDPercent && !g_IsPermanentlyDisconnected)
   {
      g_IsPermanentlyDisconnected = true;
      PrintFormat("[EMERGENCY] 15%% Max Drawdown breached! Closing all trades and stopping copier.");
      // Optional: Close all open positions immediately
   }
}
//+------------------------------------------------------------------+
