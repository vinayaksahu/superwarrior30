import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { encryptSecret, decryptSecret } from "../src/lib/crypto/encryption";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const accountApiKey = "ebd3b5d5-c605-4443-ac5a-bd9348ebf87a529cea84-e85b-4486-9372-77daf3fb6c81";
  const storagePassword = "16c236b4-469e-43af-8b056420205b-ed39-416c";
  const streamApiKey = "16c236b4-469e-43af-8b056420205b-ed39-416c";

  const config = await prisma.mediaProviderConfig.findFirst({
    where: { provider: "BUNNY" },
  });

  if (!config) {
    console.log("No config found to update");
    return;
  }

  const updated = await prisma.mediaProviderConfig.update({
    where: { id: config.id },
    data: {
      accountApiKeyEncrypted: encryptSecret(accountApiKey),
      storagePasswordEncrypted: encryptSecret(storagePassword),
      streamApiKeyEncrypted: encryptSecret(streamApiKey),
      tokenSecurityKeyEncrypted: encryptSecret("sw30_token_security_key_2026"),
      storageZoneName: "sw30-production-storage",
      storageHostname: "storage.bunnycdn.com",
      cdnHostname: "sw30-production-storage-cdn.b-cdn.net",
      streamLibraryId: "740163",
      isEnabled: true,
      isProductionReady: true,
    },
  });

  console.log("Updated Bunny config ID:", updated.id);
  const testDecrypted = decryptSecret(updated.storagePasswordEncrypted);
  console.log("Decryption test:", testDecrypted ? "SUCCESS" : "FAILED");
}

main().catch(console.error);
