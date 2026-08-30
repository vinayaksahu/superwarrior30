import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CashbacksRedirect() {
  redirect("/dashboard/cashbacks");
}
