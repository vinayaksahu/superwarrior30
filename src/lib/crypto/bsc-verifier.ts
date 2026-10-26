/**
 * BEP-20 (BNB Smart Chain) USDT Transaction Verifier
 * 
 * Verifies on-chain transfers of BEP-20 USDT directly using BSC JSON-RPC nodes.
 * Features:
 * - Multi-RPC fallback pool (Binance, Defibit, PublicNode, Ankr)
 * - Auto-extraction of TxHash from URLs or raw input
 * - Polling/retrying for newly submitted blocks
 * - ERC-20 Transfer log parsing with 18-decimal precision
 * - Recipient wallet address verification
 * - Amount threshold verification (with safety margin)
 * - Block timestamp age check (< 48 hours)
 */

export const BSC_USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955".toLowerCase();
export const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const BSC_RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed2.defibit.io",
  "https://bsc-rpc.publicnode.com",
  "https://rpc.ankr.com/bsc",
];

export interface BscVerificationResult {
  verified: boolean;
  reason?:
    | "INVALID_FORMAT"
    | "TRANSACTION_NOT_FOUND"
    | "TRANSACTION_PENDING"
    | "TRANSACTION_REVERTED"
    | "WRONG_TOKEN"
    | "WRONG_RECIPIENT"
    | "INSUFFICIENT_AMOUNT"
    | "TRANSACTION_TOO_OLD"
    | "RPC_ERROR";
  message: string;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  transferredUsdt?: number;
  expectedUsdt?: number;
  blockNumber?: number;
  timestamp?: Date;
  rawReceipt?: any;
}

/**
 * Extracts a clean 66-character 0x-prefixed TxHash from user input,
 * supporting full BscScan URLs or raw hashes.
 */
export function extractTxHash(input: string | undefined | null): string | null {
  if (!input || typeof input !== "string") return null;
  const match = input.match(/0x[a-fA-F0-9]{64}/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Executes a JSON-RPC method across multiple BSC RPC endpoints with automatic fallback.
 */
async function callBscRpc(method: string, params: any[]): Promise<any> {
  let lastError: any = null;

  for (const rpcUrl of BSC_RPC_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Math.floor(Math.random() * 100000),
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      if (data.error) {
        lastError = data.error;
        continue;
      }
      return data.result;
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("All BSC RPC endpoints failed to respond.");
}

/**
 * Sleep helper for block confirmation polling
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Verifies a BEP-20 USDT transaction on the BNB Smart Chain blockchain.
 */
export async function verifyBscUsdtPayment({
  txHashInput,
  expectedUsdtAmount,
  depositAddress,
  maxAgeHours = 48,
  allowDustTolerance = 0.02, // 2% tolerance for minor exchange rate flutter between checkout and broadcast
}: {
  txHashInput: string;
  expectedUsdtAmount: number;
  depositAddress: string;
  maxAgeHours?: number;
  allowDustTolerance?: number;
}): Promise<BscVerificationResult> {
  const cleanTxHash = extractTxHash(txHashInput);
  if (!cleanTxHash) {
    return {
      verified: false,
      reason: "INVALID_FORMAT",
      message: "Invalid transaction hash. Please enter a valid 66-character BEP-20 TxHash starting with 0x.",
    };
  }

  const cleanDepositAddress = depositAddress.trim().toLowerCase();
  if (!cleanDepositAddress.startsWith("0x") || cleanDepositAddress.length !== 42) {
    return {
      verified: false,
      reason: "RPC_ERROR",
      message: "System deposit address configuration is invalid.",
    };
  }

  // 1. Fetch transaction receipt (poll up to 3 times with 3s intervals if pending)
  let receipt: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      receipt = await callBscRpc("eth_getTransactionReceipt", [cleanTxHash]);
      if (receipt) break;
    } catch (err) {
      console.warn(`[BSC Verifier] Receipt fetch attempt ${attempt} failed:`, err);
    }
    if (attempt < 3) {
      await sleep(3000);
    }
  }

  if (!receipt) {
    return {
      verified: false,
      reason: "TRANSACTION_PENDING",
      txHash: cleanTxHash,
      message:
        "Transaction was not detected on the BSC blockchain yet. If you just sent it, please wait 10-15 seconds for your wallet transaction to confirm and try again.",
    };
  }

  // 2. Check execution status (0x1 = SUCCESS, 0x0 = FAILED)
  if (receipt.status !== "0x1" && receipt.status !== 1) {
    return {
      verified: false,
      reason: "TRANSACTION_REVERTED",
      txHash: cleanTxHash,
      message: "This transaction failed or was reverted on the blockchain. Please check your wallet history.",
    };
  }

  // 3. Inspect logs for ERC-20 Transfer to our deposit address
  const logs = receipt.logs || [];
  let matchingTransferLog: any = null;
  let totalUsdtTransferred = 0;
  let detectedSender = "";

  for (const log of logs) {
    const contractAddress = (log.address || "").toLowerCase();
    const topics = log.topics || [];

    // Check if contract is BEP-20 USDT and event is Transfer
    if (
      contractAddress === BSC_USDT_CONTRACT_ADDRESS &&
      topics.length >= 3 &&
      topics[0].toLowerCase() === ERC20_TRANSFER_TOPIC
    ) {
      // topics[1] is padded sender address
      const fromAddr = "0x" + topics[1].slice(26).toLowerCase();
      // topics[2] is padded recipient address
      const toAddr = "0x" + topics[2].slice(26).toLowerCase();

      if (toAddr === cleanDepositAddress) {
        matchingTransferLog = log;
        detectedSender = fromAddr;

        // Parse 18-decimal uint256 data
        try {
          const rawValue = BigInt(log.data);
          const usdtVal = Number(rawValue) / 1e18;
          totalUsdtTransferred += usdtVal;
        } catch (e) {
          console.error("[BSC Verifier] Error parsing log data:", e);
        }
      }
    }
  }

  if (!matchingTransferLog || totalUsdtTransferred <= 0) {
    return {
      verified: false,
      reason: "WRONG_RECIPIENT",
      txHash: cleanTxHash,
      message: `No USDT transfer to deposit address (${depositAddress}) was found in this transaction. Please ensure you sent BEP-20 USDT to the exact address shown.`,
    };
  }

  // 4. Verify transferred amount against expected amount
  const minimumAcceptable = expectedUsdtAmount * (1 - allowDustTolerance);
  if (totalUsdtTransferred < minimumAcceptable) {
    return {
      verified: false,
      reason: "INSUFFICIENT_AMOUNT",
      txHash: cleanTxHash,
      fromAddress: detectedSender,
      toAddress: cleanDepositAddress,
      transferredUsdt: parseFloat(totalUsdtTransferred.toFixed(4)),
      expectedUsdt: expectedUsdtAmount,
      message: `Insufficient payment: Received ${totalUsdtTransferred.toFixed(4)} USDT, but required amount is ${expectedUsdtAmount.toFixed(4)} USDT.`,
    };
  }

  // 5. Age check: Verify transaction timestamp via block
  let blockTimestamp: Date = new Date();
  try {
    const block = await callBscRpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
    if (block && block.timestamp) {
      const unixSec = parseInt(block.timestamp, 16);
      blockTimestamp = new Date(unixSec * 1000);
      const ageHours = (Date.now() - blockTimestamp.getTime()) / (1000 * 60 * 60);

      if (ageHours > maxAgeHours) {
        return {
          verified: false,
          reason: "TRANSACTION_TOO_OLD",
          txHash: cleanTxHash,
          message: `This transaction was mined ${Math.round(ageHours)} hours ago. Only transactions made within the last ${maxAgeHours} hours are accepted for automated enrollment.`,
        };
      }
    }
  } catch (err) {
    console.warn("[BSC Verifier] Failed to retrieve block timestamp:", err);
  }

  const blockNumber = parseInt(receipt.blockNumber, 16);

  return {
    verified: true,
    txHash: cleanTxHash,
    fromAddress: detectedSender,
    toAddress: cleanDepositAddress,
    transferredUsdt: parseFloat(totalUsdtTransferred.toFixed(4)),
    expectedUsdt: expectedUsdtAmount,
    blockNumber,
    timestamp: blockTimestamp,
    rawReceipt: receipt,
    message: "Transaction successfully verified on BNB Smart Chain!",
  };
}
