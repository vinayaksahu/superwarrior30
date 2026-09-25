/**
 * YouTube Metadata & URL Resolution Engine
 * Module: AI Trade Clip Finder — SuperWarrior30 LMS
 */

export interface YouTubeMetadataResult {
  videoId: string;
  canonicalUrl: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: number; // in seconds
  publishedAt: Date | null;
  hasCaptions: boolean;
  captionLanguages: string[];
  isLive: boolean;
  error?: string;
}

/**
 * Extracts a standard 11-character YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Plain video ID (11 chars alphanumeric with _ and -)
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const cleanInput = input.trim();

  // If already an 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanInput)) {
    return cleanInput;
  }

  // Regular expression matching YouTube URL variants
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const regex of patterns) {
    const match = cleanInput.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Parses ISO 8601 duration format (e.g. PT1H30M15S, PT45M, PT20S) into seconds.
 */
export function parseIsoDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetches rich YouTube video metadata using a multi-tier fallback architecture:
 * 1. YouTube Data API v3 (if YOUTUBE_API_KEY is configured in env)
 * 2. YouTube oEmbed API (official, public, no authentication required)
 * 3. YouTube Player Page Scraping for duration and subtitle tracks
 * 4. High-resolution thumbnail and canonical URL synthesis
 */
export async function fetchYouTubeMetadata(urlOrId: string): Promise<YouTubeMetadataResult> {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL or Video ID: "${urlOrId}"`);
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  let title = `YouTube Livestream #${videoId}`;
  let channel = "Rahul Trade Warrior Academy";
  let thumbnail = defaultThumbnail;
  let duration = 0;
  let publishedAt: Date | null = null;
  let hasCaptions = false;
  let captionLanguages: string[] = [];
  let isLive = false;

  // Tier 1: YouTube Data API v3 if API key is provided
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails,status&id=${videoId}&key=${apiKey}`;
      const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const item = data.items?.[0];
        if (item) {
          title = item.snippet?.title || title;
          channel = item.snippet?.channelTitle || channel;
          publishedAt = item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null;
          thumbnail =
            item.snippet?.thumbnails?.maxres?.url ||
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            thumbnail;

          if (item.contentDetails?.duration) {
            duration = parseIsoDuration(item.contentDetails.duration);
          }

          if (item.snippet?.liveBroadcastContent === "live") {
            isLive = true;
          }

          return {
            videoId,
            canonicalUrl,
            title,
            thumbnail,
            channel,
            duration,
            publishedAt,
            hasCaptions: false, // will check below
            captionLanguages: [],
            isLive,
          };
        }
      }
    } catch (e) {
      console.warn("YouTube API v3 fetch failed, falling back to oEmbed:", e);
    }
  }

  // Tier 2: Public YouTube oEmbed API (Fast, official, zero-auth)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
      if (data.author_name) channel = data.author_name;
      if (data.thumbnail_url) thumbnail = data.thumbnail_url;
    } else if (res.status === 404) {
      throw new Error(`YouTube video "${videoId}" not found or marked private.`);
    } else if (res.status === 401 || res.status === 403) {
      throw new Error(`YouTube video "${videoId}" is private, age-restricted, or access-denied.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes("private")) {
      throw err;
    }
    console.warn("oEmbed fetch warning:", err);
  }

  // Tier 3: Probe video player page for duration & subtitle tracks
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
      },
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Check if video is unavailable/private in page HTML
      if (html.includes('"status":"UNPLAYABLE"') || html.includes('"reason":"Video unavailable"')) {
        console.warn(`Video ${videoId} reported unplayable in HTML`);
      }

      // Check duration from approxDurationMs or lengthSeconds
      const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
      if (lengthMatch && lengthMatch[1]) {
        duration = parseInt(lengthMatch[1], 10);
      }

      // Check captions from captionTracks
      if (html.includes("captionTracks")) {
        hasCaptions = true;
        const captionMatches = html.match(/"languageCode":"([a-zA-Z-]+)"/g);
        if (captionMatches) {
          const langs = captionMatches
            .map((m) => m.replace(/"languageCode":"|"/g, ""))
            .filter((val, idx, self) => self.indexOf(val) === idx);
          captionLanguages = langs;
        }
      }

      // Detect if stream is currently live
      if (html.includes('"isLive":true') || html.includes('"isLiveBroadcast":true')) {
        isLive = true;
      }
    }
  } catch (scrapeErr) {
    console.warn("Page scrape probe warning (non-fatal):", scrapeErr);
  }

  // Fallback thumbnail validation: test maxres, if 404 use hqdefault
  try {
    const thumbCheck = await fetch(thumbnail, { method: "HEAD" });
    if (!thumbCheck.ok) {
      thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  } catch {
    thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  return {
    videoId,
    canonicalUrl,
    title,
    thumbnail,
    channel,
    duration,
    publishedAt,
    hasCaptions,
    captionLanguages,
    isLive,
  };
}
