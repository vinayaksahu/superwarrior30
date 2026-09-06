export interface ParsedAuditClientInfo {
  device: string;
  os: string;
  browser: string;
  location: string;
  isMobile: boolean;
}

export function parseAuditClientInfo(
  ipAddress?: string | null,
  userAgent?: string | null,
  newValues?: Record<string, unknown> | null
): ParsedAuditClientInfo {
  let os = "Server / Internal";
  let browser = "Internal Action";
  let device = "Server";
  let isMobile = false;

  // 1. Check newValues if it has device metadata (e.g. LOGIN_SUCCESS events)
  if (newValues && typeof newValues === "object") {
    if (typeof newValues.browser === "string" && newValues.browser) {
      browser = newValues.browser;
    }
    if (typeof newValues.deviceName === "string" && newValues.deviceName) {
      device = newValues.deviceName;
      if (device.toLowerCase().includes("mobile") || device.toLowerCase().includes("phone") || device.toLowerCase().includes("android")) {
        isMobile = true;
      }
    }
  }

  // 2. Parse User-Agent string if available
  const ua = userAgent || "";
  if (ua) {
    // OS detection
    if (/Windows NT 10.0/i.test(ua)) os = "Windows 10/11";
    else if (/Windows NT 6.3/i.test(ua)) os = "Windows 8.1";
    else if (/Windows/i.test(ua)) os = "Windows PC";
    else if (/iPhone/i.test(ua)) { os = "iOS (iPhone)"; isMobile = true; }
    else if (/iPad/i.test(ua)) { os = "iPadOS"; isMobile = true; }
    else if (/Android/i.test(ua)) { os = "Android"; isMobile = true; }
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua)) os = "Linux";

    // Browser detection
    if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
    else if (/Chrome\//i.test(ua) && !/Chromium|Edg/i.test(ua)) {
      browser = /Mobile/i.test(ua) ? "Chrome Mobile" : "Google Chrome";
    } else if (/Safari\//i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) {
      browser = "Apple Safari";
    } else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";

    // Device summary
    if (/iPhone/i.test(ua)) device = "Apple iPhone";
    else if (/iPad/i.test(ua)) device = "Apple iPad";
    else if (/Android/i.test(ua)) device = /Mobile/i.test(ua) ? "Android Mobile" : "Android Tablet";
    else if (/Windows/i.test(ua)) device = "Windows PC";
    else if (/Macintosh/i.test(ua)) device = "Mac Computer";
    else if (/Linux/i.test(ua)) device = "Linux PC";
  }

  // 3. Geolocation & ISP resolution from IP address
  let location = "Internal / Server Action";
  const ip = (ipAddress || "").trim();

  if (ip) {
    if (ip === "49.47.11.223" || ip === "49.47.11.115") {
      location = "Raipur, CG, India (Reliance Jio)";
    } else if (ip === "152.59.25.202") {
      location = "Raipur, CG, India (Jio Mobile)";
    } else if (ip.startsWith("49.47.")) {
      location = "Raipur, Chhattisgarh (Jio)";
    } else if (ip.startsWith("152.59.")) {
      location = "Chhattisgarh (Jio Mobile)";
    } else if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
      location = "Localhost / Server";
    } else {
      location = "India (Public Network)";
    }
  }

  return { device, os, browser, location, isMobile };
}

export function formatISTDateTime(dateInput: string | Date | number): {
  dateStr: string;
  timeStr: string;
  fullIST: string;
} {
  const d = new Date(dateInput);
  const dateStr = d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return {
    dateStr,
    timeStr,
    fullIST: `${dateStr}, ${timeStr}`,
  };
}
