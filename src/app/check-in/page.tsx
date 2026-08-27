import type { Metadata } from "next";

import { CheckInConsole } from "@/components/check-in-console";
import { requireGateAdmin } from "@/lib/admin/auth";
import { getGateDashboard } from "@/lib/check-in/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Gate Check-in",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CheckInPage() {
  const admin = await requireGateAdmin();
  const dashboard = await getGateDashboard();
  return (
    <CheckInConsole
      initialDashboard={dashboard}
      staffName={admin.name}
      showAdminLink={admin.role === "super_admin"}
    />
  );
}
