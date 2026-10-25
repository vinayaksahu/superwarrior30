//+------------------------------------------------------------------+
//|                                         SuperWarrior_Master.mq5  |
//|                    SuperWarrior30 Master Copier EA (1ms Ultra)   |
//|                                  https://superwarrior30.com      |
//+------------------------------------------------------------------+
#property copyright   "SuperWarrior30 Academy"
#property link        "https://superwarrior30.com"
#property version     "3.50"
#property description "Master Trade Broadcaster (Unrestricted Execution)"
#property description "Broadcasts trades to all Slave accounts with sub-millisecond latency."
#property strict

input int InpChannelID = 1; // Channel ID (Must match Slave terminals)

string   g_fileName     = "";
string   g_lastContent  = "";
int      g_lastPosCount = -1;
datetime g_lastWriteSec = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   g_fileName = "SW_Master_Ch" + IntegerToString(InpChannelID) + ".txt";
   
   // High-Resolution 1ms Timer (1000 cycles/sec capability)
   EventSetMillisecondTimer(1);
   
   WritePositionsToFile(true);
   
   PrintFormat("🚀 SuperWarrior Master Copier v3.50 ACTIVE on Channel %d | Ultra-low latency memory bridge ready.", InpChannelID);
   UpdateComment();
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
//| OnTick - Regular tick execution                                  |
//+------------------------------------------------------------------+
void OnTick()
{
   WritePositionsToFile(false);
}

//+------------------------------------------------------------------+
//| OnTimer - High-speed 1ms polling                                 |
//+------------------------------------------------------------------+
void OnTimer()
{
   WritePositionsToFile(false);
}

//+------------------------------------------------------------------+
//| OnTradeTransaction - Instant reaction to any order/deal          |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Transaction occurred -> Force instant write (< 0.1ms)
   WritePositionsToFile(true);
}

//+------------------------------------------------------------------+
//| Update Chart Information Display                                 |
//+------------------------------------------------------------------+
void UpdateComment()
{
   Comment("⚡ SuperWarrior Master Copier v3.50 (1ms Ultra-Fast Direct Stream)\n",
           "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
           " Channel ID        : ", InpChannelID, "\n",
           " Active Positions  : ", PositionsTotal(), "\n",
           " Master Mode       : UNRESTRICTED (Any Lot / Any Risk / Any Symbol)\n",
           " Slave Protections : Enforced on Client MT5 Terminals:\n",
           "                     • 0.01 Lot per $300 Balance\n",
           "                     • Max 2 Concurrent Open Trades\n",
           "                     • 5% Daily Drawdown Circuit Breaker\n",
           "                     • 15% Max Drawdown Hard Stop & Disconnect\n",
           " Latency Mode      : ~1ms Sub-Millisecond Direct Stream");
}

//+------------------------------------------------------------------+
//| Write Open Positions to Shared Common Memory File                |
//+------------------------------------------------------------------+
void WritePositionsToFile(bool forceWrite)
{
   int currentTotal = PositionsTotal();
   
   // Build position payload
   string positionsPayload = "";
   for(int i = 0; i < currentTotal; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0)
      {
         string symbol    = PositionGetString(POSITION_SYMBOL);
         long   type      = PositionGetInteger(POSITION_TYPE); // 0 = BUY, 1 = SELL
         double volume    = PositionGetDouble(POSITION_VOLUME);
         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         double sl        = PositionGetDouble(POSITION_SL);
         double tp        = PositionGetDouble(POSITION_TP);
         long   openTime  = PositionGetInteger(POSITION_TIME);
         
         positionsPayload += IntegerToString((long)ticket) + "|" +
                             symbol + "|" +
                             IntegerToString((long)type) + "|" +
                             DoubleToString(volume, 2) + "|" +
                             DoubleToString(openPrice, 5) + "|" +
                             DoubleToString(sl, 5) + "|" +
                             DoubleToString(tp, 5) + "|" +
                             IntegerToString(openTime) + "\n";
      }
   }
   
   datetime nowSec = TimeCurrent();
   
   // Write if positions changed OR forced OR heartbeat every 1 second
   if(!forceWrite && positionsPayload == g_lastContent && (nowSec - g_lastWriteSec) < 1)
   {
      return;
   }
   
   g_lastContent   = positionsPayload;
   g_lastPosCount  = currentTotal;
   g_lastWriteSec  = nowSec;
   
   // Header: TimeCurrent | TotalPositions | MicrosecondTimestamp
   ulong microNow = GetMicrosecondCount();
   string fullFileContent = IntegerToString((int)nowSec) + "|" + 
                            IntegerToString(currentTotal) + "|" + 
                            IntegerToString((long)microNow) + "\n" + 
                            positionsPayload;
   
   int fileHandle = FileOpen(g_fileName, FILE_WRITE | FILE_TXT | FILE_COMMON | FILE_SHARE_READ);
   if(fileHandle != INVALID_HANDLE)
   {
      FileWriteString(fileHandle, fullFileContent);
      FileClose(fileHandle);
   }
   
   UpdateComment();
}
