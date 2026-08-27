import { headers, cookies } from "next/headers";
import crypto from "crypto";

export const DEVICE_COOKIE_NAME = "sw30_device_id";
export const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export interface DeviceMetadata {
  deviceToken: string;
  deviceTokenHash: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  userAgent: string;
  ipAddress: string;
}

export async function getClientDeviceMetadata(): Promise<DeviceMetadata> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  // 1. First-Party Stable Device Token (from cookie or newly generated)
  let deviceToken = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  if (!deviceToken || deviceToken.trim().length < 16) {
    deviceToken = `dev_${crypto.randomUUID()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  // SHA-256 hash for secure database persistence
  const deviceTokenHash = crypto
    .createHash("sha256")
    .update(deviceToken)
    .digest("hex");

  // 2. IP Address
  const ipAddress =
    headerStore.get("cf-connecting-ip") ||
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "127.0.0.1";

  // 3. User-Agent parsing
  const ua = headerStore.get("user-agent") || "";
  const { deviceName, browser, operatingSystem } = parseUserAgent(ua);

  return {
    deviceToken,
    deviceTokenHash,
    deviceName,
    browser,
    operatingSystem,
    userAgent: ua.slice(0, 500),
    ipAddress,
  };
}

export async function setDeviceCookie(deviceToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE_NAME, deviceToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

function parseUserAgent(ua: string): {
  deviceName: string;
  browser: string;
  operatingSystem: string;
} {
  let operatingSystem = "Unknown OS";
  let browser = "Unknown Browser";
  let deviceName = "Unknown Device";

  // Operating System detection
  if (/Windows NT 10.0/i.test(ua)) operatingSystem = "Windows 10/11";
  else if (/Windows NT 6.3/i.test(ua)) operatingSystem = "Windows 8.1";
  else if (/Windows NT 6.1/i.test(ua)) operatingSystem = "Windows 7";
  else if (/Windows/i.test(ua)) operatingSystem = "Windows";
  else if (/iPhone/i.test(ua)) operatingSystem = "iOS (iPhone)";
  else if (/iPad/i.test(ua)) operatingSystem = "iPadOS";
  else if (/Macintosh|Mac OS X/i.test(ua)) operatingSystem = "macOS";
  else if (/Android/i.test(ua)) operatingSystem = "Android";
  else if (/Linux/i.test(ua)) operatingSystem = "Linux";
  else if (/CrOS/i.test(ua)) operatingSystem = "Chrome OS";

  // Browser detection
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium|Edg/i.test(ua)) browser = "Google Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) browser = "Apple Safari";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";

  // Device Name summary
  if (/iPhone/i.test(ua)) deviceName = "Apple iPhone";
  else if (/iPad/i.test(ua)) deviceName = "Apple iPad";
  else if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) deviceName = "Android Mobile";
    else deviceName = "Android Tablet";
  } else if (/Macintosh/i.test(ua)) deviceName = "Mac Computer";
  else if (/Windows/i.test(ua)) deviceName = "Windows PC";
  else if (/Linux/i.test(ua)) deviceName = "Linux PC";
  else deviceName = `${operatingSystem} Device`;

  return { deviceName, browser, operatingSystem };
}
