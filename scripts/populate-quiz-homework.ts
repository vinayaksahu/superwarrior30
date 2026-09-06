import "dotenv/config";
import { getProductionPrismaClient } from "../src/lib/prisma";

async function populateQuizAndHomework() {
  const prod = getProductionPrismaClient();

  const COURSE_SLUG = "super-warrior-30-liquidity-trading-mastery-private-mentorship";

  console.log("🔍 Verifying course in Production DB...");
  const course = await prod.course.findUnique({
    where: { slug: COURSE_SLUG },
    include: {
      modules: {
        where: { position: 3 },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            include: {
              quiz: true,
              homework: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error(`Course ${COURSE_SLUG} not found in production DB!`);
  }

  const module3 = course.modules[0];
  if (!module3) {
    throw new Error("Module 3 (Quiz & Homework) not found!");
  }

  console.log(`✅ Found Course: "${course.title}" | Module 3: "${module3.title}"`);

  const quizLesson = module3.lessons.find((l) => l.contentType === "QUIZ" || l.quiz !== null);
  const homeworkLesson = module3.lessons.find((l) => l.contentType === "ASSIGNMENT" || l.homework !== null);

  if (!quizLesson || !homeworkLesson) {
    throw new Error("Could not locate quiz or homework lesson in Module 3!");
  }

  console.log(`\n📘 Updating Quiz Lesson: ${quizLesson.id}`);
  await prod.lesson.update({
    where: { id: quizLesson.id },
    data: {
      title: "Super Warrior 30 – Master Trading Quiz (Classes 01 to 05)",
      isPublished: true,
    },
  });

  // 1. Clean up old test attempts for quiz
  console.log("Cleaning up old test quiz attempts...");
  if (quizLesson.quiz) {
    await prod.quizAttempt.deleteMany({
      where: { quizId: quizLesson.quiz.id },
    });
    await prod.quizQuestion.deleteMany({
      where: { quizId: quizLesson.quiz.id },
    });
  }

  // 2. Define 20 Comprehensive Questions based on PDF Classes 01 to 05
  const questionsData = [
    {
      questionText: "What is the foundational core philosophy of the Super Warrior 30 trading methodology?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Course Philosophy (Page 1): Charts do not need to be complicated. Super Warrior 30 teaches Pure Price Action with Simple Support & Resistance and Simple Liquidity, strictly avoiding FVG, Order Blocks, SMC, ICT, and lagging indicators.",
      options: [
        { optionText: "Trading with multiple lagging indicators such as RSI, MACD, and moving average crossovers", isCorrect: false },
        { optionText: "Pure Price Action strategy with simple Support & Resistance and Simple Liquidity (No FVG, No Order Blocks, No SMC, No ICT, No Indicators)", isCorrect: true },
        { optionText: "Algorithmic automated bot trading based on Fibonacci golden ratio retracements", isCorrect: false },
        { optionText: "Entering breakout trades immediately whenever an expanding green or red candle appears", isCorrect: false },
      ],
    },
    {
      questionText: "How does the Super Warrior 30 framework define the Timeframe Hierarchy between Higher Timeframe (HTF) and Lower Timeframe (LTF)?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 01 (Page 3): Higher Timeframes (4H / 1D / 1H) establish the macro trend, institutional levels, and major liquidity pools. Lower Timeframes (5M / 1M) are used strictly to refine execution, identify liquidity sweeps, and time candlestick confirmation triggers.",
      options: [
        { optionText: "HTF (4H / 1D / 1H) establishes macro trend, institutional levels, and major liquidity; LTF (5M / 1M) refines execution, sweeps, and entry triggers.", isCorrect: true },
        { optionText: "LTF (1M) establishes the macro trend, while HTF (Daily) is used only for timing candle entries.", isCorrect: false },
        { optionText: "Traders should only look at 1-minute charts without checking 1-hour or daily timeframes.", isCorrect: false },
        { optionText: "All timeframes should have 5 different moving averages to confirm market direction.", isCorrect: false },
      ],
    },
    {
      questionText: "When reading market structure and swing points on live charts, what is the crucial rule for validating genuine Higher Highs/Lows and Lower Highs/Lows?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 01 Important Warning (Page 4): Do not mistake minor 1-minute wicks for genuine structural swings. Always mark prominent, distinct 'V' (swing lows) or inverted 'V' (swing highs) as your validated swings.",
      options: [
        { optionText: "Every single 1-minute wick must be treated as a major structural swing.", isCorrect: false },
        { optionText: "Do not mistake minor 1-minute wicks for genuine structural swings; always mark prominent, distinct 'V' or inverted 'V' shapes as validated swings.", isCorrect: true },
        { optionText: "Swing points are only valid if an oscillator reaches extreme overbought or oversold zones.", isCorrect: false },
        { optionText: "Swings should only be marked when high-impact economic news releases occur.", isCorrect: false },
      ],
    },
    {
      questionText: "What is the Warrior Rule when price arrives at a marked horizontal Support level?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Warrior Rule (Class 02, Page 5): Price arriving at Support is NEVER an automatic entry signal! Support is merely an 'Alert Zone'. An entry is only valid once a liquidity sweep occurs and a bullish reversal candle confirms.",
      options: [
        { optionText: "Immediately place an aggressive Buy Limit order as soon as price taps the support line.", isCorrect: false },
        { optionText: "Price arriving at Support is NEVER an automatic entry signal! Support is merely an 'Alert Zone'. An entry is only valid once liquidity is swept and candlestick confirmation aligns.", isCorrect: true },
        { optionText: "Sell immediately expecting price to break down through the support floor.", isCorrect: false },
        { optionText: "Double your standard position size because support always guarantees an immediate upward bounce.", isCorrect: false },
      ],
    },
    {
      questionText: "How should institutional Support and Resistance levels be plotted on charts?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 02 (Page 5 & 6): Always plot Support as a functional zone rather than a razor-thin line (e.g. 4032–4035). Candlestick wicks frequently pierce beneath this zone to hunt liquidity, but the candle's real body must close firmly above or within the zone.",
      options: [
        { optionText: "As a functional horizontal zone rather than a razor-thin line, allowing wicks to hunt liquidity while real bodies close within or above/below.", isCorrect: true },
        { optionText: "Strictly as a single razor-thin horizontal line fixed to the exact penny.", isCorrect: false },
        { optionText: "Using diagonal trendlines connecting arbitrary wick shadows across multiple angles.", isCorrect: false },
        { optionText: "Based strictly on round psychological numbers (e.g. 1000, 2000, 3000) regardless of price swings.", isCorrect: false },
      ],
    },
    {
      questionText: "In the institutional level hierarchy, how is a 'Week L' (Weak Level) defined?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 02 (Page 7): A Weak Level ('Week L') is formed by a minor pause with low volume that easily gets sliced through in a single candle (such as 4,032 on Gold). Buying at a weak level is a guaranteed waste of capital.",
      options: [
        { optionText: "A multi-session institutional floor that triggers a 120+ pip rally.", isCorrect: false },
        { optionText: "A level formed by a minor pause with low volume that easily gets sliced through in a single candle; trading here is a guaranteed waste of capital.", isCorrect: true },
        { optionText: "A level where commercial institutional buyers have placed iceberg limit orders.", isCorrect: false },
        { optionText: "A level verified by at least three independent technical indicators.", isCorrect: false },
      ],
    },
    {
      questionText: "What defines a '2X Strong Level' ('2X strong L') as demonstrated on the Gold chart at 3,996?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 02 (Page 7): '2X strong L' is the Institutional Floor where massive institutional volume entered across multiple sessions (such as 3,996 on Gold, generating a massive 122-pip rally), delivering premium 1:3 and 1:4 Risk:Reward setups.",
      options: [
        { optionText: "The Institutional Floor where massive institutional volume entered across multiple sessions, sparking a 122+ pip rally and yielding 1:3 to 1:4+ R:R setups.", isCorrect: true },
        { optionText: "A minor consolidation zone where traders scalp 3–5 pips with high leverage.", isCorrect: false },
        { optionText: "A Fibonacci 61.8% golden pocket retracement level on the 1-minute chart.", isCorrect: false },
        { optionText: "A level that gets invalidated after being touched twice.", isCorrect: false },
      ],
    },
    {
      questionText: "On the sell-side hierarchy, what does 'Sell 2X Strong L' (such as 4,176 on Gold) represent?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 02 (Page 8): 'Sell 2X Strong L' is the Impenetrable Supply Ceiling—a multi-day swing high where price printed a rock-solid double top sparking a 100+ pip downward plunge.",
      options: [
        { optionText: "A minor pullback ceiling that easily breaks upward during bullish trend continuation.", isCorrect: false },
        { optionText: "The Impenetrable Institutional Supply Ceiling (multi-day swing high / double top) sparking 100+ pip downward plunges where high-RR shorts are planned.", isCorrect: true },
        { optionText: "An aggressive breakout zone where retail traders should enter market buy orders.", isCorrect: false },
        { optionText: "A level that only applies to crypto markets and not Gold or Forex.", isCorrect: false },
      ],
    },
    {
      questionText: "What is 'Buy-Side Liquidity' (BSL) and where is it located on a chart?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 02 (Page 9): Buy-Side Liquidity (BSL) consists of clustered resting Buy-Stop orders from breakout buyers and Stop Losses from short sellers situated directly above prominent swing highs, double tops, and key resistance levels.",
      options: [
        { optionText: "Clustered resting Buy-Stop orders from breakout buyers and Stop Losses from short sellers situated directly above prominent swing highs and resistance.", isCorrect: true },
        { optionText: "Sell-limit orders resting beneath swing lows to absorb buyers.", isCorrect: false },
        { optionText: "Cash funds deposited into the retail broker's clearing account.", isCorrect: false },
        { optionText: "The trading volume reported on the daily tick chart.", isCorrect: false },
      ],
    },
    {
      questionText: "Why do Equal Highs (EQH) and Equal Lows (EQL) act as deadly retail traps?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 02 (Page 9): Retailers enter blindly on 'Double Tops/Bottoms' with tight 5–10 pip stops, creating an irresistible institutional magnet. Smart money sweeps through EQH/EQL with a sharp wick (Stop Hunt), absorbs liquidity, and triggers an explosive reversal.",
      options: [
        { optionText: "Because retail traders blindly enter 'Double Tops' or 'Double Bottoms' with tight stops, creating an irresistible liquidity magnet for smart money stop hunts.", isCorrect: true },
        { optionText: "Because algorithms never trade near double tops or double bottoms.", isCorrect: false },
        { optionText: "Because equal price points cause broker servers to freeze orders.", isCorrect: false },
        { optionText: "Because equal highs always guarantee that price will break out permanently into a massive rally.", isCorrect: false },
      ],
    },
    {
      questionText: "What is the non-negotiable rule when a rapid liquidity sweep wick is piercing through a level?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Warrior Rule (Class 02, Page 9 & 11): Never trade during the sweep wick. Wait until the candle closes back inside the zone, validating rejection.",
      options: [
        { optionText: "Execute market orders immediately while the wick is rapidly extending to catch the absolute lowest price.", isCorrect: false },
        { optionText: "Never trade during the sweep wick! Wait until the candle closes back inside the zone, validating rejection.", isCorrect: true },
        { optionText: "Place multiple market orders in the direction of the sweep breakout.", isCorrect: false },
        { optionText: "Widen your Stop Loss so you do not get stopped out during the sweep.", isCorrect: false },
      ],
    },
    {
      questionText: "How is 'Pure Liquidity' ('PL') engineered at an institutional Support level?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 02 (Page 10): When price tests support, pulls back, retests, sweeps through the prior swing low with a wick ('Liquidity taken'), and decisively closes green back above the support boundary—it forms Pure Liquidity ('PL'). Price then launches an explosive rally without looking back!",
      options: [
        { optionText: "Price cleanly breaks support and continues downward without making any lower wicks.", isCorrect: false },
        { optionText: "Price tests support, sweeps through the prior swing low with a wick ('Liquidity taken'), and decisively closes green back above the support boundary.", isCorrect: true },
        { optionText: "Price stays compressed in a 2-pip tight range for 12 hours.", isCorrect: false },
        { optionText: "Price touches the 200-period Exponential Moving Average on the 1-hour chart.", isCorrect: false },
      ],
    },
    {
      questionText: "In the Sell-Side Pure Liquidity ('SPL') short execution setup (1:5+ R:R), where is the hard Stop Loss strictly positioned?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 02 Master Case Study (Page 11): Short entry is executed upon breakdown below the rejection candle, with hard SL strictly set 2–3 pips above the SPL sweep wick.",
      options: [
        { optionText: "Strictly set 2–3 pips above the extreme SPL sweep wick.", isCorrect: true },
        { optionText: "50 pips above the nearest institutional moving average.", isCorrect: false },
        { optionText: "Exactly at the entry price as soon as the trade opens.", isCorrect: false },
        { optionText: "No Stop Loss is required because downtrends never reverse.", isCorrect: false },
      ],
    },
    {
      questionText: "In Class 03 (10 Entry Confirmations), what is the primary mechanical execution trigger for a Buy setup?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 03 (Page 12 & 13): Step 07 Confirmation is 'Candle High/Low Break / COC Level'. For Buy setups, the rejection candle's High must break ('H Break'). This confirms immediate micro Change of Character (COC) and is the primary mechanical execution trigger of the course!",
      options: [
        { optionText: "'H Break' (High Break): The candle following the rejection candle breaks above the rejection candle's High, confirming micro Change of Character (COC).", isCorrect: true },
        { optionText: "A green candle touching the lower Bollinger Band on the 5-minute chart.", isCorrect: false },
        { optionText: "Price breaking below the prior swing low to establish a lower low.", isCorrect: false },
        { optionText: "RSI crossing above the 70 overbought threshold.", isCorrect: false },
      ],
    },
    {
      questionText: "What is the Warrior Mandate if 9 out of 10 confirmations are present, but a single rule is missing (such as no 'H Break' or R:R is below 1:2)?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 03 Important Warning (Page 12): If 9 out of 10 confirmations are present but a single rule is missing (such as 'H Break / COC' or minimum 1:2 R:R), DO NOT execute the trade! Discipline requires complete 10/10 mechanical alignment.",
      options: [
        { optionText: "Take the trade anyway with half your standard lot size.", isCorrect: false },
        { optionText: "DO NOT execute the trade! Stand aside; discipline strictly requires complete 10/10 mechanical alignment.", isCorrect: true },
        { optionText: "Enter the trade immediately and pray that the 10th confirmation appears later.", isCorrect: false },
        { optionText: "Widen your Stop Loss backwards to manually force a 1:2 ratio.", isCorrect: false },
      ],
    },
    {
      questionText: "Under the 2% Money Management Rule, what is the maximum permissible monetary risk on a $200 account for any single trade?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Money Management (Page 16): On a $200 account, the 2% Risk Rule dictates: $200 * 2% = $4.00 maximum monetary risk! Risking $20 or $50 per trade causes a normal 4–5 trade losing streak to permanently wipe out the account.",
      options: [
        { optionText: "$20.00 (10% of total capital)", isCorrect: false },
        { optionText: "$10.00 (5% of total capital)", isCorrect: false },
        { optionText: "$4.00 (2% of total capital)", isCorrect: true },
        { optionText: "$50.00 (25% of total capital)", isCorrect: false },
      ],
    },
    {
      questionText: "What is the exact mathematical formula to calculate the correct Lot Size for every trade setup?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Money Management Formula (Page 16): Lot Size = (Account Balance * Risk %) / (Stop Loss in Pips * Pip Value). Position sizing must always adapt mathematically to the technical chart distance!",
      options: [
        { optionText: "Lot Size = (Account Balance * Risk %) / (Stop Loss in Pips * Pip Value)", isCorrect: true },
        { optionText: "Lot Size = Account Balance / 100", isCorrect: false },
        { optionText: "Lot Size = Stop Loss in Pips * Account Leverage", isCorrect: false },
        { optionText: "Lot Size = Free Margin * 0.10", isCorrect: false },
      ],
    },
    {
      questionText: "According to the Risk:Reward Mathematics table, why is a minimum 1:2 or 1:3 R:R vital for long-term consistency?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Money Management & Win Rate Reality (Page 16): With a 1:2 R:R, breakeven is only 33.3%, making you profitable even at a modest 40% win rate. At 1:3 R:R (the Warrior Benchmark), a single win covers 3 consecutive losses!",
      options: [
        { optionText: "Because at 1:2 R:R, you are profitable even at a modest 40% win rate, and at 1:3 R:R, a single winning trade covers 3 consecutive losses.", isCorrect: true },
        { optionText: "Because brokers only allow orders that target double the risk.", isCorrect: false },
        { optionText: "Because 1:1 risk-to-reward setups require a 100% win rate to survive.", isCorrect: false },
        { optionText: "Because higher risk:reward setups eliminate spread costs completely.", isCorrect: false },
      ],
    },
    {
      questionText: "In Class 05 (10 Fatal Pitfalls), what are the prescribed Warrior solutions for Overtrading and Revenge Trading?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "Class 05 (Page 15): For Overtrading: Limit trading to a maximum of 1–2 A+ setups per day. For Revenge Trading: Shut down charts after a loss and take a walk; never double lot sizes angrily.",
      options: [
        { optionText: "Limit trading strictly to 1–2 A+ setups per day, and after taking a loss, immediately shut down the charts and take a walk.", isCorrect: true },
        { optionText: "Take 10–15 setups daily and double lot sizes aggressively after every loss to recover drawdowns.", isCorrect: false },
        { optionText: "Switch to 5-second charts and trade continuously until the loss is recovered.", isCorrect: false },
        { optionText: "Remove stop losses completely so trades never exit at a loss.", isCorrect: false },
      ],
    },
    {
      questionText: "What is the sacred Trade Warrior Mindset recited on the final page of the master course handbook?",
      questionType: "SINGLE_CHOICE" as const,
      marks: 5,
      explanation: "The Trade Warrior Mindset (Page 18): 'Do not predict every move. Map the level. Wait for liquidity. Wait for confirmation. Control the risk. Execute only when your rules align.' Trading is a high-probability business of asymmetric risk management.",
      options: [
        { optionText: "'Do not predict every move. Map the level. Wait for liquidity. Wait for confirmation. Control the risk. Execute only when your rules align.'", isCorrect: true },
        { optionText: "'Predict every swing top and bottom, trade every 1-minute candle, and maximize leverage.'", isCorrect: false },
        { optionText: "'Follow Telegram signals blindly and rely on indicators to determine when to buy and sell.'", isCorrect: false },
        { optionText: "'Trading is 90% technical analysis and 10% psychological discipline.'", isCorrect: false },
      ],
    },
  ];

  console.log(`Creating/Updating Quiz with ${questionsData.length} comprehensive questions...`);

  let quizId = quizLesson.quiz?.id;
  if (quizLesson.quiz) {
    await prod.quiz.update({
      where: { id: quizLesson.quiz.id },
      data: {
        title: "Super Warrior 30 – Master Trading Quiz (Classes 01 to 05)",
        description: "Comprehensive 20-question master assessment covering Pure Price Action, Support & Resistance Hierarchy (Weak vs Strong vs 2X Strong), Liquidity Sweeps, Pure Liquidity (PL & SPL), 10 Entry Confirmations ('H Break' / COC), 10 Pillars of Trading Psychology, 10 Fatal Mistakes, and the 2% Money Management Rule.",
        passingPercentage: 70,
        timeLimitMinutes: 25,
        maxAttempts: 5,
        showAnswers: "IMMEDIATELY",
        shuffleQuestions: false,
        shuffleOptions: false,
        isPublished: true,
      },
    });
  } else {
    const newQuiz = await prod.quiz.create({
      data: {
        lessonId: quizLesson.id,
        title: "Super Warrior 30 – Master Trading Quiz (Classes 01 to 05)",
        description: "Comprehensive 20-question master assessment covering Pure Price Action, Support & Resistance Hierarchy (Weak vs Strong vs 2X Strong), Liquidity Sweeps, Pure Liquidity (PL & SPL), 10 Entry Confirmations ('H Break' / COC), 10 Pillars of Trading Psychology, 10 Fatal Mistakes, and the 2% Money Management Rule.",
        passingPercentage: 70,
        timeLimitMinutes: 25,
        maxAttempts: 5,
        showAnswers: "IMMEDIATELY",
        shuffleQuestions: false,
        shuffleOptions: false,
        isPublished: true,
        isTestData: false,
      },
    });
    quizId = newQuiz.id;
  }

  // Insert questions and options sequentially
  for (let i = 0; i < questionsData.length; i++) {
    const q = questionsData[i];
    await prod.quizQuestion.create({
      data: {
        quizId: quizId!,
        questionText: q.questionText,
        questionType: q.questionType,
        marks: q.marks,
        explanation: q.explanation,
        sortOrder: i,
        options: {
          create: q.options.map((opt, optIdx) => ({
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            sortOrder: optIdx,
          })),
        },
      },
    });
  }

  console.log(`✅ Successfully added 20 questions to Quiz (Total: 100 Marks, Passing: 70%).`);

  // 3. Update Homework / Assignment
  console.log(`\n📙 Updating Homework Lesson: ${homeworkLesson.id}`);
  await prod.lesson.update({
    where: { id: homeworkLesson.id },
    data: {
      title: "Super Warrior 30 – Practice Lab & 10-Point Pre-Trade Assignment",
      isPublished: true,
    },
  });

  // Delete old test submissions
  if (homeworkLesson.homework) {
    console.log("Cleaning up old test homework submissions...");
    await prod.homeworkSubmission.deleteMany({
      where: { homeworkId: homeworkLesson.homework.id },
    });
  }

  const homeworkInstructions = `# Super Warrior 30: Practice Lab & 10-Point Pre-Trade Assignment

> **Core Objective:** Translate conceptual understanding from Classes 01 to 05 into instinctive chart-reading proficiency, institutional liquidity awareness, and disciplined execution habits.

---

## Part 1: 10-Step Chart Practice Homework (Practice Lab)

Open your charting platform (TradingView / MT5). We recommend using **Gold (XAUUSD)** or major Forex pairs (EURUSD, GBPUSD), adhering strictly to the **Higher Timeframe (1D / 4H / 1H)** and **Lower Timeframe (5M / 1M)** workflow:

1. **10 Significant Swings:** Identify and mark the last **10 significant swing highs and swing lows** across recent price action. *(Remember: Do not mark minor 1-minute wicks; mark prominent, distinct 'V' or inverted 'V' shapes).*
2. **Major S&R Zones:** Mark **2–3 major horizontal Support and Resistance levels** based strictly on prominent swing pivots. Draw them as functional **zones** (not razor-thin lines).
3. **Level Categorization:** Categorize each level clearly on your chart:
   - Mark **'Week L' (Weak Level)**: Minor pauses that were easily sliced through.
   - Mark **'Strong L' (Strong Level)**: Validated levels with 15–25 pip displacements and clean wick rejections.
4. **Institutional Floors & Ceilings:**
   - Locate the **'2X strong L'** (The Institutional Floor where massive multi-session accumulation occurred).
   - Locate the **'Sell 2X Strong L'** (The Impenetrable Supply Ceiling / multi-day swing high).
5. **Liquidity Traps (EQH / EQL):** Identify any **Equal Highs (EQH)** or **Equal Lows (EQL)** where retail double tops/bottoms formed and were swept by smart money.
6. **Resting Liquidity Pools:** Highlight resting liquidity:
   - **Buy-Side Liquidity (BSL)** resting above swing highs/resistance.
   - **Sell-Side Liquidity (SSL)** resting below swing lows/support.
7. **Sweep Wick & Body Closure:** Locate a recent liquidity sweep. Verify that price swept the level with a wick and decisively closed with a solid body back **inside** the zone.
8. **Micro COC Trigger ('H Break' / 'L Break'):** Pinpoint the exact candle where:
   - For Buy setups: The next candle breaks the rejection candle's High (**'H Break'**).
   - For Sell setups: The next candle breaks the rejection candle's Low (**'L Break'**).
9. **Trade Parameters & Math:**
   - Pre-define **Entry**, **Stop Loss** (2–3 pips beyond the extreme sweep wick), and **Target** (minimum 1:2 or 1:3 R:R).
   - Calculate exact lot size using the **2% Risk Rule Formula**:
     $$\\text{Lot Size} = \\frac{\\text{Account Balance} \\times 2\\%}{\\text{Stop Loss in Pips} \\times \\text{Pip Value}}$$
10. **Trade Journal & Backtesting Catalog:** Document this setup in your trading journal and add it to your 20–30 trade backtesting catalog.

---

## Part 2: Interactive 10-Point Pre-Trade Checklist

Before submitting or taking any live/demo trade, verify that all 10 checkpoints pass:

| # | Verification Question | Required Execution Condition | Checked? |
|---|---|---|:---:|
| **01** | **Is the Trend Validated?** | Higher timeframe structure displays unambiguous HH/HL (Bullish) or LH/LL (Bearish). Strictly avoid counter-trend positioning. | [x] |
| **02** | **Is Price at a Key S/R Zone?** | Price is resting directly at a pre-marked Strong Level ('Strong L') or 2X Strong zone. Never execute in No-Man's Land. | [x] |
| **03** | **Did Obvious Liquidity Get Swept?** | Resting stop liquidity (BSL or SSL) above/below a prominent swing has been swept. No Sweep = NO ENTRY. | [x] |
| **04** | **Did Price Reclaim the Level?** | Price rejected the sweep and closed with a solid body back inside the zone. Never trade during the sweep wick. | [x] |
| **05** | **Is Candlestick Confirmation Present?** | Clear rejection wick and strong opposing candle body confirmed on close. | [x] |
| **06** | **Did 'H Break' / 'L Break' (COC) Trigger?** | The confirmation candle's High (Buy) or Low (Sell) broke, confirming micro Change of Character. | [x] |
| **07** | **Is Logical Stop Loss Placed?** | Hard SL is placed safely 2–3 pips beyond the extreme sweep wick. Never widen or move SL backward! | [x] |
| **08** | **Is Risk:Reward at Least 1:2?** | Potential take profit target provides at least twice the monetary risk distance (1:2 or 1:3+). | [x] |
| **09** | **Is Position Within the 2% Rule?** | Calculated lot size risks maximum 2% of total account capital. Capital preservation is priority #1. | [x] |
| **10** | **Am I Calm, Disciplined & FOMO-Free?** | Zero revenge, zero greed, zero panic — 100% mechanical, rule-based execution. | [x] |

> ⚠️ **CRITICAL WARRIOR WARNING:**
> If **9 out of 10** confirmations are present but even **a single rule is missing** (such as no 'H Break' or R:R is less than 1:2), **DO NOT TAKE THE TRADE!** Choosing not to trade is a profitable decision.

---

## Part 3: What You Must Submit

To successfully complete this assignment, provide:
1. **Chart Screenshot(s):** Upload 1 to 3 clear screenshots of your chart (TradingView/MT5) showing:
   - Your marked Support / Resistance zones ('Strong L' vs 'Week L').
   - The liquidity sweep wick and candlestick close back inside the zone.
   - The 'H Break' or 'L Break' entry trigger line.
   - Your Stop Loss and Take Profit levels with Risk:Reward marked.
2. **Trade Breakdown (Text Answer):**
   - Currency Pair / Asset (e.g. XAUUSD Gold).
   - Higher Timeframe Trend Bias (Bullish / Bearish).
   - Confirmation that all 10 checklist items were verified.
   - Your account size, calculated Stop Loss in pips, and mathematical lot size using the 2% rule.

---

### The Trade Warrior Mindset
> *"Do not predict every move. Map the level. Wait for liquidity. Wait for confirmation. Control the risk. Execute only when your rules align."*
`;

  const attachedPdf = [
    {
      mediaId: "cmtpu8y9o000204lao3hm23ew",
      title: "Super Warrior 30 Master Course PDF (English)",
      type: "PDF",
      url: "https://sw30-production-storage-cdn.b-cdn.net/media/pdf/asset_1788700758396_ivipk.pdf?token=3Kkyf4neOBMGcePVyf9GAq6ZctH4ErvWTQmn2sn6nqw&expires=1788704369",
      size: 3727700,
    },
  ];

  if (homeworkLesson.homework) {
    await prod.homework.update({
      where: { id: homeworkLesson.homework.id },
      data: {
        title: "Super Warrior 30: 10-Step Chart Practice Lab & 10-Point Pre-Trade Checklist",
        description: "Comprehensive 10-Step Chart Practice Homework & Pre-Trade Audit for Gold (XAUUSD) & Forex as detailed in Class 01–05 Master Course Handbook.",
        instructions: homeworkInstructions,
        totalMarks: 100,
        passingMarks: 70,
        deadline: null,
        allowLateSubmission: true,
        maxAttempts: 5,
        status: "PUBLISHED",
        attachedMediaIds: attachedPdf,
        isTestData: false,
      },
    });
  } else {
    await prod.homework.create({
      data: {
        lessonId: homeworkLesson.id,
        title: "Super Warrior 30: 10-Step Chart Practice Lab & 10-Point Pre-Trade Checklist",
        description: "Comprehensive 10-Step Chart Practice Homework & Pre-Trade Audit for Gold (XAUUSD) & Forex as detailed in Class 01–05 Master Course Handbook.",
        instructions: homeworkInstructions,
        totalMarks: 100,
        passingMarks: 70,
        deadline: null,
        allowLateSubmission: true,
        maxAttempts: 5,
        status: "PUBLISHED",
        attachedMediaIds: attachedPdf,
        isTestData: false,
      },
    });
  }

  console.log("✅ Successfully updated Homework / Assignment with complete 10-Step practice lab & 10-point checklist.");

  await prod.$disconnect();
}

populateQuizAndHomework().catch((err) => {
  console.error("❌ Error updating quiz and homework:", err);
  process.exit(1);
});
