import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const clips = await prisma.tradeClip.findMany();
  console.log("TOTAL CLIPS COUNT:", clips.length);
  for (const c of clips) {
    const meta: any = c.metadata || {};
    console.log({
      id: c.id,
      tradeId: c.tradeId,
      masterVideoUrl: c.masterVideoUrl,
      shortVideoUrl: c.shortVideoUrl,
      hasMasterBase64: Boolean(meta.masterBase64),
      storageProvider: c.storageProvider,
      durationSec: c.durationSec,
    });
  }
}

main().catch(console.error);
