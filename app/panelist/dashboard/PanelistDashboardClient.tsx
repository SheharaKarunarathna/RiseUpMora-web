"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  CalendarDays, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Play,
  CheckCircle2,
  StopCircle,
  Download,
  Award,
  Loader2
} from "lucide-react";

interface Allocation {
  allocation_id: string;
  candidate_id: string;
  candidate_name: string;
  email: string;
  student_id: string;
  department: string;
  cv_url: string;
  interview_date: string;
  time_slot: string;
  status: string;
  feedback_id?: string;
}

interface Panelist {
  panelist_id: string;
  panel_number: number;
  company_name: string;
  logo_url: string;
  company_id: string;
}

interface PanelistDashboardClientProps {
  panelist: Panelist;
  initialAllocations: Allocation[];
}

export default function PanelistDashboardClient({
  panelist,
  initialAllocations,
}: PanelistDashboardClientProps) {
  const router = useRouter();
  const [allocations, setAllocations] = useState<Allocation[]>(initialAllocations);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const updateStatus = async (allocationId: string, newStatus: string) => {
    setUpdatingId(allocationId);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/v1/panelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          allocationId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to update interview status");
        return;
      }

      setMessage("Interview status updated successfully!");
      setAllocations(
        allocations.map((a) => {
          if (a.allocation_id === allocationId) {
            return { ...a, status: newStatus };
          }
          // If we set a slot as ONGOING, reset other ongoing slots back to active status (Scheduled)
          if (newStatus === "ONGOING" && a.status === "ONGOING") {
            return { ...a, status: "1" };
          }
          return a;
        })
      );
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setUpdatingId(null);
    }
  };

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
            Panel #{panelist.panel_number}
          </h1>
          <p className="text-[#33aeda] font-semibold text-sm mt-1">
            Conducting mock interviews for {panelist.company_name}
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

      {/* Action alerts */}
      <div className="flex flex-col gap-2 w-full">
        {message && (
          <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-sm w-fit">
            <CheckCircle size={14} />
            {message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-sm w-fit">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-3xl border border-[#002454]/10 p-8 shadow-sm flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#002454] flex items-center gap-2">
            <CalendarDays className="text-[#33aeda]" /> Today's Interview Schedule
          </h2>
          <p className="text-xs text-[#002454]/60 mt-1">
            Below is the sequence of interview sessions configured by the company coordinator.
          </p>
        </div>

        {allocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#002454]/40 border-2 border-dashed border-[#002454]/10 rounded-2xl">
            <Clock size={48} className="mb-3 text-[#002454]/20" />
            <p className="font-semibold text-sm">No interviews scheduled yet.</p>
            <p className="text-xs text-[#002454]/50 mt-1 max-w-sm">
              Please ask your company coordinator to set up slots and assign candidates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#002454]/5 rounded-2xl bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#002454]/5 bg-[#f8fcfe] text-xs font-extrabold uppercase text-[#002454]/50 tracking-wider">
                  <th className="py-4 px-6 w-16">Slot</th>
                  <th className="py-4 px-4 w-40">Time</th>
                  <th className="py-4 px-4">Candidate Details</th>
                  <th className="py-4 px-4 text-center w-24">CV</th>
                  <th className="py-4 px-4 text-center w-40">Status</th>
                  <th className="py-4 px-4 text-center w-44">Quick Actions</th>
                  <th className="py-4 px-6 text-right w-36">Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((slot, index) => {
                  const isUpdating = updatingId === slot.allocation_id;
                  
                  return (
                    <tr 
                      key={slot.allocation_id} 
                      className={`border-b border-[#002454]/5 last:border-b-0 transition-colors ${
                        slot.status === "ONGOING" 
                          ? "bg-amber-50/50 hover:bg-amber-50" 
                          : slot.status === "COMPLETED" 
                            ? "bg-green-50/20 hover:bg-green-50/30" 
                            : "hover:bg-[#f8fcfe]"
                      }`}
                    >
                      <td className="py-4 px-6 text-sm font-extrabold text-[#002454]/60">
                        #{index + 1}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#002454]">
                          <Clock size={13} className="text-[#33aeda]" />
                          {slot.time_slot}
                        </div>
                        {slot.interview_date && (
                          <div className="text-[10px] text-[#002454]/50 mt-1 font-semibold">
                            {new Date(slot.interview_date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-sm text-[#002454]">
                          {slot.candidate_name}
                        </div>
                        <div className="text-xs text-[#002454]/60 mt-0.5">
                          {slot.email}
                        </div>
                        <div className="text-[10px] text-[#002454]/40 mt-1 font-bold">
                          {slot.student_id} | {slot.department}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {slot.cv_url ? (
                          <a
                            href={`/api/v1/candidate/cv/${slot.candidate_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-2 rounded-xl bg-[#33aeda]/10 hover:bg-[#33aeda]/20 text-[#1688b2] transition-colors"
                            title="Download CV"
                          >
                            <Download size={15} />
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">No CV</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          {slot.status === "ONGOING" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                              ONGOING
                            </span>
                          ) : slot.status === "COMPLETED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-300 px-2.5 py-0.5 text-[10px] font-extrabold text-green-800">
                              OVER
                            </span>
                          ) : slot.status === "1" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[10px] font-extrabold text-[#1688b2]">
                              Scheduled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-600">
                              Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isUpdating ? (
                            <Loader2 className="animate-spin text-[#33aeda]" size={16} />
                          ) : (
                            <>
                              <button
                                onClick={() => updateStatus(slot.allocation_id, "ONGOING")}
                                disabled={slot.status === "ONGOING"}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-700 px-2.5 py-1.5 text-[10px] font-extrabold border border-amber-200 transition-colors"
                              >
                                <Play size={10} /> Ongoing
                              </button>
                              <button
                                onClick={() => updateStatus(slot.allocation_id, "COMPLETED")}
                                disabled={slot.status === "COMPLETED"}
                                className="inline-flex items-center gap-1 rounded-lg bg-green-50 hover:bg-green-100 disabled:opacity-40 text-green-700 px-2.5 py-1.5 text-[10px] font-extrabold border border-green-200 transition-colors"
                              >
                                <CheckCircle2 size={10} /> Over
                              </button>
                              <button
                                onClick={() => updateStatus(slot.allocation_id, "1")}
                                disabled={slot.status !== "ONGOING" && slot.status !== "COMPLETED"}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 px-2.5 py-1.5 text-[10px] font-extrabold border border-slate-200 transition-colors"
                                title="Stop/Scheduled"
                              >
                                <StopCircle size={10} /> Stop
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/panelist/dashboard/evaluate/${slot.candidate_id}`}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-sm ${
                            slot.feedback_id
                              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                              : "bg-[#f6c430] hover:bg-[#d49400] text-[#002454]"
                          }`}
                        >
                          <Award size={13} />
                          {slot.feedback_id ? "Edit Rated" : "Evaluate"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
