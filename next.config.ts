import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://iframe.mediadelivery.net https://cdnjs.cloudflare.com;
  worker-src 'self' blob: https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://*.b-cdn.net https://*.bunnycdn.com https://*.r2.cloudflarestorage.com https://api.qrserver.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' blob: data: https://video.bunnycdn.com https://*.b-cdn.net https://*.bunnycdn.com https://*.mediadelivery.net https://api.razorpay.com https://checkout.razorpay.com https://*.upstash.io https://cdnjs.cloudflare.com;
  media-src 'self' blob: data: https://*.b-cdn.net https://*.bunnycdn.com https://*.mediadelivery.net;
  frame-src 'self' blob: data: https://iframe.mediadelivery.net https://*.mediadelivery.net https://checkout.razorpay.com https://api.razorpay.com;
  object-src 'self' blob: data:;
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
