import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { fetchCompanySchedule } from "@/lib/company-data";
import ScheduleTableClient from "@/app/company/dashboard/ScheduleTableClient";
import { Building2, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PanelistDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "panelist") {
    redirect("/");
  }

  // 1. Get panelist details and company info
  const panelistRes = await query(
    `SELECT p.id as panelist_id, p.panel_number, c.name as company_name, c.logo_url, p.company_id
     FROM panelists p
     JOIN companies c ON p.company_id = c.id
     WHERE p.user_id = $1`,
    [session.user.id]
  );

  if (panelistRes.rowCount === 0) {
    return (
      <div className="p-8 text-center text-[#002454]/60 font-bold bg-white rounded-3xl border border-red-200">
        No panelist profile found for your account. Please contact the administrator.
      </div>
    );
  }

  const panelist = panelistRes.rows[0];

  // 2. Fetch interview schedule for panelist's company
  const scheduleCandidates = await fetchCompanySchedule(panelist.company_id);

  const totalCandidateCount = scheduleCandidates.length;
  const totalInterviewedCount = scheduleCandidates.filter((c: any) => c.is_interviewed).length;

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Welcome & Panel Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#002454] to-[#0d3b66] p-8 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
          <Building2 size={240} />
        </div>
        <div className="relative z-10">
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#f6c430]">
            Panelist Dashboard
          </span>
          <h1 className="text-3xl font-extrabold mt-1">
            Panel #{panelist.panel_number || 1} — {panelist.company_name}
          </h1>
          <p className="text-[#33aeda] font-semibold text-sm mt-1">
            Conducting mock interviews & candidate evaluations for {panelist.company_name}
          </p>
        </div>
        {panelist.logo_url && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center justify-center relative z-10 h-16 w-32 shadow-inner">
            <img
              src={panelist.logo_url}
              alt={panelist.company_name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Total Applicants
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#002454]">
              {totalCandidateCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#33aeda]/10 text-[#1688b2]">
            <Building2 size={24} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#002454]/10 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#002454]/50">
              Total Interviewed
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">
              {totalInterviewedCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Interview Schedule Table */}
      <div className="flex flex-col gap-6">
        <div className="border-b border-[#002454]/10 pb-4">
          <h2 className="text-xl font-extrabold text-[#002454]">
            Interview Schedule
          </h2>
          <p className="text-xs text-[#002454]/60 mt-0.5">
            Assigned interview times for {panelist.company_name}, ordered by schedule.
          </p>
        </div>

        <div className="flex flex-col gap-8 w-full">
          <ScheduleTableClient
            candidates={scheduleCandidates}
            companyName={panelist.company_name}
            showEvaluate={true}
          />
        </div>
      </div>
    </div>
  );
}
