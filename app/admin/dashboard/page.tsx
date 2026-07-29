import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardOverview() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    redirect("/admin/login");
  }

  let metrics = {
    totalUsers: 0,
    candidates: 0,
    cvsUploaded: 0,
    companyCoordinators: 0,
    deptCoordinators: 0,
    panelists: 0,
    companies: 0,
    interviewsScheduled: 0,
  };

  try {
    const [rolesResult, companiesResult, allocationsResult, cvsResult] = await Promise.all([
      query("SELECT role, COUNT(*) as count FROM users GROUP BY role"),
      query("SELECT COUNT(*) FROM companies"),
      query("SELECT COUNT(*) FROM allocations"),
      query("SELECT COUNT(*) as count FROM candidates WHERE cv_url IS NOT NULL AND cv_url != ''")
    ]);

    let totalUsers = 0;
    rolesResult.rows.forEach((row) => {
      const count = parseInt(row.count);
      totalUsers += count;
      if (row.role === "candidate") metrics.candidates = count;
      else if (row.role === "company_coordinator") metrics.companyCoordinators = count;
      else if (row.role === "department_coordinator") metrics.deptCoordinators = count;
      else if (row.role === "panelist") metrics.panelists = count;
    });

    metrics.totalUsers = totalUsers;
    metrics.cvsUploaded = parseInt(cvsResult.rows[0].count);
    metrics.companies = parseInt(companiesResult.rows[0].count);
    metrics.interviewsScheduled = parseInt(allocationsResult.rows[0].count);
  } catch (error) {
    console.error("Error fetching stats:", error);
  }

  return <DashboardClient metrics={metrics} />;
}
