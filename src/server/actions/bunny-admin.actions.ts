"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin, requireAdminWrite } from "@/server/dal/auth";
import {
  BunnyService,
  BunnyAccountResources,
  FullDiagnosticsResult,
  TestResultItem,
} from "@/lib/bunny/service";
import {
  getResolvedBunnyConfig,
  invalidateBunnyConfigCache,
  ResolvedBunnyConfig,
} from "@/lib/bunny/config";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto/encryption";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import { revalidatePath } from "next/cache";

export interface PublicAdminBunnyConfig {
  hasConfig: boolean;
  isEnabled: boolean;
  isProductionReady: boolean;
  environment: string;
  source: "DATABASE" | "ENV" | "NONE";

  // Masked credentials for safe UI display
  accountApiKeyMasked: string;
  accountEmail: string;
  hasAccountKey: boolean;

  storageZoneId: string;
  storageZoneName: string;
  storagePasswordMasked: string;
  storageHostname: string;
  hasStoragePassword: boolean;

  pullZoneId: string;
  pullZoneName: string;
  cdnHostname: string;

  streamLibraryId: string;
  streamLibraryName: string;
  streamApiKeyMasked: string;
  hasStreamApiKey: boolean;

  tokenSecurityKeyMasked: string;
  hasTokenKey: boolean;
  enableTokenAuth: boolean;

  lastTestedAt: Date | null;
  testResults: any;
  updatedAt: Date | null;
  lastActivatedAt: Date | null;
  configuredBy: string | null;
}

/**
 * Super Admin authorization guard
 */
async function requireSuperAdmin() {
  const user = await requireAdminWrite();
  if (user.role !== "SUPER_ADMIN" && user.email !== "admin@superwarrior30.com") {
    throw new Error("Forbidden. Only Super Admin can modify Media Storage & Bunny credentials.");
  }
  return user;
}

/**
 * Super Admin Action: Get current Bunny configuration (with masked credentials)
 */
export async function getBunnyAdminConfigAction(): Promise<PublicAdminBunnyConfig> {
  await requireAdmin();
  await ensureDatabaseSchemaSync();

  const dbConfig = await prisma.mediaProviderConfig.findFirst({
    where: { provider: "BUNNY" },
    orderBy: { updatedAt: "desc" },
  });

  let lastActivationAudit = null;
  try {
    lastActivationAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: "MediaProviderConfig",
        action: "BUNNY_PRODUCTION_READY_ACTIVATED",
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // ignore
  }

  if (dbConfig) {
    const rawAccountKey = decryptSecret(dbConfig.accountApiKeyEncrypted) || "";
    const rawStoragePass = decryptSecret(dbConfig.storagePasswordEncrypted) || "";
    const rawStreamKey = decryptSecret(dbConfig.streamApiKeyEncrypted) || "";
    const rawTokenKey = decryptSecret(dbConfig.tokenSecurityKeyEncrypted) || "";

    return {
      hasConfig: true,
      isEnabled: dbConfig.isEnabled,
      isProductionReady: dbConfig.isProductionReady,
      environment: dbConfig.environment || "production",
      source: "DATABASE",

      accountApiKeyMasked: maskSecret(rawAccountKey),
      accountEmail: dbConfig.accountEmail || "",
      hasAccountKey: Boolean(rawAccountKey),

      storageZoneId: dbConfig.storageZoneId || "",
      storageZoneName: dbConfig.storageZoneName || "",
      storagePasswordMasked: maskSecret(rawStoragePass),
      storageHostname: dbConfig.storageHostname || "storage.bunnycdn.com",
      hasStoragePassword: Boolean(rawStoragePass),

      pullZoneId: dbConfig.pullZoneId || "",
      pullZoneName: dbConfig.pullZoneName || "",
      cdnHostname: dbConfig.cdnHostname || "",

      streamLibraryId: dbConfig.streamLibraryId || "",
      streamLibraryName: dbConfig.streamLibraryName || "",
      streamApiKeyMasked: maskSecret(rawStreamKey),
      hasStreamApiKey: Boolean(rawStreamKey),

      tokenSecurityKeyMasked: maskSecret(rawTokenKey),
      hasTokenKey: Boolean(rawTokenKey),
      enableTokenAuth: dbConfig.enableTokenAuth,

      lastTestedAt: dbConfig.lastTestedAt,
      testResults: dbConfig.testResults,
      updatedAt: dbConfig.updatedAt,
      lastActivatedAt: lastActivationAudit?.createdAt || (dbConfig.isProductionReady ? dbConfig.updatedAt : null),
      configuredBy: lastActivationAudit?.actorEmail || "Super Admin",
    };
  }

  // Fallback check from environment variables
  const envAccountKey = (process.env.BUNNY_API_KEY || "").trim();
  const envStorageZone = (process.env.BUNNY_STORAGE_ZONE || "").trim();
  const envStoragePass = (process.env.BUNNY_STORAGE_PASSWORD || "").trim();
  const envCdnHost = (process.env.BUNNY_CDN_HOSTNAME || "").trim();
  const envStreamLib = (process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();
  const envStreamKey = (process.env.BUNNY_STREAM_API_KEY || "").trim();

  return {
    hasConfig: Boolean(envStorageZone || envStreamLib),
    isEnabled: true,
    isProductionReady: false,
    environment: process.env.NODE_ENV || "development",
    source: envStorageZone ? "ENV" : "NONE",

    accountApiKeyMasked: maskSecret(envAccountKey),
    accountEmail: "",
    hasAccountKey: Boolean(envAccountKey),

    storageZoneId: "",
    storageZoneName: envStorageZone,
    storagePasswordMasked: maskSecret(envStoragePass),
    storageHostname: (process.env.BUNNY_STORAGE_HOSTNAME || "storage.bunnycdn.com").trim(),
    hasStoragePassword: Boolean(envStoragePass),

    pullZoneId: "",
    pullZoneName: "",
    cdnHostname: envCdnHost,

    streamLibraryId: envStreamLib,
    streamLibraryName: "",
    streamApiKeyMasked: maskSecret(envStreamKey),
    hasStreamApiKey: Boolean(envStreamKey),

    tokenSecurityKeyMasked: maskSecret(process.env.BUNNY_TOKEN_SECURITY_KEY),
    hasTokenKey: Boolean(process.env.BUNNY_TOKEN_SECURITY_KEY),
    enableTokenAuth: false,

    lastTestedAt: null,
    testResults: null,
    updatedAt: null,
    lastActivatedAt: null,
    configuredBy: null,
  };
}

/**
 * Step 1 & 2: Connect Global Account API Key & Discover Resources
 */
export async function connectBunnyApiKeyAction(
  apiKey: string
): Promise<{ success: boolean; resources?: BunnyAccountResources; message?: string }> {
  const admin = await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { success: false, message: "Please enter your Bunny.net Account API Key." };
  }

  // 1. Verify credentials against Bunny API
  const validation = await BunnyService.validateAccountApiKey(cleanKey);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.error || "Failed to authenticate with Bunny.net.",
    };
  }

  // 2. Discover account resources
  const resources = await BunnyService.getAccountResources(cleanKey);

  // 3. Encrypt and persist account API key
  const encryptedKey = encryptSecret(cleanKey);

  const existing = await prisma.mediaProviderConfig.findFirst({
    where: { provider: "BUNNY" },
  });

  if (existing) {
    await prisma.mediaProviderConfig.update({
      where: { id: existing.id },
      data: {
        accountApiKeyEncrypted: encryptedKey,
        isEnabled: true,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.mediaProviderConfig.create({
      data: {
        provider: "BUNNY",
        environment: "production",
        isEnabled: true,
        isProductionReady: false,
        accountApiKeyEncrypted: encryptedKey,
      },
    });
  }

  // 4. Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "BUNNY_CREDENTIALS_CONNECTED",
        entityType: "MediaProviderConfig",
        entityId: "BUNNY",
        newValues: {
          accountKeyMasked: maskSecret(cleanKey),
          discoveredStorageZones: resources.storageZones.length,
          discoveredPullZones: resources.pullZones.length,
          discoveredStreamLibraries: resources.videoLibraries.length,
        },
      },
    });
  } catch {
    // ignore
  }

  invalidateBunnyConfigCache();
  revalidatePath("/admin/settings/media-storage");

  return {
    success: true,
    resources,
    message: "Bunny.net account connected and resources discovered successfully!",
  };
}

/**
 * Step 3: Automated or Guided Storage & CDN Provisioning
 */
export async function autoProvisionStorageAndCdnAction(input: {
  actionType: "AUTO_CREATE_ALL" | "MAP_EXISTING";
  // Auto create options
  newStorageZoneName?: string;
  storageRegion?: string;
  newPullZoneName?: string;
  newStreamLibraryName?: string;
  // Map existing options
  selectedStorageZoneId?: string | number;
  selectedPullZoneId?: string | number;
  selectedStreamLibraryId?: string | number;
}) {
  const admin = await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const config = await getResolvedBunnyConfig();
  const apiKey = config.accountApiKey;

  if (!apiKey) {
    return {
      success: false,
      message: "Bunny Account API Key is not connected. Please complete Step 1 first.",
    };
  }

  try {
    let storageZoneName = config.storageZoneName;
    let storageZoneId = config.storageZoneId;
    let storagePassword = config.storagePassword;

    let pullZoneName = config.pullZoneName;
    let pullZoneId = config.pullZoneId;
    let cdnHostname = config.cdnHostname;

    let streamLibraryName = config.streamLibraryName;
    let streamLibraryId = config.streamLibraryId;
    let streamApiKey = config.streamApiKey;

    const resources = await BunnyService.getAccountResources(apiKey);

    if (input.actionType === "AUTO_CREATE_ALL") {
      // 1. Create Storage Zone if requested
      const targetStorageName = input.newStorageZoneName?.trim() || `lms-storage-${Date.now().toString().slice(-6)}`;
      const existingZone = resources.storageZones.find((z) => z.name.toLowerCase() === targetStorageName.toLowerCase());

      if (existingZone) {
        storageZoneId = String(existingZone.id);
        storageZoneName = existingZone.name;
        storagePassword = existingZone.password || "";
      } else {
        const createZoneRes = await BunnyService.createStorageZone(apiKey, targetStorageName, input.storageRegion || "DE");
        if (!createZoneRes.success || !createZoneRes.zone) {
          return { success: false, message: createZoneRes.error || "Failed to create Storage Zone." };
        }
        storageZoneId = String(createZoneRes.zone.id);
        storageZoneName = createZoneRes.zone.name;
        storagePassword = createZoneRes.zone.password || "";
      }

      // 2. Create Pull Zone (CDN) linked to storage zone
      const targetPullName = input.newPullZoneName?.trim() || `${storageZoneName}-cdn`;
      const existingPull = resources.pullZones.find((p) => p.name.toLowerCase() === targetPullName.toLowerCase());

      if (existingPull) {
        pullZoneId = String(existingPull.id);
        pullZoneName = existingPull.name;
        cdnHostname = existingPull.primaryHostname;
      } else {
        const createPullRes = await BunnyService.createPullZone(apiKey, targetPullName, storageZoneId);
        if (!createPullRes.success || !createPullRes.pullZone) {
          return { success: false, message: createPullRes.error || "Failed to create Pull Zone CDN." };
        }
        pullZoneId = String(createPullRes.pullZone.id);
        pullZoneName = createPullRes.pullZone.name;
        cdnHostname = createPullRes.pullZone.primaryHostname;
      }

      // 3. Create Stream Video Library if requested
      const targetStreamName = input.newStreamLibraryName?.trim() || "LMS Video Academy";
      const existingStream = resources.videoLibraries.find((v) => v.name.toLowerCase() === targetStreamName.toLowerCase());

      if (existingStream) {
        streamLibraryId = String(existingStream.id);
        streamLibraryName = existingStream.name;
        streamApiKey = existingStream.apiKey || "";
      } else {
        const createStreamRes = await BunnyService.createVideoLibrary(apiKey, targetStreamName);
        if (!createStreamRes.success || !createStreamRes.library) {
          return { success: false, message: createStreamRes.error || "Failed to create Video Library." };
        }
        streamLibraryId = String(createStreamRes.library.id);
        streamLibraryName = createStreamRes.library.name;
        streamApiKey = createStreamRes.library.apiKey || "";
      }
    } else {
      // MAP_EXISTING: Resolve selected resources
      if (input.selectedStorageZoneId) {
        const zone = resources.storageZones.find((z) => String(z.id) === String(input.selectedStorageZoneId));
        if (zone) {
          storageZoneId = String(zone.id);
          storageZoneName = zone.name;
          storagePassword = zone.password || storagePassword;
        }
      }

      if (input.selectedPullZoneId) {
        const pull = resources.pullZones.find((p) => String(p.id) === String(input.selectedPullZoneId));
        if (pull) {
          pullZoneId = String(pull.id);
          pullZoneName = pull.name;
          cdnHostname = pull.primaryHostname;
        }
      }

      if (input.selectedStreamLibraryId) {
        const stream = resources.videoLibraries.find((v) => String(v.id) === String(input.selectedStreamLibraryId));
        if (stream) {
          streamLibraryId = String(stream.id);
          streamLibraryName = stream.name;
          streamApiKey = stream.apiKey || streamApiKey;
        }
      }
    }

    // Persist configuration
    const encryptedStoragePass = encryptSecret(storagePassword);
    const encryptedStreamKey = encryptSecret(streamApiKey);

    const existing = await prisma.mediaProviderConfig.findFirst({
      where: { provider: "BUNNY" },
    });

    if (existing) {
      await prisma.mediaProviderConfig.update({
        where: { id: existing.id },
        data: {
          storageZoneId,
          storageZoneName,
          storagePasswordEncrypted: encryptedStoragePass || existing.storagePasswordEncrypted,
          pullZoneId,
          pullZoneName,
          cdnHostname,
          streamLibraryId,
          streamLibraryName,
          streamApiKeyEncrypted: encryptedStreamKey || existing.streamApiKeyEncrypted,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.mediaProviderConfig.create({
        data: {
          provider: "BUNNY",
          environment: "production",
          isEnabled: true,
          isProductionReady: false,
          accountApiKeyEncrypted: encryptSecret(apiKey),
          storageZoneId,
          storageZoneName,
          storagePasswordEncrypted: encryptedStoragePass,
          storageHostname: "storage.bunnycdn.com",
          pullZoneId,
          pullZoneName,
          cdnHostname,
          streamLibraryId,
          streamLibraryName,
          streamApiKeyEncrypted: encryptedStreamKey,
        },
      });
    }

    invalidateBunnyConfigCache();
    revalidatePath("/admin/settings/media-storage");

    return {
      success: true,
      message: "Bunny storage, CDN, and stream resources provisioned and configured successfully!",
      config: {
        storageZoneName,
        cdnHostname,
        streamLibraryId,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to provision Bunny resources.",
    };
  }
}

/**
 * Step 4: Save & Fine-Tune LMS Media Configuration
 */
export async function saveLmsMediaConfigAction(input: {
  storageZoneName: string;
  storagePassword?: string;
  storageHostname?: string;
  cdnHostname: string;
  streamLibraryId?: string;
  streamApiKey?: string;
  tokenSecurityKey?: string;
  enableTokenAuth?: boolean;
}) {
  const admin = await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const existing = await prisma.mediaProviderConfig.findFirst({
    where: { provider: "BUNNY" },
  });

  const encryptedStoragePass = input.storagePassword?.trim()
    ? encryptSecret(input.storagePassword.trim())
    : existing?.storagePasswordEncrypted;

  const encryptedStreamKey = input.streamApiKey?.trim()
    ? encryptSecret(input.streamApiKey.trim())
    : existing?.streamApiKeyEncrypted;

  const encryptedTokenKey = input.tokenSecurityKey?.trim()
    ? encryptSecret(input.tokenSecurityKey.trim())
    : existing?.tokenSecurityKeyEncrypted;

  const cleanCdnHost = input.cdnHostname.replace(/^https?:\/\//, "").replace(/\/+$/, "").trim();

  if (existing) {
    await prisma.mediaProviderConfig.update({
      where: { id: existing.id },
      data: {
        storageZoneName: input.storageZoneName.trim(),
        storagePasswordEncrypted: encryptedStoragePass,
        storageHostname: input.storageHostname?.trim() || "storage.bunnycdn.com",
        cdnHostname: cleanCdnHost,
        streamLibraryId: input.streamLibraryId?.trim() || null,
        streamApiKeyEncrypted: encryptedStreamKey,
        tokenSecurityKeyEncrypted: encryptedTokenKey,
        enableTokenAuth: Boolean(input.enableTokenAuth),
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.mediaProviderConfig.create({
      data: {
        provider: "BUNNY",
        environment: "production",
        isEnabled: true,
        isProductionReady: false,
        storageZoneName: input.storageZoneName.trim(),
        storagePasswordEncrypted: encryptedStoragePass,
        storageHostname: input.storageHostname?.trim() || "storage.bunnycdn.com",
        cdnHostname: cleanCdnHost,
        streamLibraryId: input.streamLibraryId?.trim() || null,
        streamApiKeyEncrypted: encryptedStreamKey,
        tokenSecurityKeyEncrypted: encryptedTokenKey,
        enableTokenAuth: Boolean(input.enableTokenAuth),
      },
    });
  }

  // Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "BUNNY_MEDIA_CONFIG_UPDATED",
        entityType: "MediaProviderConfig",
        entityId: "BUNNY",
        newValues: {
          storageZoneName: input.storageZoneName,
          cdnHostname: cleanCdnHost,
          streamLibraryId: input.streamLibraryId,
          enableTokenAuth: Boolean(input.enableTokenAuth),
        },
      },
    });
  } catch {
    // ignore
  }

  invalidateBunnyConfigCache();
  revalidatePath("/admin/settings/media-storage");

  return {
    success: true,
    message: "LMS Media Storage configuration saved successfully.",
  };
}

/**
 * Step 5: Comprehensive Interactive Diagnostics Test Suite
 */
export async function runBunnyDiagnosticsAction(
  testScope: "ALL" | "CONNECTION" | "PDF_UPLOAD" | "PDF_DELIVERY" | "VIDEO_UPLOAD" | "VIDEO_DELIVERY" = "ALL"
): Promise<FullDiagnosticsResult> {
  await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const config = await getResolvedBunnyConfig(true);
  const tests: TestResultItem[] = [];

  let testPath: string | undefined;
  let testVideoGuid: string | undefined;

  // 1. Connection Test
  if (testScope === "ALL" || testScope === "CONNECTION") {
    const connTest = await BunnyService.testStorageConnection(
      config.storageZoneName,
      config.storagePassword,
      config.storageHostname
    );
    tests.push(connTest);
  }

  // 2. PDF Upload Probe
  if (testScope === "ALL" || testScope === "PDF_UPLOAD") {
    const uploadRes = await BunnyService.testPdfUpload(
      config.storageZoneName,
      config.storagePassword,
      config.storageHostname
    );
    tests.push(uploadRes.result);
    testPath = uploadRes.testPath;
  }

  // 3. PDF CDN Delivery Verification
  if (testScope === "ALL" || testScope === "PDF_DELIVERY") {
    const deliveryTest = await BunnyService.testPdfDelivery(
      config.cdnHostname,
      testPath || "_diagnostics/sample-probe.pdf",
      config.enableTokenAuth ? config.tokenSecurityKey : undefined
    );
    tests.push(deliveryTest);
  }

  // 4. Video Upload / Library API Probe
  if (testScope === "ALL" || testScope === "VIDEO_UPLOAD") {
    const videoUploadRes = await BunnyService.testVideoUpload(
      config.streamLibraryId,
      config.streamApiKey
    );
    tests.push(videoUploadRes.result);
    testVideoGuid = videoUploadRes.testVideoGuid;
  }

  // 5. Video Delivery & Embed Gateway Verification
  if (testScope === "ALL" || testScope === "VIDEO_DELIVERY") {
    const videoDeliveryTest = await BunnyService.testVideoDelivery(
      config.streamLibraryId,
      config.streamApiKey,
      testVideoGuid
    );
    tests.push(videoDeliveryTest);
  }

  const overallSuccess = tests.every((t) => t.success);
  const testedAt = new Date().toISOString();

  // Save diagnostic results in DB
  try {
    const existing = await prisma.mediaProviderConfig.findFirst({
      where: { provider: "BUNNY" },
    });

    if (existing) {
      await prisma.mediaProviderConfig.update({
        where: { id: existing.id },
        data: {
          lastTestedAt: new Date(),
          testResults: JSON.parse(
            JSON.stringify({
              overallSuccess,
              testedAt,
              tests,
            })
          ),
        },
      });
    }
  } catch {
    // ignore
  }

  return {
    overallSuccess,
    testedAt,
    tests,
  };
}

/**
 * Step 6: Finalize & Mark Bunny as Production Ready
 */
export async function finalizeProductionReadyAction(): Promise<{ success: boolean; message: string }> {
  const admin = await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const config = await getResolvedBunnyConfig(true);

  if (!config.storageZoneName || !config.storagePassword || !config.cdnHostname) {
    return {
      success: false,
      message: "Incomplete storage setup. Storage zone name, password, and CDN hostname are required.",
    };
  }

  const existing = await prisma.mediaProviderConfig.findFirst({
    where: { provider: "BUNNY" },
  });

  if (!existing) {
    return { success: false, message: "Configuration record not found." };
  }

  await prisma.mediaProviderConfig.update({
    where: { id: existing.id },
    data: {
      isProductionReady: true,
      isEnabled: true,
      environment: "production",
      updatedAt: new Date(),
    },
  });

  // Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "BUNNY_PRODUCTION_READY_ACTIVATED",
        entityType: "MediaProviderConfig",
        entityId: "BUNNY",
        newValues: {
          storageZoneName: config.storageZoneName,
          cdnHostname: config.cdnHostname,
          streamLibraryId: config.streamLibraryId,
          activatedBy: admin.email,
        },
      },
    });
  } catch {
    // ignore
  }

  invalidateBunnyConfigCache();
  revalidatePath("/admin/settings/media-storage");
  revalidatePath("/admin/settings");

  return {
    success: true,
    message: "Bunny.net media infrastructure is now marked as Production Ready and active across the LMS!",
  };
}

/**
 * Disconnect Bunny.net Credentials
 */
export async function disconnectBunnyAction(): Promise<{ success: boolean; message: string }> {
  const admin = await requireSuperAdmin();
  await ensureDatabaseSchemaSync();

  const existing = await prisma.mediaProviderConfig.findFirst({
    where: { provider: "BUNNY" },
  });

  if (existing) {
    await prisma.mediaProviderConfig.delete({
      where: { id: existing.id },
    });
  }

  // Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "BUNNY_CREDENTIALS_DISCONNECTED",
        entityType: "MediaProviderConfig",
        entityId: "BUNNY",
        newValues: {
          disconnectedBy: admin.email,
        },
      },
    });
  } catch {
    // ignore
  }

  invalidateBunnyConfigCache();
  revalidatePath("/admin/settings/media-storage");
  revalidatePath("/admin/settings");

  return {
    success: true,
    message: "Bunny.net configuration disconnected and removed from LMS.",
  };
}
