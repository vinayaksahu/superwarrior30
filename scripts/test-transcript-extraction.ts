import {
  formatTimeCode,
  parseTimedTextXml,
  parseTimedTextJson3,
  formatTranscriptWithTimestamps,
  extractYouTubeCaptions,
} from "../src/lib/youtube-trades/transcript-extractor";

async function runTests() {
  console.log("=== Testing Transcript Extractor ===");

  // 1. Timecode formatting
  console.log("\n1. Testing formatTimeCode:");
  const tc1 = formatTimeCode(0);
  const tc2 = formatTimeCode(65);
  const tc3 = formatTimeCode(3665);
  console.log(`0s -> ${tc1} (expected: 00:00:00)`);
  console.log(`65s -> ${tc2} (expected: 00:01:05)`);
  console.log(`3665s -> ${tc3} (expected: 01:01:05)`);

  if (tc1 !== "00:00:00" || tc2 !== "00:01:05" || tc3 !== "01:01:05") {
    throw new Error("formatTimeCode failed!");
  }
  console.log("✓ formatTimeCode passed");

  // 2. XML Parsing with HTML entities
  console.log("\n2. Testing parseTimedTextXml:");
  const sampleXml = `
    <transcript>
      <text start="10.5" dur="3.2">Hello &amp; welcome to &quot;Rahul Trade Warrior&quot;</text>
      <text start="14.0" dur="2.5">Bank Nifty&#39;s liquidity sweep at Asian Low</text>
      <text start="17.2" dur="4.1">Break of structure &lt;BOS&gt; confirmed</text>
    </transcript>
  `;
  const xmlSegments = parseTimedTextXml(sampleXml);
  console.log(`Extracted ${xmlSegments.length} segments from XML:`);
  xmlSegments.forEach((s, idx) => {
    console.log(`  [${s.start}s - ${s.end}s] ${s.text}`);
  });

  if (xmlSegments.length !== 3) {
    throw new Error(`Expected 3 segments, got ${xmlSegments.length}`);
  }
  if (!xmlSegments[0].text.includes('Hello & welcome to "Rahul Trade Warrior"')) {
    throw new Error(`HTML entity decoding failed for segment 1: ${xmlSegments[0].text}`);
  }
  if (!xmlSegments[1].text.includes("Bank Nifty's liquidity sweep at Asian Low")) {
    throw new Error(`HTML entity decoding failed for segment 2: ${xmlSegments[1].text}`);
  }
  if (!xmlSegments[2].text.includes("Break of structure <BOS> confirmed")) {
    throw new Error(`HTML entity decoding failed for segment 3: ${xmlSegments[2].text}`);
  }
  console.log("✓ parseTimedTextXml passed");

  // 3. JSON3 Parsing
  console.log("\n3. Testing parseTimedTextJson3:");
  const sampleJson3 = {
    events: [
      {
        tStartMs: 5000,
        dDurationMs: 2500,
        segs: [{ utf8: "Yahan par liquidity grab hui hai" }],
      },
      {
        tStartMs: 8000,
        dDurationMs: 3000,
        segs: [{ utf8: "Green candle ka high break " }, { utf8: "hone par entry banegi" }],
      },
    ],
  };
  const jsonSegments = parseTimedTextJson3(sampleJson3);
  console.log(`Extracted ${jsonSegments.length} segments from JSON3:`);
  jsonSegments.forEach((s) => {
    console.log(`  [${s.start}s - ${s.end}s] ${s.text}`);
  });

  if (jsonSegments.length !== 2) {
    throw new Error(`Expected 2 segments from JSON3, got ${jsonSegments.length}`);
  }
  if (jsonSegments[1].text !== "Green candle ka high break hone par entry banegi") {
    throw new Error(`JSON segment merge failed: ${jsonSegments[1].text}`);
  }
  console.log("✓ parseTimedTextJson3 passed");

  // 4. Timestamped Transcript formatting
  console.log("\n4. Testing formatTranscriptWithTimestamps:");
  const formatted = formatTranscriptWithTimestamps(xmlSegments);
  console.log("Formatted output:\n" + formatted);
  if (!formatted.includes("[00:00:10] Hello & welcome to \"Rahul Trade Warrior\"")) {
    throw new Error("formatTranscriptWithTimestamps failed!");
  }
  console.log("✓ formatTranscriptWithTimestamps passed");

  console.log("\n==========================================");
  console.log("ALL TRANSCRIPT EXTRACTION UNIT TESTS PASSED!");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
