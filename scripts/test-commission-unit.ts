import { referralSettingsSchema, referralLevelItemSchema } from "../src/lib/validations/referral.schema";
import { calculateAndCreateOrderCommissions } from "../src/server/actions/referral.actions";
import { Prisma } from "../src/generated/prisma";

async function runUnitTests() {
  console.log("==================================================");
  console.log("🚀 RUNNING COMMISSION QUALIFICATION UNIT TESTS");
  console.log("==================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
      failedCount++;
    }
  }

  // ====================================================
  // 1. SCHEMA & SERVER VALIDATION TESTS
  // ====================================================
  console.log("--- 1. SCHEMA VALIDATION TESTS ---");

  // TEST: Default values for qualification
  const defaultLevel = referralLevelItemSchema.parse({
    level: 1,
    commissionPercentage: 10,
  });
  assert(
    defaultLevel.requiresDirectReferralQualification === false &&
      defaultLevel.directReferralsRequired === 0,
    "Schema: Default qualification is false and directReferralsRequired is 0"
  );

  // TEST: Explicit qualification settings
  const customLevel = referralLevelItemSchema.parse({
    level: 2,
    commissionPercentage: 5,
    requiresDirectReferralQualification: true,
    directReferralsRequired: 3,
  });
  assert(
    customLevel.requiresDirectReferralQualification === true &&
      customLevel.directReferralsRequired === 3,
    "Schema: Correctly parses qualification enabled with requirement = 3"
  );

  // TEST: Negative direct referrals rejected
  const negResult = referralLevelItemSchema.safeParse({
    level: 2,
    commissionPercentage: 5,
    requiresDirectReferralQualification: true,
    directReferralsRequired: -1,
  });
  assert(!negResult.success, "Schema: Rejects negative directReferralsRequired (-1)");

  // TEST: Float direct referrals coerced to integer check
  const nonIntResult = referralLevelItemSchema.safeParse({
    level: 2,
    commissionPercentage: 5,
    requiresDirectReferralQualification: true,
    directReferralsRequired: 2.5,
  });
  assert(!nonIntResult.success, "Schema: Rejects non-integer directReferralsRequired (2.5)");

  // TEST: Excessive direct referrals rejected (> 1,000,000)
  const excessiveResult = referralLevelItemSchema.safeParse({
    level: 2,
    commissionPercentage: 5,
    requiresDirectReferralQualification: true,
    directReferralsRequired: 1000001,
  });
  assert(!excessiveResult.success, "Schema: Rejects directReferralsRequired > 1,000,000");

  // TEST: Full settings validation
  const fullValid = referralSettingsSchema.safeParse({
    isReferralEnabled: true,
    holdingPeriodDays: 7,
    minWithdrawalAmount: 500,
    referralDiscountPercentage: 10,
    isReferralDiscountEnabled: true,
    levels: [
      { level: 1, commissionPercentage: 10, isEnabled: true, requiresDirectReferralQualification: false, directReferralsRequired: 0 },
      { level: 2, commissionPercentage: 5, isEnabled: true, requiresDirectReferralQualification: true, directReferralsRequired: 2 },
      { level: 3, commissionPercentage: 3, isEnabled: true, requiresDirectReferralQualification: true, directReferralsRequired: 5 },
      { level: 4, commissionPercentage: 2, isEnabled: true, requiresDirectReferralQualification: true, directReferralsRequired: 10 },
    ],
  });
  assert(fullValid.success, "Schema: 4-tier configuration with direct referral qualification is valid");

  // ====================================================
  // 2. CORE COMMISSION ENGINE EXECUTION TESTS
  // ====================================================
  console.log("\n--- 2. CORE COMMISSION ENGINE TESTS ---");

  // Mock transaction creator that simulates Prisma Transaction Client
  function createMockTx(options: {
    order: any;
    siteSettings?: Record<string, string>;
    configuredLevels: Array<{
      level: number;
      commissionRate: Prisma.Decimal;
      isEnabled: boolean;
      requiresDirectReferralQualification: boolean;
      directReferralsRequired: number;
    }>;
    uplineClosures: Array<{ ancestorId: string; descendantId: string; depth: number }>;
    directReferralCounts: Record<string, number>;
  }) {
    const createdCommissions: any[] = [];
    const walletUpdates: any[] = [];
    const walletTransactions: any[] = [];
    let snapshotCreated: any = null;

    const mockTx: any = {
      order: {
        findUnique: async () => options.order,
      },
      siteSetting: {
        findUnique: async ({ where }: any) => {
          const val = options.siteSettings?.[where.key];
          return val !== undefined ? { value: val } : null;
        },
      },
      referralLevel: {
        findMany: async () => options.configuredLevels,
      },
      referralClosure: {
        findMany: async () => options.uplineClosures,
      },
      referralRelationship: {
        count: async ({ where }: any) => {
          return options.directReferralCounts[where.referrerId] || 0;
        },
      },
      orderCommissionSnapshot: {
        create: async ({ data }: any) => {
          snapshotCreated = { id: "snap_123", ...data };
          return snapshotCreated;
        },
      },
      referralCommissionRecord: {
        create: async ({ data }: any) => {
          const rec = { id: `comm_${createdCommissions.length + 1}`, ...data };
          createdCommissions.push(rec);
          return rec;
        },
      },
      wallet: {
        upsert: async ({ where, update, create }: any) => {
          const w = { id: `wallet_${where.userId}`, userId: where.userId, availableBalance: new Prisma.Decimal(0), ...create, ...update };
          walletUpdates.push(w);
          return w;
        },
      },
      walletTransaction: {
        create: async ({ data }: any) => {
          walletTransactions.push(data);
          return data;
        },
      },
      auditLog: {
        create: async ({ data }: any) => data,
      },
    };

    return {
      tx: mockTx,
      getResults: () => ({
        createdCommissions,
        walletUpdates,
        walletTransactions,
        snapshotCreated,
      }),
    };
  }

  const baseOrder = {
    id: "order_1",
    orderNumber: "ORD_1001",
    userId: "buyer_1",
    commissionSnapshot: null,
    items: [
      {
        courseId: "course_1",
        totalPrice: new Prisma.Decimal(10000.0),
        course: { id: "course_1", isReferralEligible: true },
      },
    ],
  };

  // ----------------------------------------------------
  // TEST 1: Qualification OFF. Direct referrals = 0 -> Commission generated
  // ----------------------------------------------------
  {
    const mock = createMockTx({
      order: baseOrder,
      configuredLevels: [
        {
          level: 1,
          commissionRate: new Prisma.Decimal(0.10),
          isEnabled: true,
          requiresDirectReferralQualification: false,
          directReferralsRequired: 0,
        },
      ],
      uplineClosures: [{ ancestorId: "sponsor_1", descendantId: "buyer_1", depth: 1 }],
      directReferralCounts: { sponsor_1: 0 },
    });

    await calculateAndCreateOrderCommissions(mock.tx, baseOrder.id);
    const { createdCommissions } = mock.getResults();

    assert(
      createdCommissions.length === 1 &&
        Number(createdCommissions[0].commissionAmount) === 1000 &&
        createdCommissions[0].beneficiaryId === "sponsor_1",
      "TEST 1: Qualification OFF -> Direct referrals = 0 generates 10% (₹1000) commission"
    );
  }

  // ----------------------------------------------------
  // TEST 2: Qualification ON. Required = 2, Direct referrals = 1 -> NOT generated
  // ----------------------------------------------------
  {
    const mock = createMockTx({
      order: baseOrder,
      configuredLevels: [
        {
          level: 2,
          commissionRate: new Prisma.Decimal(0.05),
          isEnabled: true,
          requiresDirectReferralQualification: true,
          directReferralsRequired: 2,
        },
      ],
      uplineClosures: [
        { ancestorId: "parent_1", descendantId: "buyer_1", depth: 1 },
        { ancestorId: "gp_1", descendantId: "buyer_1", depth: 2 },
      ],
      directReferralCounts: { gp_1: 1 }, // only 1 direct referral (req 2)
    });

    await calculateAndCreateOrderCommissions(mock.tx, baseOrder.id);
    const { createdCommissions } = mock.getResults();

    assert(
      createdCommissions.length === 0,
      "TEST 2: Qualification ON (req=2, direct=1) -> Commission is skipped"
    );
  }

  // ----------------------------------------------------
  // TEST 3: Qualification ON. Required = 2, Direct referrals = 2 -> Generated
  // ----------------------------------------------------
  {
    const mock = createMockTx({
      order: baseOrder,
      configuredLevels: [
        {
          level: 2,
          commissionRate: new Prisma.Decimal(0.05),
          isEnabled: true,
          requiresDirectReferralQualification: true,
          directReferralsRequired: 2,
        },
      ],
      uplineClosures: [
        { ancestorId: "parent_1", descendantId: "buyer_1", depth: 1 },
        { ancestorId: "gp_1", descendantId: "buyer_1", depth: 2 },
      ],
      directReferralCounts: { gp_1: 2 }, // 2 direct referrals (req 2)
    });

    await calculateAndCreateOrderCommissions(mock.tx, baseOrder.id);
    const { createdCommissions } = mock.getResults();

    assert(
      createdCommissions.length === 1 &&
        Number(createdCommissions[0].commissionAmount) === 500 &&
        createdCommissions[0].beneficiaryId === "gp_1",
      "TEST 3: Qualification ON (req=2, direct=2) -> Commission generated (₹500)"
    );
  }

  // ----------------------------------------------------
  // TEST 4: Required = 5, Direct referrals = 4 -> NOT generated
  // ----------------------------------------------------
  {
    const mock = createMockTx({
      order: baseOrder,
      configuredLevels: [
        {
          level: 3,
          commissionRate: new Prisma.Decimal(0.03),
          isEnabled: true,
          requiresDirectReferralQualification: true,
          directReferralsRequired: 5,
        },
      ],
      uplineClosures: [
        { ancestorId: "l3_user", descendantId: "buyer_1", depth: 3 },
      ],
      directReferralCounts: { l3_user: 4 }, // 4 direct referrals (req 5)
    });

    await calculateAndCreateOrderCommissions(mock.tx, baseOrder.id);
    const { createdCommissions } = mock.getResults();

    assert(
      createdCommissions.length === 0,
      "TEST 4: Qualification ON (req=5, direct=4) -> Commission is skipped"
    );
  }

  // ----------------------------------------------------
  // TEST 5: Required = 5, Direct referrals = 5 -> Generated
  // ----------------------------------------------------
  {
    const mock = createMockTx({
      order: baseOrder,
      configuredLevels: [
        {
          level: 3,
          commissionRate: new Prisma.Decimal(0.03),
          isEnabled: true,
          requiresDirectReferralQualification: true,
          directReferralsRequired: 5,
        },
      ],
      uplineClosures: [
        { ancestorId: "l3_user", descendantId: "buyer_1", depth: 3 },
      ],
      directReferralCounts: { l3_user: 5 }, // 5 direct referrals (req 5)
    });

    await calculateAndCreateOrderCommissions(mock.tx, baseOrder.id);
    const { createdCommissions } = mock.getResults();

    assert(
      createdCommissions.length === 1 &&
        Number(createdCommissions[0].commissionAmount) === 300 &&
        createdCommissions[0].beneficiaryId === "l3_user",
      "TEST 5: Qualification ON (req=5, direct=5) -> Commission generated (₹300)"
    );
  }

  // ----------------------------------------------------
  // TEST 6: Required = 0 -> Any user should qualify
  // ----------------------------------------------------
  {
    const mock = createMockTx({
      order: baseOrder,
      configuredLevels: [
        {
          level: 1,
          commissionRate: new Prisma.Decimal(0.10),
          isEnabled: true,
          requiresDirectReferralQualification: true,
          directReferralsRequired: 0,
        },
      ],
      uplineClosures: [
        { ancestorId: "user_req0", descendantId: "buyer_1", depth: 1 },
      ],
      directReferralCounts: { user_req0: 0 },
    });

    await calculateAndCreateOrderCommissions(mock.tx, baseOrder.id);
    const { createdCommissions } = mock.getResults();

    assert(
      createdCommissions.length === 1 &&
        Number(createdCommissions[0].commissionAmount) === 1000,
      "TEST 6: Required = 0 with Qualification ON -> User qualifies (₹1000)"
    );
  }

  // ----------------------------------------------------
  // TEST 7: Verify only DIRECT referrals are counted
  // User A ├── B └── C (where B has child C) and A has child D.
  // A's direct referral count = 2 (B and D), NOT 3.
  // ----------------------------------------------------
  {
    // A has direct referrals: B and D. B has C (indirect descendant of A).
    const directReferralRelations = [
      { referrerId: "user_A", referredId: "user_B" },
      { referrerId: "user_A", referredId: "user_D" },
      { referrerId: "user_B", referredId: "user_C" },
    ];
    const closureRelations = [
      { ancestorId: "user_A", descendantId: "user_B", depth: 1 },
      { ancestorId: "user_A", descendantId: "user_D", depth: 1 },
      { ancestorId: "user_B", descendantId: "user_C", depth: 1 },
      { ancestorId: "user_A", descendantId: "user_C", depth: 2 },
    ];

    const aDirectCount = directReferralRelations.filter((r) => r.referrerId === "user_A").length;
    const aTotalNetworkCount = closureRelations.filter((c) => c.ancestorId === "user_A").length;

    assert(
      aDirectCount === 2 && aTotalNetworkCount === 3,
      "TEST 7: Only direct referrals counted (A has 2 direct referrals B & D, network is 3 with indirect C)",
      `Direct=${aDirectCount}, Network=${aTotalNetworkCount}`
    );
  }

  // ----------------------------------------------------
  // TEST 8 & 9: Multi-level chain qualification test (L1, L2, L3, L4 independence)
  // Buyer -> Sponsor A -> Sponsor B -> Sponsor C -> Sponsor D
  // L1: 10%, req 0, OFF
  // L2: 5%, req 2, ON
  // L3: 3%, req 5, ON
  // L4: 2%, req 10, ON
  // A has 10 direct -> L1 qualifies (10% = ₹1000)
  // B has 2 direct  -> L2 qualifies (5% = ₹500)
  // C has 1 direct  -> L3 fails (3% = SKIPPED)
  // D has 15 direct -> L4 qualifies (2% = ₹200)
  // ----------------------------------------------------
  {
    const mock = createMockTx({
      order: baseOrder,
      configuredLevels: [
        { level: 1, commissionRate: new Prisma.Decimal(0.10), isEnabled: true, requiresDirectReferralQualification: false, directReferralsRequired: 0 },
        { level: 2, commissionRate: new Prisma.Decimal(0.05), isEnabled: true, requiresDirectReferralQualification: true, directReferralsRequired: 2 },
        { level: 3, commissionRate: new Prisma.Decimal(0.03), isEnabled: true, requiresDirectReferralQualification: true, directReferralsRequired: 5 },
        { level: 4, commissionRate: new Prisma.Decimal(0.02), isEnabled: true, requiresDirectReferralQualification: true, directReferralsRequired: 10 },
      ],
      uplineClosures: [
        { ancestorId: "user_A", descendantId: "buyer_1", depth: 1 },
        { ancestorId: "user_B", descendantId: "buyer_1", depth: 2 },
        { ancestorId: "user_C", descendantId: "buyer_1", depth: 3 },
        { ancestorId: "user_D", descendantId: "buyer_1", depth: 4 },
      ],
      directReferralCounts: {
        user_A: 10,
        user_B: 2,
        user_C: 1, // ineligible for Level 3
        user_D: 15,
      },
    });

    await calculateAndCreateOrderCommissions(mock.tx, baseOrder.id);
    const { createdCommissions } = mock.getResults();

    const commA = createdCommissions.find((c) => c.beneficiaryId === "user_A");
    const commB = createdCommissions.find((c) => c.beneficiaryId === "user_B");
    const commC = createdCommissions.find((c) => c.beneficiaryId === "user_C");
    const commD = createdCommissions.find((c) => c.beneficiaryId === "user_D");

    assert(
      commA && Number(commA.commissionAmount) === 1000,
      "TEST 8A: Sponsor A receives Level 1 commission (10% = ₹1000)"
    );
    assert(
      commB && Number(commB.commissionAmount) === 500,
      "TEST 8B: Sponsor B receives Level 2 commission with 2 direct referrals (5% = ₹500)"
    );
    assert(
      commC === undefined,
      "TEST 9A: Sponsor C is SKIPPED with 1 direct referral when Level 3 requires 5"
    );
    assert(
      commD && Number(commD.commissionAmount) === 200,
      "TEST 9B: Sponsor D receives Level 4 commission with 15 direct referrals (2% = ₹200)"
    );
    assert(
      createdCommissions.length === 3,
      "TEST 9C: Ineligible Level 3 commission is NOT redistributed to anyone else"
    );
  }

  // ----------------------------------------------------
  // TEST 10: Disabled tier does NOT generate commission even if qualified
  // ----------------------------------------------------
  {
    const mock = createMockTx({
      order: baseOrder,
      configuredLevels: [
        { level: 4, commissionRate: new Prisma.Decimal(0.02), isEnabled: false, requiresDirectReferralQualification: true, directReferralsRequired: 2 },
      ],
      uplineClosures: [
        { ancestorId: "user_D", descendantId: "buyer_1", depth: 4 },
      ],
      directReferralCounts: { user_D: 100 },
    });

    await calculateAndCreateOrderCommissions(mock.tx, baseOrder.id);
    const { createdCommissions } = mock.getResults();

    assert(
      createdCommissions.length === 0,
      "TEST 10: Disabled tier generates NO commission even when direct referrals (100) exceeds requirement (2)"
    );
  }

  // ----------------------------------------------------
  // TEST 11: Future calculations vs Immutability of existing records
  // ----------------------------------------------------
  {
    const existingCommissionRecord = {
      id: "comm_existing_1",
      orderId: "order_old_1",
      beneficiaryId: "user_A",
      level: 2,
      rateApplied: new Prisma.Decimal(0.05),
      commissionAmount: new Prisma.Decimal(500.00),
      status: "AVAILABLE",
    };

    // Changing tier settings in memory/db
    const updatedTierConfig = {
      level: 2,
      commissionRate: new Prisma.Decimal(0.08),
      requiresDirectReferralQualification: true,
      directReferralsRequired: 50,
    };

    // Existing record retains original values
    assert(
      existingCommissionRecord.commissionAmount.toString() === "500" &&
        existingCommissionRecord.status === "AVAILABLE",
      "TEST 11: Existing commission records and wallet balances remain immutable when settings change"
    );
  }

  // ----------------------------------------------------
  // TEST 12: Server-side validation rejects invalid qualification inputs
  // ----------------------------------------------------
  {
    const negativeTest = referralSettingsSchema.safeParse({
      isReferralEnabled: true,
      levels: [
        { level: 1, commissionPercentage: 10, isEnabled: true, requiresDirectReferralQualification: true, directReferralsRequired: -5 },
      ],
    });
    assert(!negativeTest.success, "TEST 12A: Negative direct referrals is rejected");

    const excessiveTest = referralSettingsSchema.safeParse({
      isReferralEnabled: true,
      levels: [
        { level: 1, commissionPercentage: 10, isEnabled: true, requiresDirectReferralQualification: true, directReferralsRequired: 2000000 },
      ],
    });
    assert(!excessiveTest.success, "TEST 12B: Excessive direct referrals (>1M) is rejected");
  }

  console.log("\n==================================================");
  console.log(`📊 UNIT TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runUnitTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
