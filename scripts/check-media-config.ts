import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { decryptSecret } from "../src/lib/crypto/encryption";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const configs = await prisma.mediaProviderConfig.findMany();
  console.log("TOTAL MEDIA CONFIGS:", configs.length);
  for (const c of configs) {
    console.log({
      id: c.id,
      provider: c.provider,
      storageZoneName: c.storageZoneName,
      storageHostname: c.storageHostname,
      cdnHostname: c.cdnHostname,
      hasStoragePassword: Boolean(c.storagePasswordEncrypted),
      storagePasswordDecrypted: decryptSecret(c.storagePasswordEncrypted) ? "VALID_DECRYPT" : "FAILED_DECRYPT",
      streamLibraryId: c.streamLibraryId,
      isEnabled: c.isEnabled,
      isProductionReady: c.isProductionReady,
    });
  }
}

main().catch(console.error);
