import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminCommunityPage() {
  redirect("/admin/broker-offers?tab=CLAIMS");
}
