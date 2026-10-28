import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const assetLinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.rahultradewarrior.app",
        sha256_cert_fingerprints: [
          "BD:4F:6E:42:28:F8:E2:A8:D3:60:07:B2:09:A9:75:54:B6:E9:46:37:F0:9E:65:8B:A5:63:9C:83:E7:F0:CA:9E",
        ],
      },
    },
  ];

  return NextResponse.json(assetLinks, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
