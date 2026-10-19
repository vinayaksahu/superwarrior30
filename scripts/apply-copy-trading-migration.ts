import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const SQL = `
DO $$ BEGIN
  CREATE TYPE "CopyTradingStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'DISCONNECTED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CopyTradingRiskMode" AS ENUM ('FIXED_LOT', 'MULTIPLIER', 'PROPORTIONAL_EQUITY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "copy_trading_masters" (
  "id" TEXT PRIMARY KEY,
  "accountName" TEXT NOT NULL,
  "brokerName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "serverName" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'MT5',
  "strategyDescription" TEXT,
  "riskLevel" TEXT NOT NULL DEFAULT 'MODERATE',
  "minCapitalUsd" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "totalTrades" INTEGER NOT NULL DEFAULT 0,
  "winRate" DOUBLE PRECISION NOT NULL DEFAULT 78.5,
  "totalProfitUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "profitFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.4,
  "maxDrawdown" DOUBLE PRECISION NOT NULL DEFAULT 6.8,
  "roiMonthly" DOUBLE PRECISION NOT NULL DEFAULT 18.5,
  "vpsNodeName" TEXT DEFAULT 'Oracle-Ampere-Node1',
  "lastHeartbeat" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "copy_trading_subscriptions" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "masterId" TEXT NOT NULL REFERENCES "copy_trading_masters"("id") ON DELETE CASCADE,
  "brokerName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "serverName" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'MT5',
  "encryptedPassword" TEXT,
  "accountCurrency" TEXT NOT NULL DEFAULT 'USD',
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "equity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "riskMode" "CopyTradingRiskMode" NOT NULL DEFAULT 'MULTIPLIER',
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "fixedLot" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
  "maxDrawdownGuard" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
  "maxLotLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.50,
  "status" "CopyTradingStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "rejectionReason" TEXT,
  "vpsNode" TEXT DEFAULT 'Oracle-Ampere-Node1',
  "vpsSlotNumber" INTEGER,
  "latencyMs" INTEGER NOT NULL DEFAULT 3,
  "isOnline" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "copy_trading_subscriptions_userId_masterId_unique" UNIQUE ("userId", "masterId")
);
CREATE INDEX IF NOT EXISTS "copy_trading_subscriptions_userId_idx" ON "copy_trading_subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "copy_trading_subscriptions_masterId_idx" ON "copy_trading_subscriptions"("masterId");
CREATE INDEX IF NOT EXISTS "copy_trading_subscriptions_status_idx" ON "copy_trading_subscriptions"("status");

CREATE TABLE IF NOT EXISTS "copy_trade_logs" (
  "id" TEXT PRIMARY KEY,
  "masterId" TEXT NOT NULL REFERENCES "copy_trading_masters"("id") ON DELETE CASCADE,
  "subscriptionId" TEXT REFERENCES "copy_trading_subscriptions"("id") ON DELETE CASCADE,
  "tradeTicket" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "orderType" TEXT NOT NULL,
  "masterLots" DOUBLE PRECISION NOT NULL,
  "copiedLots" DOUBLE PRECISION,
  "masterOpenPrice" DOUBLE PRECISION NOT NULL,
  "childOpenPrice" DOUBLE PRECISION,
  "masterClosePrice" DOUBLE PRECISION,
  "childClosePrice" DOUBLE PRECISION,
  "slippagePips" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "latencyMs" INTEGER NOT NULL DEFAULT 3,
  "profit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "status" TEXT NOT NULL DEFAULT 'EXECUTED',
  "errorMessage" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "copy_trade_logs_masterId_idx" ON "copy_trade_logs"("masterId");
CREATE INDEX IF NOT EXISTS "copy_trade_logs_subscriptionId_idx" ON "copy_trade_logs"("subscriptionId");
CREATE INDEX IF NOT EXISTS "copy_trade_logs_symbol_idx" ON "copy_trade_logs"("symbol");
CREATE INDEX IF NOT EXISTS "copy_trade_logs_openedAt_idx" ON "copy_trade_logs"("openedAt" DESC);

CREATE TABLE IF NOT EXISTS "copy_trading_settings" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default master if not exists
INSERT INTO "copy_trading_masters" (
  "id", "accountName", "brokerName", "accountNumber", "serverName", "platform",
  "strategyDescription", "riskLevel", "minCapitalUsd", "isActive", "totalTrades",
  "winRate", "totalProfitUsd", "profitFactor", "maxDrawdown", "roiMonthly", "vpsNodeName"
)
SELECT 
  'cm0masterdefault001', 'Rahul Trade Warrior Master', 'Exness', '148932014', 'Exness-Real21', 'MT5',
  'Precision Price Action & Liquidity Sweep Strategy focusing on Gold (XAUUSD) and Major FX pairs with strict 1:2 to 1:3 Risk to Reward ratio.',
  'MODERATE', 100.0, true, 142, 78.5, 18450.0, 2.65, 5.4, 21.8, 'Oracle-Ampere-Node1'
WHERE NOT EXISTS (SELECT 1 FROM "copy_trading_masters");
`;

async function run() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("No DATABASE_URL found");
    return;
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log("Connected to Neon DB. Applying Copy Trading Migration...");
  await client.query(SQL);
  console.log("MIGRATION_SUCCESSFUL");
  await client.end();
}

run().catch(console.error);
