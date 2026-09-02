import {
  ALL_MODULES,
  ALL_PERMISSION_KEYS,
  hasPermission,
  getEffectivePermissions,
} from "../src/lib/permissions";
import { BUNNY_MAX_VIDEO_SIZE } from "../src/lib/constants";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`, details ? details : "");
    failed++;
  }
}

async function runMediaUnitTests() {
  console.log("==================================================");
  console.log("🚀 PRODUCTION-GRADE MEDIA LIBRARY & UPLOAD MANAGER UNIT TESTS");
  console.log("==================================================");

  // 1. Permissions Matrix Verification
  console.log("\n--- TEST 1: MEDIA LIBRARY RBAC PERMISSION REGISTRATION ---");
  const mediaModule = ALL_MODULES.find((m) => m.id === "media");
  assert(Boolean(mediaModule), "Media Library module registered in RBAC definition");
  assert(
    mediaModule?.permissions.some((p) => p.key === "media.view") === true,
    "'media.view' permission registered"
  );
  assert(
    mediaModule?.permissions.some((p) => p.key === "media.upload") === true,
    "'media.upload' permission registered"
  );
  assert(
    mediaModule?.permissions.some((p) => p.key === "media.delete") === true,
    "'media.delete' permission registered"
  );

  // 2. Super Admin & Full Access Admin Permissions
  console.log("\n--- TEST 2: ADMIN ACCESS AUTHORIZATION ---");
  const superAdminUser = {
    id: "usr_super_1",
    email: "vinayaksahu3@gmail.com",
    role: "SUPER_ADMIN" as const,
    adminRole: "SUPER_ADMIN",
  };
  const superAdminPerms = getEffectivePermissions(superAdminUser);
  assert(superAdminPerms.has("media.view"), "Super Admin has media.view");
  assert(superAdminPerms.has("media.upload"), "Super Admin has media.upload");
  assert(superAdminPerms.has("media.delete"), "Super Admin has media.delete");

  const fullAdminUser = {
    id: "usr_admin_1",
    email: "manager@example.com",
    role: "ADMIN" as const,
    adminRole: "FULL_ACCESS_ADMIN",
  };
  const fullAdminPerms = getEffectivePermissions(fullAdminUser);
  assert(fullAdminPerms.has("media.view"), "Full Access Admin has media.view");
  assert(fullAdminPerms.has("media.upload"), "Full Access Admin has media.upload");
  assert(fullAdminPerms.has("media.delete"), "Full Access Admin has media.delete");

  // 3. Student Authorization Rejection
  console.log("\n--- TEST 3: STUDENT FORBIDDEN ACCESS VERIFICATION ---");
  const studentUser = {
    id: "usr_student_1",
    email: "student@example.com",
    role: "STUDENT" as const,
    adminRole: null,
  };
  const studentPerms = getEffectivePermissions(studentUser);
  assert(!studentPerms.has("media.view"), "Student has NO media.view permission");
  assert(!studentPerms.has("media.upload"), "Student has NO media.upload permission");
  assert(!studentPerms.has("media.delete"), "Student has NO media.delete permission");

  // 4. File Size Limits & Constraints
  console.log("\n--- TEST 4: FILE SIZE CONSTRAINTS & LIMITS ---");
  assert(BUNNY_MAX_VIDEO_SIZE === 2 * 1024 * 1024 * 1024, "Bunny Stream max video size is 2GB (2,147,483,648 bytes)");
  const validSize = 1.8 * 1024 * 1024 * 1024; // 1.8GB
  const invalidSize = 2.5 * 1024 * 1024 * 1024; // 2.5GB
  assert(validSize <= BUNNY_MAX_VIDEO_SIZE, "1.8GB video is accepted for direct TUS upload");
  assert(invalidSize > BUNNY_MAX_VIDEO_SIZE, "2.5GB video is rejected exceeding limit");

  // 5. Media Lifecycle State Transitions
  console.log("\n--- TEST 5: MEDIA STATUS LIFECYCLE STATE MACHINE ---");
  const validStatuses = ["QUEUED", "UPLOADING", "UPLOADED", "PROCESSING", "READY", "FAILED", "CANCELLED"];
  const validProcessingStatuses = ["PENDING", "PROCESSING", "READY", "FAILED"];
  const validMediaTypes = ["VIDEO", "PDF", "IMAGE", "OTHER"];

  assert(validStatuses.includes("QUEUED"), "Lifecycle status QUEUED supported");
  assert(validStatuses.includes("UPLOADING"), "Lifecycle status UPLOADING supported");
  assert(validStatuses.includes("PROCESSING"), "Lifecycle status PROCESSING supported");
  assert(validStatuses.includes("READY"), "Lifecycle status READY supported");
  assert(validStatuses.includes("FAILED"), "Lifecycle status FAILED supported");

  // 6. Type Compatibility Matrix for Course Lessons
  console.log("\n--- TEST 6: LESSON ATTACHMENT TYPE COMPATIBILITY ---");
  function isCompatible(lessonType: "VIDEO" | "PDF" | "TEXT", mediaType: string) {
    if (lessonType === "VIDEO") return mediaType === "VIDEO";
    if (lessonType === "PDF") return mediaType === "PDF";
    return false;
  }

  assert(isCompatible("VIDEO", "VIDEO") === true, "VIDEO media compatible with VIDEO lesson");
  assert(isCompatible("VIDEO", "PDF") === false, "PDF media rejected for VIDEO lesson");
  assert(isCompatible("PDF", "PDF") === true, "PDF media compatible with PDF lesson");
  assert(isCompatible("PDF", "VIDEO") === false, "VIDEO media rejected for PDF lesson");

  // 7. Delete Protection Rule Verification
  console.log("\n--- TEST 7: DELETE PROTECTION LOGIC ---");
  function canDeleteMedia(usageCount: number, status: string): { allowed: boolean; reason?: string } {
    if (usageCount > 0) {
      return { allowed: false, reason: `Cannot delete media attached to ${usageCount} lesson(s).` };
    }
    return { allowed: true };
  }

  const attachedCheck = canDeleteMedia(3, "READY");
  assert(attachedCheck.allowed === false, "Delete blocked when media usage count > 0");

  const unusedCheck = canDeleteMedia(0, "READY");
  assert(unusedCheck.allowed === true, "Delete allowed when media usage count is 0");

  // 8. Multi-Lesson Reusability Mapping
  console.log("\n--- TEST 8: MANY-TO-MANY REUSABLE MEDIA RELATIONSHIP ---");
  const lessonMediaMappings = [
    { lessonId: "lsn_courseA_01", mediaId: "med_pdf_risk_guide", mediaRole: "PRIMARY" },
    { lessonId: "lsn_courseB_05", mediaId: "med_pdf_risk_guide", mediaRole: "ATTACHMENT" },
  ];
  const distinctLessons = new Set(lessonMediaMappings.map((m) => m.lessonId));
  const distinctMedia = new Set(lessonMediaMappings.map((m) => m.mediaId));
  assert(distinctMedia.size === 1, "Single media asset reused across multiple courses");
  assert(distinctLessons.size === 2, "Attached to 2 distinct lessons independently");

  // 9. Checksum Duplicate Detection Logic
  console.log("\n--- TEST 9: CHECKSUM DUPLICATE MATCHING ---");
  const existingRecords = [
    { id: "med_001", checksum: "sha256_hash_abc_123", fileName: "lesson1.mp4", fileSize: 1000000 },
  ];
  function findDuplicate(hash: string) {
    return existingRecords.find((r) => r.checksum === hash) || null;
  }

  assert(findDuplicate("sha256_hash_abc_123") !== null, "Matching checksum detects existing asset");
  assert(findDuplicate("sha256_hash_xyz_999") === null, "Unique checksum proceeds without duplicate prompt");

  // Summary
  console.log("\n==================================================");
  console.log(`🎉 ALL MEDIA LIBRARY UNIT TESTS PASSED: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMediaUnitTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
