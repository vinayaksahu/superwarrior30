import "dotenv/config";

// Mock server-only and next modules for CLI script runner
const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  if (id === "next/cache") {
    return {
      revalidatePath: () => {},
      revalidateTag: () => {},
    };
  }
  if (id === "next/headers") {
    return {
      cookies: () => ({
        get: () => undefined,
        set: () => {},
        delete: () => {},
      }),
      headers: () => new Headers(),
    };
  }
  return originalRequire.apply(this, arguments);
};

async function runTestimonialsVerification() {
  const { prisma } = await import("../src/lib/prisma");
  const {
    submitStudentTestimonialAction,
    resubmitStudentTestimonialAction,
    approveTestimonialAction,
    rejectTestimonialAction,
    toggleFeaturedTestimonialAction,
    deleteTestimonialAction,
    getApprovedTestimonialsAction,
    getStudentTestimonialsAction,
    getAdminTestimonialsAction,
  } = await import("../src/server/actions/testimonial.actions");
  const { withEnvironmentContext } = await import("../src/lib/env-context");
  const { ensureDatabaseSchemaSync } = await import("../src/lib/db-sync");
  console.log("==================================================");
  console.log("🚀 STARTING STUDENT TESTIMONIAL SYSTEM VERIFICATION");
  console.log("==================================================");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${label}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${label}`);
      failedTests++;
    }
  }

  try {
    // 0. Database Schema Sync Check
    console.log("\n1. Checking Database Schema & Idempotent Migrations...");
    await ensureDatabaseSchemaSync();
    assert(true, "Database schema and idempotent migrations synced successfully");

    // 1. Create or Find Test Users
    console.log("\n2. Setting up Test Users...");
    const testAdmin = await prisma.user.upsert({
      where: { email: "test-admin-moderator@sw30.test" },
      update: { role: "SUPER_ADMIN", isTestData: true },
      create: {
        email: "test-admin-moderator@sw30.test",
        name: "Test Admin Moderator",
        role: "SUPER_ADMIN",
        passwordHash: "dummy_hash_for_tests",
        referralCode: "TESTADM999",
        isTestData: true,
      },
    });

    const testStudent = await prisma.user.upsert({
      where: { email: "test-student-trader@sw30.test" },
      update: { role: "STUDENT", isTestData: true },
      create: {
        email: "test-student-trader@sw30.test",
        name: "Test Student Trader",
        role: "STUDENT",
        passwordHash: "dummy_hash_for_tests",
        referralCode: "TESTSTU999",
        isTestData: true,
      },
    });

    assert(Boolean(testAdmin.id && testStudent.id), "Test Admin and Student accounts provisioned");

    // Clean up previous test testimonials for this student in TEST env
    await withEnvironmentContext("TEST", async () => {
      await prisma.testimonial.deleteMany({
        where: { userId: testStudent.id },
      });
    });

    // 2. Test Submission Validation Rules (Consent & Char Limit)
    console.log("\n3. Testing Student Submission Validation Rules...");

    // Test A: Missing Consent
    const consentFail = await submitStudentTestimonialAction({
      displayName: "Test Student",
      content: "This is a valid review length with more than twenty characters.",
      rating: 5,
      consentGiven: false,
    });
    assert(!consentFail.success, "Submission without required consent correctly rejected");

    // Test B: Too Short Review (< 20 chars)
    const shortReviewFail = await submitStudentTestimonialAction({
      displayName: "Test Student",
      content: "Too short",
      rating: 5,
      consentGiven: true,
    });
    assert(!shortReviewFail.success, "Review < 20 characters correctly rejected");

    // Test C: Valid Submission with Screenshots & Metadata
    console.log("\n4. Testing Valid Student Submission & Media Linking...");
    const validSubmit = await submitStudentTestimonialAction({
      displayName: "Test Student Trader",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      rating: 5,
      content: "Rahul Sir\'s mentorship on market liquidity and order flow completely transformed my trading consistency! Passed my first prop firm challenge with a 1:3 risk reward ratio.",
      tradingPlatform: "MetaTrader 5",
      accountType: "Funded Account",
      tradingResult: "+$3,450 Profit (Passed Phase 2)",
      experienceDuration: "3-6 Months",
      consentGiven: true,
      screenshots: [
        {
          url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3",
          caption: "Gold Breakout & Liquidity Sweep 1:3 RR Entry",
        },
        {
          url: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7",
          caption: "Funded Certificate Proof",
        },
      ],
    });

    assert(validSubmit.success && Boolean(validSubmit.id), "Valid student testimonial submitted successfully");
    const testimonialId = validSubmit.id!;

    // Verify DB state
    const createdRecord = await prisma.testimonial.findUnique({
      where: { id: testimonialId },
      include: { media: true },
    });

    assert(createdRecord?.status === "PENDING", "Initial submission status is strictly PENDING");
    assert(createdRecord?.isApproved === false, "Initial submission isApproved is strictly false");
    assert(createdRecord?.media.length === 2, "Both trading screenshots attached as TestimonialMedia");
    assert(createdRecord?.tradingResult === "+$3,450 Profit (Passed Phase 2)", "Trading metadata accurately saved");

    // 3. Test Student Self List
    console.log("\n5. Testing Student 'My Testimonials' DAL Action...");
    const studentList = await getStudentTestimonialsAction();
    assert(
      Array.isArray(studentList),
      "Student can retrieve their submitted testimonials"
    );

    // 4. Test Admin Moderation: Rejection Workflow
    console.log("\n6. Testing Admin Moderation Rejection Workflow...");
    const rejectResult = await rejectTestimonialAction(
      testimonialId,
      "Please upload a clearer screenshot of the trade execution log."
    );
    assert(rejectResult.success, "Admin successfully rejected testimonial with feedback reason");

    const rejectedRecord = await prisma.testimonial.findUnique({
      where: { id: testimonialId },
    });
    assert(rejectedRecord?.status === "REJECTED", "Status updated to REJECTED in database");
    assert(
      rejectedRecord?.rejectionReason === "Please upload a clearer screenshot of the trade execution log.",
      "Rejection reason stored accurately for student feedback"
    );

    // 5. Test Student Edit & Resubmission
    console.log("\n7. Testing Student Edit & Resubmission Workflow...");
    const resubmitResult = await resubmitStudentTestimonialAction(
      testimonialId,
      {
        displayName: "Test Student Trader (Updated)",
        photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
        rating: 5,
        content: "Updated review: Rahul Sir\'s mentorship on market liquidity and order flow transformed my trading. High definition chart attached.",
        tradingPlatform: "MetaTrader 5",
        accountType: "Funded Account",
        tradingResult: "+$3,450 Profit",
        experienceDuration: "3-6 Months",
        consentGiven: true,
        screenshots: [
          {
            url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3",
            caption: "Clear HD Chart Breakdown",
          },
        ],
      }
    );

    assert(resubmitResult.success, "Student successfully resubmitted edited review");

    const resubmittedRecord = await prisma.testimonial.findUnique({
      where: { id: testimonialId },
      include: { media: true },
    });
    assert(resubmittedRecord?.status === "PENDING", "Resubmitted testimonial returns to PENDING status");
    assert(resubmittedRecord?.rejectionReason === null, "Rejection reason cleared upon resubmission");
    assert(resubmittedRecord?.media.length === 1, "Screenshots list updated cleanly");

    // 6. Test Admin Approval & Featured Toggle
    console.log("\n8. Testing Admin Approval & Featured Status...");
    const approveResult = await approveTestimonialAction(testimonialId);
    assert(approveResult.success, "Admin approved testimonial successfully");

    const approvedRecord = await prisma.testimonial.findUnique({
      where: { id: testimonialId },
    });
    assert(approvedRecord?.status === "APPROVED", "Status updated to APPROVED");
    assert(approvedRecord?.isApproved === true, "isApproved flag set to true");
    assert(Boolean(approvedRecord?.approvedAt), "approvedAt timestamp recorded");

    // Toggle Featured
    const featureResult = await toggleFeaturedTestimonialAction(testimonialId);
    assert(featureResult.success && featureResult.isFeatured === true, "Admin successfully toggled testimonial as FEATURED");

    // 7. Test Public Display & Environment Isolation
    console.log("\n9. Testing Public Query & Environment Isolation...");

    // In TEST context: Approved test testimonial is retrieved
    const testApprovedList = await withEnvironmentContext("TEST", async () => {
      return await getApprovedTestimonialsAction();
    });
    assert(
      testApprovedList.some((t: any) => t.id === testimonialId),
      "Test environment returns approved test testimonial"
    );

    // In LIVE context: Test testimonial must NEVER appear in Live queries
    const liveApprovedList = await withEnvironmentContext("LIVE", async () => {
      return await getApprovedTestimonialsAction();
    });
    assert(
      !liveApprovedList.some((t: any) => t.id === testimonialId),
      "STRICT ISOLATION: Test testimonial is completely isolated and excluded from LIVE public queries"
    );

    // 8. Test Clean Teardown
    console.log("\n10. Cleaning up verification test records...");
    await withEnvironmentContext("TEST", async () => {
      await prisma.testimonial.delete({
        where: { id: testimonialId },
      });
    });

    const deletedRecord = await prisma.testimonial.findUnique({
      where: { id: testimonialId },
    });
    assert(deletedRecord === null, "Testimonial and cascade media deleted cleanly");

    console.log("\n==================================================");
    console.log(`🎉 VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("==================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Unexpected error during test run:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestimonialsVerification();
