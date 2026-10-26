/**
 * USDT / INR Exchange Rate Service
 * 
 * Fetches real-time Binance / Bybit P2P selling rates (where buyers pay INR to get USDT,
 * typically ~102-104 INR/USDT) with fallback to CoinGecko and in-memory caching.
 */

interface CachedRate {
  rate: number;
  source: "BINANCE_P2P" | "COINGECKO" | "FALLBACK" | "ADMIN_CONFIGURED";
  timestamp: number;
}

let memoryCache: CachedRate | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

/**
 * Fetch live Binance P2P USDT/INR price
 */
async function fetchBinanceP2PRate(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        asset: "USDT",
        fiat: "INR",
        merchantCheck: false,
        page: 1,
        payTypes: [],
        publisherType: null,
        rows: 5,
        tradeType: "BUY", // Student buying USDT / merchant selling USDT
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const list = data?.data;
    if (!Array.isArray(list) || list.length === 0) return null;

    // Filter valid prices between 80 and 130 INR
    const validPrices: number[] = list
      .map((item: any) => parseFloat(item?.adv?.price))
      .filter((p: number) => !isNaN(p) && p >= 80 && p <= 130);

    if (validPrices.length === 0) return null;

    // Use median/average of top 3 sellers
    const topPrices = validPrices.slice(0, 3);
    const avg = topPrices.reduce((a, b) => a + b, 0) / topPrices.length;
    return parseFloat(avg.toFixed(2));
  } catch {
    return null;
  }
}

/**
 * Fallback: Fetch CoinGecko USDT/INR rate and apply standard P2P markup (~3%)
 */
async function fetchCoinGeckoRate(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr",
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const baseInr = data?.tether?.inr;
    if (typeof baseInr === "number" && baseInr > 60 && baseInr < 120) {
      // P2P price typically trades at ~3-4% premium above official forex rate in India
      const p2pEstimated = baseInr * 1.035;
      return parseFloat(p2pEstimated.toFixed(2));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the current USDT / INR exchange rate.
 * Priority:
 * 1. Admin configured fixed rate (if provided and > 0)
 * 2. Cached live rate
 * 3. Fresh Binance P2P rate
 * 4. CoinGecko estimated P2P rate
 * 5. Default fallback (103.00)
 */
export async function getUsdtInrRate(adminFixedRate?: number | null): Promise<{
  rate: number;
  formattedRate: string;
  source: CachedRate["source"];
  updatedAt: string;
}> {
  // If admin explicitly provided a fixed exchange rate
  if (adminFixedRate && typeof adminFixedRate === "number" && adminFixedRate > 50 && adminFixedRate < 200) {
    return {
      rate: adminFixedRate,
      formattedRate: adminFixedRate.toFixed(2),
      source: "ADMIN_CONFIGURED",
      updatedAt: new Date().toISOString(),
    };
  }

  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return {
      rate: memoryCache.rate,
      formattedRate: memoryCache.rate.toFixed(2),
      source: memoryCache.source,
      updatedAt: new Date(memoryCache.timestamp).toISOString(),
    };
  }

  // Fetch fresh rate
  let liveRate = await fetchBinanceP2PRate();
  let source: CachedRate["source"] = "BINANCE_P2P";

  if (!liveRate) {
    liveRate = await fetchCoinGeckoRate();
    source = "COINGECKO";
  }

  if (!liveRate || isNaN(liveRate)) {
    liveRate = 103.0; // Default P2P market average
    source = "FALLBACK";
  }

  memoryCache = {
    rate: liveRate,
    source,
    timestamp: now,
  };

  return {
    rate: liveRate,
    formattedRate: liveRate.toFixed(2),
    source,
    updatedAt: new Date(now).toISOString(),
  };
}

/**
 * Convert INR amount to USDT amount.
 * Returns both precise number and formatted string (4-5 decimal places as requested).
 * Example: 14999 INR at 103.00 -> "145.6213" USDT
 * Example: 14999 INR at 102.00 -> "147.0490" USDT
 */
export function calculateUsdtAmount(inrAmount: number, rate: number): {
  usdtAmount: number;
  usdtFormatted: string;
} {
  if (!inrAmount || inrAmount <= 0 || !rate || rate <= 0) {
    return { usdtAmount: 0, usdtFormatted: "0.0000" };
  }

  const exact = inrAmount / rate;
  // Format to 4 decimals (e.g. 145.6213)
  const usdtFormatted = (Math.round(exact * 10000) / 10000).toFixed(4);
  return {
    usdtAmount: parseFloat(usdtFormatted),
    usdtFormatted,
  };
}
