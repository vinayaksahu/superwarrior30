import { redirect } from "next/navigation";

export default function DashboardOrdersRedirect() {
  redirect("/orders");
}
