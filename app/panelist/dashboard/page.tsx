import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { fetchCompanyCandidates, fetchCompanySchedule } from "@/lib/company-data";
import ScheduleTableClient from "@/app/company/dashboard/ScheduleTableClient";
import PreferenceTableClient from "@/app/company/dashboard/PreferenceTableClient";
import { Building2, Calendar, CheckCircle, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PanelistDashboardPage(props: {
  searchParams: Promise<{ view?: string }>;
}) {
  const searchParams = await props.searchParams;
  const viewMode = searchParams.view || "schedule"; // 'schedule' (default) | 'all'
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

  // 2. Fetch interview schedule & all preferred candidates for panelist's company
  const [scheduleCandidates, companyCandidates] = await Promise.all([
    fetchCompanySchedule(panelist.company_id),
    fetchCompanyCandidates(panelist.company_id),
  ]);

  const activeCandidates =
    viewMode === "all" ? companyCandidates.unitedCandidates : scheduleCandidates;
  const totalCandidateCount = activeCandidates.length;
  const totalInterviewedCount = activeCandidates.filter((c: any) => c.is_interviewed).length;

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
              {viewMode === "all" ? "Total Applicants" : "Total Scheduled"}
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

      {/* Candidate Tables Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#002454]/10 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#002454]">
              {viewMode === "all" ? "All Preferred Candidates" : "Interview Schedule"}
            </h2>
            <p className="text-xs text-[#002454]/60 mt-0.5">
              {viewMode === "all"
                ? `All candidates who selected ${panelist.company_name} in any preference and time slot.`
                : `Assigned interview times for ${panelist.company_name}, ordered by schedule.`}
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#f8fcfe] border border-[#002454]/10 p-1 rounded-xl">
            <Link
              href="/panelist/dashboard?view=schedule"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "schedule"
                  ? "bg-[#002454] text-white shadow-sm"
                  : "text-[#002454]/60 hover:text-[#002454]"
              }`}
            >
              <Calendar size={13} /> Interview Schedule
            </Link>
            <Link
              href="/panelist/dashboard?view=all"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "all"
                  ? "bg-[#002454] text-white shadow-sm"
                  : "text-[#002454]/60 hover:text-[#002454]"
              }`}
            >
              <Users size={13} /> All Preferred Candidates
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-8 w-full">
          {viewMode === "all" ? (
            <PreferenceTableClient
              title="All Preferred Candidates"
              subtitle={`Candidates who selected ${panelist.company_name} in any preference or time slot`}
              candidates={companyCandidates.unitedCandidates}
              showPrefBadge={false}
              showEvaluate={true}
              showSlotFilter={true}
            />
          ) : (
            <ScheduleTableClient
              candidates={scheduleCandidates}
              companyName={panelist.company_name}
              showEvaluate={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
