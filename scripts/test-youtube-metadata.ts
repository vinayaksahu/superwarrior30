import {
  extractYouTubeVideoId,
  parseIsoDuration,
  fetchYouTubeMetadata,
} from "../src/lib/youtube-trades/youtube-metadata";

async function runMetadataTests() {
  console.log("=== RUNNING YOUTUBE METADATA & URL RESOLUTION TESTS ===\n");

  // Test 1: Video ID Extraction
  const urlTests = [
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { url: "https://www.youtube.com/live/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { url: "https://youtu.be/dQw4w9WgXcQ?si=abc123xyz", expected: "dQw4w9WgXcQ" },
    { url: "https://www.youtube.com/embed/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { url: "dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
    { url: "https://example.com/not-youtube", expected: null },
  ];

  let passedUrls = 0;
  for (const { url, expected } of urlTests) {
    const id = extractYouTubeVideoId(url);
    if (id === expected) {
      console.log(`✓ ID Extracted correctly: "${url}" -> ${id}`);
      passedUrls++;
    } else {
      console.error(`✗ ID Extraction failed for "${url}": got ${id}, expected ${expected}`);
    }
  }

  // Test 2: ISO Duration Parser
  const durationTests = [
    { iso: "PT1H30M15S", expected: 5415 },
    { iso: "PT45M", expected: 2700 },
    { iso: "PT2M30S", expected: 150 },
    { iso: "PT59S", expected: 59 },
  ];

  let passedDurations = 0;
  for (const { iso, expected } of durationTests) {
    const secs = parseIsoDuration(iso);
    if (secs === expected) {
      console.log(`✓ Duration parsed correctly: ${iso} -> ${secs}s`);
      passedDurations++;
    } else {
      console.error(`✗ Duration failed: ${iso}: got ${secs}, expected ${expected}`);
    }
  }

  // Test 3: Live metadata fetch via oEmbed
  console.log("\nTesting live oEmbed fetch for a known YouTube video (dQw4w9WgXcQ)...");
  try {
    const meta = await fetchYouTubeMetadata("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    console.log("✓ Live Metadata Fetched Successfully:");
    console.log(`  - Title: ${meta.title}`);
    console.log(`  - Channel: ${meta.channel}`);
    console.log(`  - Thumbnail: ${meta.thumbnail}`);
    console.log(`  - Canonical URL: ${meta.canonicalUrl}`);
  } catch (err: any) {
    console.error("✗ Live Metadata Fetch error:", err.message);
  }

  console.log("\n=== METADATA ENGINE TEST SUMMARY ===");
  console.log(`URLs Passed: ${passedUrls}/${urlTests.length}`);
  console.log(`Durations Passed: ${passedDurations}/${durationTests.length}`);
}

runMetadataTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
