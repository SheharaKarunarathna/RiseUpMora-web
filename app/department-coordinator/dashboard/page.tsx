import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { BookOpen, Users } from "lucide-react";
import DepartmentDashboardClient from "./DepartmentDashboardClient";

export const dynamic = "force-dynamic";

export default async function DepartmentDashboardOverview() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "department_coordinator") {
    redirect("/");
  }

  let department = "Unknown Department";
  let candidates: any[] = [];

  try {
    // 1. Get coordinator's department
    const deptRes = await query(
      `SELECT department
       FROM department_coordinators
       WHERE user_id = $1`,
      [session.user.id]
    );

    if (deptRes.rowCount && deptRes.rowCount > 0) {
      department = deptRes.rows[0].department;

      // 2. Fetch all candidates for this department
      const candidatesRes = await query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         WHERE c.department = $1
         ORDER BY c.created_at DESC`,
        [department]
      );

      candidates = candidatesRes.rows;
    }
  } catch (error) {
    console.error("Error loading department dashboard data:", error);
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Welcome & Department Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#002454] to-[#0d3b66] p-8 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
          <BookOpen size={240} />
        </div>
        <div className="relative z-10">
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#f6c430]">
            Department Overview
          </span>
          <h1 className="text-3xl font-extrabold mt-1">
            Welcome back, {session.user.name || "Coordinator"}
          </h1>
          <p className="text-[#33aeda] font-semibold text-sm mt-1">
            Managing candidates for {department}
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between transition-all hover:translate-y-[-2px] hover:shadow-md">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Total Candidates
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#002454]">
              {candidates.length}
            </p>
          </div>
          <div className="p-3 bg-[#33aeda]/10 text-[#1688b2] rounded-xl">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Main Dashboard Section (Client Component) */}
      <div className="w-full">
        <DepartmentDashboardClient initialCandidates={candidates} department={department} />
      </div>
    </div>
  );
}
