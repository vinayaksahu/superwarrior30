import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { decryptSecret } from "../src/lib/crypto/encryption";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const config = await prisma.mediaProviderConfig.findFirst({
    where: { provider: "BUNNY" },
  });

  if (!config) {
    throw new Error("No Bunny config in database");
  }

  const storageZone = config.storageZoneName;
  const storagePassword = decryptSecret(config.storagePasswordEncrypted);
  const storageHost = config.storageHostname || "storage.bunnycdn.com";
  const cdnHostname = config.cdnHostname || "sw30-production-storage-cdn.b-cdn.net";

  console.log("Testing Bunny Storage upload with zone:", storageZone, "host:", storageHost);

  const testContent = "Rahul Trade Warrior Academy - Bunny Test File at " + new Date().toISOString();
  const buffer = Buffer.from(testContent, "utf-8");
  const testPath = `test/test-clip-${Date.now()}.txt`;
  const uploadUrl = `https://${storageHost}/${storageZone}/${testPath}`;

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      AccessKey: storagePassword!,
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: new Uint8Array(buffer),
  });

  console.log("Upload HTTP status:", res.status);
  if (res.ok) {
    const cdnUrl = `https://${cdnHostname}/${testPath}`;
    console.log("✅ Successfully uploaded to Bunny Storage!");
    console.log("CDN URL:", cdnUrl);
  } else {
    const errText = await res.text();
    console.error("❌ Bunny upload failed:", res.status, errText);
  }
}

main().catch(console.error);
