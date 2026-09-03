import "dotenv/config";
import { lessonSchema } from "../src/lib/validations/course.schema";
import { getTestPrismaClient } from "../src/lib/prisma";

async function testLessonTypes() {
  console.log("Testing validation schema for all 5 content types...");

  const types = ["VIDEO", "PDF", "TEXT", "QUIZ", "ASSIGNMENT"];
  for (const t of types) {
    const raw = {
      title: `Test ${t} Lesson`,
      contentType: t,
      isPublished: "true",
    };
    const res = lessonSchema.safeParse(raw);
    if (!res.success) {
      console.error(`❌ Validation failed for ${t}:`, res.error.flatten());
      process.exit(1);
    } else {
      console.log(`✅ Schema accepted: ${t}`);
    }
  }

  console.log("All 5 content types validated successfully!");
}

testLessonTypes().catch((err) => {
  console.error(err);
  process.exit(1);
});
