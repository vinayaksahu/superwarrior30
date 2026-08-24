import type { Metadata } from "next";
import { getStudentWalletAction } from "@/server/actions/wallet.actions";
import { StudentWalletClient } from "@/components/student/student-wallet-client";

export const metadata: Metadata = {
  title: "My Wallet & Payouts",
};

export default async function StudentWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");

  const data = await getStudentWalletAction({ page });

  return (
    <StudentWalletClient
      wallet={data.wallet}
      activeWithdrawals={data.activeWithdrawals}
      transactions={data.transactions}
      totalTransactions={data.totalTransactions}
      page={data.page}
      totalPages={data.totalPages}
    />
  );
}
