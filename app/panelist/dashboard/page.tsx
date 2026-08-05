import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { fetchCompanyCandidates } from "@/lib/company-data";
import PreferenceTableClient from "@/app/company/dashboard/PreferenceTableClient";
import { Building2 } from "lucide-react";

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

  // 2. Fetch candidate application tables for panelist's company
  const {
    slot1Candidates,
    slot2Candidates,
    slot3Candidates,
    slot4Candidates,
    unassignedCandidates,
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

      {/* Overview Stat Card */}
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
      </div>

      {/* Candidate Application Time Slot Tables Section */}
      <div className="flex flex-col gap-6">
        <div className="border-b border-[#002454]/10 pb-4">
          <h2 className="text-xl font-extrabold text-[#002454]">
            Candidate Applications per Time Slot
          </h2>
          <p className="text-xs text-[#002454]/60 mt-0.5">
            Interview sequence per time slot. Use actions to evaluate candidates and mark interview status.
          </p>
        </div>

        <div className="flex flex-col gap-8 w-full">
          <PreferenceTableClient
            title="Slot 1 (10:00 AM – 11:00 AM)"
            subtitle="Candidates scheduled for Time Slot 1"
            candidates={slot1Candidates}
            slotNum={1}
            showPrefBadge={false}
            showEvaluate={true}
          />
          <PreferenceTableClient
            title="Slot 2 (11:00 AM – 12:00 PM)"
            subtitle="Candidates scheduled for Time Slot 2"
            candidates={slot2Candidates}
            slotNum={2}
            showPrefBadge={false}
            showEvaluate={true}
          />
          <PreferenceTableClient
            title="Slot 3 (1:30 PM – 2:30 PM)"
            subtitle="Candidates scheduled for Time Slot 3"
            candidates={slot3Candidates}
            slotNum={3}
            showPrefBadge={false}
            showEvaluate={true}
          />
          <PreferenceTableClient
            title="Slot 4 (2:30 PM – 3:30 PM)"
            subtitle="Candidates scheduled for Time Slot 4"
            candidates={slot4Candidates}
            slotNum={4}
            showPrefBadge={false}
            showEvaluate={true}
          />
        </div>

        {unassignedCandidates.length > 0 && (
          <div className="w-full">
            <PreferenceTableClient
              title="No Fixed Time Slot"
              subtitle="Candidates registered for this company without a specific time slot"
              candidates={unassignedCandidates}
              showPrefBadge={false}
              showEvaluate={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
