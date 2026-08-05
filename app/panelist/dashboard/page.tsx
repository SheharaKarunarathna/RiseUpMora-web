import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { fetchCompanyCandidates } from "@/lib/company-data";
import PreferenceTableClient from "@/app/company/dashboard/PreferenceTableClient";
import { Building2, CheckCircle, Clock, Layers } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PanelistDashboardPage(props: {
  searchParams: Promise<{ view?: string }>;
}) {
  const searchParams = await props.searchParams;
  const viewMode = searchParams.view || "timeslot";
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

  // 2. Fetch candidate application tables for panelist's company
  const {
    slot1Candidates,
    slot2Candidates,
    slot3Candidates,
    slot4Candidates,
    unassignedCandidates,
    pref1Candidates,
    pref2Candidates,
    pref3Candidates,
    pref4Candidates,
    totalCandidateCount,
  } = await fetchCompanyCandidates(panelist.company_id);

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
              Total Company Applicants
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
              1st Preference Applicants
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">
              {pref1Candidates.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Candidate Application Tables Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#002454]/10 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#002454]">
              Candidate Applications for {panelist.company_name}
            </h2>
            <p className="text-xs text-[#002454]/60">
              Candidates sorted by preference and application time. Use actions to evaluate candidates and mark interview status.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#f8fcfe] border border-[#002454]/10 p-1 rounded-xl">
            <Link
              href="/panelist/dashboard?view=timeslot"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "timeslot"
                  ? "bg-[#002454] text-white shadow-sm"
                  : "text-[#002454]/60 hover:text-[#002454]"
              }`}
            >
              <Clock size={13} /> 4 Time Slot Tables
            </Link>
            <Link
              href="/panelist/dashboard?view=preference"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "preference"
                  ? "bg-[#002454] text-white shadow-sm"
                  : "text-[#002454]/60 hover:text-[#002454]"
              }`}
            >
              <Layers size={13} /> 4 Preference Tables
            </Link>
          </div>
        </div>

        {viewMode === "timeslot" ? (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-8 w-full">
              <PreferenceTableClient
                title="Slot 1 (10:00 AM – 11:00 AM)"
                subtitle="Candidates who selected Time Slot 1 (Pref 1 priority, then FCFS)"
                candidates={slot1Candidates}
                slotNum={1}
                showPrefBadge={true}
                showEvaluate={true}
              />
              <PreferenceTableClient
                title="Slot 2 (11:00 AM – 12:00 PM)"
                subtitle="Candidates who selected Time Slot 2 (Pref 1 priority, then FCFS)"
                candidates={slot2Candidates}
                slotNum={2}
                showPrefBadge={true}
                showEvaluate={true}
              />
              <PreferenceTableClient
                title="Slot 3 (1:30 PM – 2:30 PM)"
                subtitle="Candidates who selected Time Slot 3 (Pref 1 priority, then FCFS)"
                candidates={slot3Candidates}
                slotNum={3}
                showPrefBadge={true}
                showEvaluate={true}
              />
              <PreferenceTableClient
                title="Slot 4 (2:30 PM – 3:30 PM)"
                subtitle="Candidates who selected Time Slot 4 (Pref 1 priority, then FCFS)"
                candidates={slot4Candidates}
                slotNum={4}
                showPrefBadge={true}
                showEvaluate={true}
              />
            </div>

            {unassignedCandidates.length > 0 && (
              <div className="w-full">
                <PreferenceTableClient
                  title="No Fixed Time Slot (3rd & 4th Preferences)"
                  subtitle="Candidates who selected this company as 3rd or 4th preference without a specific time slot"
                  candidates={unassignedCandidates}
                  showPrefBadge={true}
                  showEvaluate={true}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8 w-full">
            <PreferenceTableClient
              title="1st Preference"
              candidates={pref1Candidates}
              prefNum={1}
              showSlotFilter={true}
              showEvaluate={true}
            />
            <PreferenceTableClient
              title="2nd Preference"
              candidates={pref2Candidates}
              prefNum={2}
              showSlotFilter={true}
              showEvaluate={true}
            />
            <PreferenceTableClient
              title="3rd Preference"
              candidates={pref3Candidates}
              prefNum={3}
              showEvaluate={true}
            />
            <PreferenceTableClient
              title="4th Preference"
              candidates={pref4Candidates}
              prefNum={4}
              showEvaluate={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
