import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("Cleaning up base64 binaries from trade_clips table...");

  const clips = await prisma.tradeClip.findMany();
  for (const clip of clips) {
    const meta = (clip.metadata as any) || {};
    if (meta.masterBase64 || meta.shortBase64) {
      delete meta.masterBase64;
      delete meta.shortBase64;

      await prisma.tradeClip.update({
        where: { id: clip.id },
        data: {
          metadata: meta,
        },
      });
      console.log(`Cleaned base64 from TradeClip ID: ${clip.id}`);
    }
  }

  console.log("✅ Neon Database is 100% clean of video base64 blobs!");
}

main().catch(console.error);
