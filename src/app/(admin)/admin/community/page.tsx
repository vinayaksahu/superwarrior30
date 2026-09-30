import { redirect } from "next/navigation";

export default function AdminCommunityPage() {
  redirect("/admin/broker-offers?tab=CLAIMS");
}
