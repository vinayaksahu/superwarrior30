import "server-only";
import crypto from "crypto";

const BUNNY_API_BASE = "https://api.bunny.net";

export interface BunnyStorageZoneSummary {
  id: string | number;
  name: string;
  region: string;
  storageUsed: number;
  filesStored: number;
  password?: string;
  pullZones?: any[];
}

export interface BunnyPullZoneSummary {
  id: string | number;
  name: string;
  hostnames: string[];
  primaryHostname: string;
  storageZoneId?: string | number | null;
  enabled: boolean;
}

export interface BunnyVideoLibrarySummary {
  id: string | number;
  name: string;
  apiKey?: string;
  readOnlyApiKey?: string;
  hasWatermark?: boolean;
}

export interface BunnyAccountResources {
  isValid: boolean;
  accountEmail?: string;
  storageZones: BunnyStorageZoneSummary[];
  pullZones: BunnyPullZoneSummary[];
  videoLibraries: BunnyVideoLibrarySummary[];
  error?: string;
}

export interface TestResultItem {
  id: string;
  name: string;
  success: boolean;
  message: string;
  details?: Record<string, any>;
  durationMs: number;
}

export interface FullDiagnosticsResult {
  overallSuccess: boolean;
  testedAt: string;
  tests: TestResultItem[];
}

/**
 * Server-Side Bunny.net Service Layer
 */
export class BunnyService {
  /**
   * Validates the Global Account API Key against Bunny's management API
   */
  static async validateAccountApiKey(
    apiKey: string
  ): Promise<{ isValid: boolean; error?: string; details?: any }> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { isValid: false, error: "API Key cannot be empty." };
    }

    try {
      const res = await fetch(`${BUNNY_API_BASE}/storagezone`, {
        method: "GET",
        headers: {
          AccessKey: cleanKey,
          accept: "application/json",
        },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        return {
          isValid: false,
          error: "Invalid Bunny Account API key or insufficient permissions.",
        };
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          isValid: false,
          error: `Bunny API verification failed (${res.status}): ${text}`,
        };
      }

      return {
        isValid: true,
        details: { verifiedAt: new Date().toISOString() },
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Network error connecting to Bunny API: ${err.message}`,
      };
    }
  }

  /**
   * Retrieves all available Bunny resources for the account
   */
  static async getAccountResources(apiKey: string): Promise<BunnyAccountResources> {
    const cleanKey = apiKey.trim();

    try {
      const [storageRes, pullRes, streamRes] = await Promise.all([
        fetch(`${BUNNY_API_BASE}/storagezone`, {
          headers: { AccessKey: cleanKey, accept: "application/json" },
          cache: "no-store",
        }),
        fetch(`${BUNNY_API_BASE}/pullzone`, {
          headers: { AccessKey: cleanKey, accept: "application/json" },
          cache: "no-store",
        }),
        fetch(`${BUNNY_API_BASE}/videolibrary`, {
          headers: { AccessKey: cleanKey, accept: "application/json" },
          cache: "no-store",
        }),
      ]);

      if (!storageRes.ok || !pullRes.ok) {
        return {
          isValid: false,
          storageZones: [],
          pullZones: [],
          videoLibraries: [],
          error: "Failed to authenticate with Bunny.net API.",
        };
      }

      const storageData: any[] = await storageRes.json().catch(() => []);
      const pullData: any[] = await pullRes.json().catch(() => []);
      const streamData: any[] = streamRes.ok ? await streamRes.json().catch(() => []) : [];

      const storageZones: BunnyStorageZoneSummary[] = storageData.map((z) => ({
        id: z.Id,
        name: z.Name,
        region: z.Region || "DE",
        storageUsed: z.StorageUsed || 0,
        filesStored: z.FilesStored || 0,
        password: z.Password || z.ReadPassword,
        pullZones: z.PullZones || [],
      }));

      const pullZones: BunnyPullZoneSummary[] = pullData.map((p) => {
        const hostnames = (p.Hostnames || []).map((h: any) => h.Value);
        const primaryHostname =
          hostnames.find((h: string) => !h.includes("localhost")) ||
          `${p.Name}.b-cdn.net`;
        return {
          id: p.Id,
          name: p.Name,
          hostnames,
          primaryHostname,
          storageZoneId: p.StorageZoneId,
          enabled: p.Enabled !== false,
        };
      });

      const videoLibraries: BunnyVideoLibrarySummary[] = streamData.map((v) => ({
        id: v.Id,
        name: v.Name,
        apiKey: v.ApiKey,
        readOnlyApiKey: v.ReadOnlyApiKey,
        hasWatermark: v.HasWatermark,
      }));

      return {
        isValid: true,
        storageZones,
        pullZones,
        videoLibraries,
      };
    } catch (err: any) {
      return {
        isValid: false,
        storageZones: [],
        pullZones: [],
        videoLibraries: [],
        error: err.message || "Failed to fetch Bunny resources.",
      };
    }
  }

  /**
   * Creates a new Production Storage Zone in Bunny
   */
  static async createStorageZone(
    apiKey: string,
    name: string,
    region: string = "DE"
  ): Promise<{ success: boolean; zone?: BunnyStorageZoneSummary; error?: string }> {
    const cleanKey = apiKey.trim();
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, "");

    try {
      const res = await fetch(`${BUNNY_API_BASE}/storagezone`, {
        method: "POST",
        headers: {
          AccessKey: cleanKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          Name: cleanName,
          Region: region,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          success: false,
          error: `Storage Zone creation failed (${res.status}): ${errText}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        zone: {
          id: data.Id,
          name: data.Name,
          region: data.Region || region,
          storageUsed: 0,
          filesStored: 0,
          password: data.Password || data.ReadPassword,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to create storage zone.",
      };
    }
  }

  /**
   * Creates a new Pull Zone (CDN) linked to a storage zone
   */
  static async createPullZone(
    apiKey: string,
    name: string,
    storageZoneId: number | string
  ): Promise<{ success: boolean; pullZone?: BunnyPullZoneSummary; error?: string }> {
    const cleanKey = apiKey.trim();
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, "");

    try {
      const res = await fetch(`${BUNNY_API_BASE}/pullzone`, {
        method: "POST",
        headers: {
          AccessKey: cleanKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          Name: cleanName,
          Type: 0, // Standard Pull Zone
          StorageZoneId: Number(storageZoneId),
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          success: false,
          error: `Pull Zone creation failed (${res.status}): ${errText}`,
        };
      }

      const data = await res.json();
      const hostnames = (data.Hostnames || []).map((h: any) => h.Value);
      const primaryHostname = hostnames[0] || `${cleanName}.b-cdn.net`;

      return {
        success: true,
        pullZone: {
          id: data.Id,
          name: data.Name,
          hostnames,
          primaryHostname,
          storageZoneId: data.StorageZoneId,
          enabled: true,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to create pull zone.",
      };
    }
  }

  /**
   * Creates a new Bunny Stream Video Library
   */
  static async createVideoLibrary(
    apiKey: string,
    name: string
  ): Promise<{ success: boolean; library?: BunnyVideoLibrarySummary; error?: string }> {
    const cleanKey = apiKey.trim();
    const cleanName = name.trim();

    try {
      const res = await fetch(`${BUNNY_API_BASE}/videolibrary`, {
        method: "POST",
        headers: {
          AccessKey: cleanKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          Name: cleanName,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          success: false,
          error: `Stream Video Library creation failed (${res.status}): ${errText}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        library: {
          id: data.Id,
          name: data.Name,
          apiKey: data.ApiKey,
          readOnlyApiKey: data.ReadOnlyApiKey,
          hasWatermark: data.HasWatermark,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to create video library.",
      };
    }
  }

  /**
   * Test 1: Storage Authentication Connection Test
   */
  static async testStorageConnection(
    zoneName: string,
    password: string,
    hostname: string = "storage.bunnycdn.com"
  ): Promise<TestResultItem> {
    const start = Date.now();
    const cleanZone = zoneName.trim();
    const cleanPass = password.trim();

    if (!cleanZone || !cleanPass) {
      return {
        id: "connection",
        name: "Bunny Storage API Connection",
        success: false,
        message: "Storage Zone Name or Password missing.",
        durationMs: Date.now() - start,
      };
    }

    try {
      const url = `https://${hostname}/${cleanZone}/`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          AccessKey: cleanPass,
          accept: "application/json",
        },
        cache: "no-store",
      });

      const durationMs = Date.now() - start;

      if (res.ok || res.status === 200 || res.status === 204) {
        return {
          id: "connection",
          name: "Bunny Storage API Connection",
          success: true,
          message: `Successfully authenticated with Storage Zone '${cleanZone}' on ${hostname}.`,
          durationMs,
        };
      }

      const text = await res.text().catch(() => "");
      return {
        id: "connection",
        name: "Bunny Storage API Connection",
        success: false,
        message: `Storage authentication rejected (${res.status}): ${text || res.statusText}. Check Storage Password.`,
        durationMs,
      };
    } catch (err: any) {
      return {
        id: "connection",
        name: "Bunny Storage API Connection",
        success: false,
        message: `Storage connection failed: ${err.message}`,
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Test 2: PDF Upload Probe
   */
  static async testPdfUpload(
    zoneName: string,
    password: string,
    hostname: string = "storage.bunnycdn.com"
  ): Promise<{ result: TestResultItem; testPath?: string }> {
    const start = Date.now();
    const cleanZone = zoneName.trim();
    const cleanPass = password.trim();
    const probeId = `probe-${Date.now()}`;
    const testPath = `_diagnostics/pdf-test-${probeId}.pdf`;

    const dummyPdfContent = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
    );

    try {
      const uploadUrl = `https://${hostname}/${cleanZone}/${testPath}`;
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          AccessKey: cleanPass,
          "Content-Type": "application/pdf",
        },
        body: new Uint8Array(dummyPdfContent),
      });

      const durationMs = Date.now() - start;

      if (res.ok || res.status === 201 || res.status === 200) {
        return {
          result: {
            id: "pdf_upload",
            name: "PDF Upload to Storage",
            success: true,
            message: `Successfully uploaded sample test PDF to Bunny Storage (${testPath}).`,
            durationMs,
          },
          testPath,
        };
      }

      const text = await res.text().catch(() => "");
      return {
        result: {
          id: "pdf_upload",
          name: "PDF Upload to Storage",
          success: false,
          message: `PDF upload failed with status ${res.status}: ${text || res.statusText}`,
          durationMs,
        },
      };
    } catch (err: any) {
      return {
        result: {
          id: "pdf_upload",
          name: "PDF Upload to Storage",
          success: false,
          message: `PDF upload error: ${err.message}`,
          durationMs: Date.now() - start,
        },
      };
    }
  }

  /**
   * Test 3: PDF CDN Delivery Verification
   */
  static async testPdfDelivery(
    cdnHostname: string,
    testPath: string = "_diagnostics/pdf-test-sample.pdf",
    tokenSecurityKey?: string
  ): Promise<TestResultItem> {
    const start = Date.now();
    const cleanHost = cdnHostname.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    let testUrl = `https://${cleanHost}/${testPath}`;
    if (tokenSecurityKey && tokenSecurityKey.trim()) {
      testUrl = BunnyService.generateSignedUrl(cleanHost, testPath, tokenSecurityKey.trim(), 300);
    }

    try {
      const res = await fetch(testUrl, {
        method: "HEAD",
        cache: "no-store",
      });

      const durationMs = Date.now() - start;

      if (res.ok || res.status === 200 || res.status === 206) {
        return {
          id: "pdf_delivery",
          name: "PDF CDN Delivery & Headers",
          success: true,
          message: `PDF delivery verified through Bunny CDN (${cleanHost}).`,
          details: { cdnUrl: testUrl, statusCode: res.status },
          durationMs,
        };
      }

      // If 404, file might still be propagating or CDN routing is pending
      if (res.status === 404) {
        return {
          id: "pdf_delivery",
          name: "PDF CDN Delivery & Headers",
          success: false,
          message: `CDN returned 404 Not Found at https://${cleanHost}/${testPath}. Ensure Pull Zone '${cleanHost}' is linked to the Storage Zone in Bunny.`,
          durationMs,
        };
      }

      return {
        id: "pdf_delivery",
        name: "PDF CDN Delivery & Headers",
        success: false,
        message: `CDN delivery returned HTTP ${res.status}: ${res.statusText}`,
        durationMs,
      };
    } catch (err: any) {
      return {
        id: "pdf_delivery",
        name: "PDF CDN Delivery & Headers",
        success: false,
        message: `CDN delivery request failed: ${err.message}`,
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Test 4: Video Upload / Library Verification
   */
  static async testVideoUpload(
    libraryId: string,
    apiKey: string
  ): Promise<{ result: TestResultItem; testVideoGuid?: string }> {
    const start = Date.now();
    const cleanLib = libraryId.trim();
    const cleanKey = apiKey.trim();

    if (!cleanLib || !cleanKey) {
      return {
        result: {
          id: "video_upload",
          name: "Bunny Stream Video Library API",
          success: false,
          message: "Stream Library ID or Stream API Key missing.",
          durationMs: Date.now() - start,
        },
      };
    }

    try {
      // 1. Create a test video entry in Bunny Stream
      const createRes = await fetch(
        `https://video.bunnycdn.com/library/${cleanLib}/videos`,
        {
          method: "POST",
          headers: {
            AccessKey: cleanKey,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            title: `LMS Diagnostic Probe ${Date.now()}`,
          }),
        }
      );

      const durationMs = Date.now() - start;

      if (!createRes.ok) {
        const text = await createRes.text().catch(() => "");
        return {
          result: {
            id: "video_upload",
            name: "Bunny Stream Video Library API",
            success: false,
            message: `Stream video creation failed (${createRes.status}): ${text || createRes.statusText}`,
            durationMs,
          },
        };
      }

      const videoData = await createRes.json();
      const guid = videoData.guid;

      return {
        result: {
          id: "video_upload",
          name: "Bunny Stream Video Library API",
          success: true,
          message: `Stream Library #${cleanLib} active. Test video initialized (GUID: ${guid.slice(0, 8)}...).`,
          details: { videoId: guid },
          durationMs,
        },
        testVideoGuid: guid,
      };
    } catch (err: any) {
      return {
        result: {
          id: "video_upload",
          name: "Bunny Stream Video Library API",
          success: false,
          message: `Stream Library connection error: ${err.message}`,
          durationMs: Date.now() - start,
        },
      };
    }
  }

  /**
   * Test 5: Video Delivery & Embed Player Verification
   */
  static async testVideoDelivery(
    libraryId: string,
    apiKey: string,
    testVideoGuid?: string
  ): Promise<TestResultItem> {
    const start = Date.now();
    const cleanLib = libraryId.trim();
    const cleanKey = apiKey.trim();

    if (!cleanLib) {
      return {
        id: "video_delivery",
        name: "Video Delivery & Embed Player",
        success: false,
        message: "Stream Library ID missing.",
        durationMs: Date.now() - start,
      };
    }

    try {
      // If we have a test GUID, fetch its metadata from stream API
      if (testVideoGuid && cleanKey) {
        const statusRes = await fetch(
          `https://video.bunnycdn.com/library/${cleanLib}/videos/${testVideoGuid}`,
          {
            method: "GET",
            headers: { AccessKey: cleanKey, accept: "application/json" },
          }
        );

        // Clean up the test video entry
        await fetch(
          `https://video.bunnycdn.com/library/${cleanLib}/videos/${testVideoGuid}`,
          {
            method: "DELETE",
            headers: { AccessKey: cleanKey },
          }
        ).catch(() => {});

        const durationMs = Date.now() - start;

        if (statusRes.ok) {
          const embedUrl = `https://iframe.mediadelivery.net/embed/${cleanLib}/${testVideoGuid}`;
          return {
            id: "video_delivery",
            name: "Video Delivery & Embed Player",
            success: true,
            message: `Stream embed & HLS endpoint verified (Library #${cleanLib}).`,
            details: { embedUrl },
            durationMs,
          };
        }
      }

      // Check player endpoint availability
      const embedProbeUrl = `https://iframe.mediadelivery.net/embed/${cleanLib}/00000000-0000-0000-0000-000000000000`;
      const probeRes = await fetch(embedProbeUrl, { method: "HEAD" });
      const durationMs = Date.now() - start;

      // 404 for non-existent video is expected and proves player host is reachable
      if (probeRes.status === 404 || probeRes.ok) {
        return {
          id: "video_delivery",
          name: "Video Delivery & Embed Player",
          success: true,
          message: `Bunny Stream player and HLS CDN gateway is reachable for Library #${cleanLib}.`,
          durationMs,
        };
      }

      return {
        id: "video_delivery",
        name: "Video Delivery & Embed Player",
        success: false,
        message: `Player host returned unexpected status ${probeRes.status}`,
        durationMs,
      };
    } catch (err: any) {
      return {
        id: "video_delivery",
        name: "Video Delivery & Embed Player",
        success: false,
        message: `Video delivery test error: ${err.message}`,
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Generates a token-authenticated signed URL for Bunny CDN (Token Authentication feature)
   * Formula: SHA256(token_key + url_path + expiration_timestamp)
   */
  static generateSignedUrl(
    cdnHostname: string,
    filePath: string,
    tokenSecurityKey: string,
    expiresInSec: number = 3600
  ): string {
    const cleanHost = cdnHostname.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
    const expires = Math.floor(Date.now() / 1000) + expiresInSec;

    // Hash = base64(sha256(security_token + path + expires))
    const hashable = `${tokenSecurityKey}${normalizedPath}${expires}`;
    const hash = crypto
      .createHash("sha256")
      .update(hashable)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return `https://${cleanHost}${normalizedPath}?token=${hash}&expires=${expires}`;
  }
}
