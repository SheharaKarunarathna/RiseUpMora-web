"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Loader2, 
  CalendarDays, 
  Clock, 
  CheckCircle,
  AlertCircle,
  GripVertical,
  Search,
  X
} from "lucide-react";

interface Allocation {
  id?: string;
  candidate_id: string;
  candidate_name: string;
  student_id: string;
  interview_date: string;
  time_slot: string;
  status: string;
}

interface InterestedCandidate {
  candidate_id: string;
  candidate_name: string;
  student_id: string;
  email: string;
  preference_num: number;
}

interface Slot {
  id: string;
  candidateId: string;
  candidateName: string;
  studentId: string;
  timeSlot: string;
  date: string;
  status: string;
}

interface ScheduleManagerProps {
  initialAllocations: Allocation[];
  interestedCandidates: InterestedCandidate[];
}

function formatTime12(time24: string): string {
  const [hrs, mns] = time24.split(":").map(Number);
  const period = hrs >= 12 ? "PM" : "AM";
  const hr12 = hrs % 12 === 0 ? 12 : hrs % 12;
  return `${String(hr12).padStart(2, "0")}:${String(mns).padStart(2, "0")} ${period}`;
}

function addMins(timeStr: string, mins: number): string {
  const [hrs, mns] = timeStr.split(":").map(Number);
  let newMns = mns + mins;
  let newHrs = hrs + Math.floor(newMns / 60);
  newMns = newMns % 60;
  newHrs = newHrs % 24;
  return `${String(newHrs).padStart(2, "0")}:${String(newMns).padStart(2, "0")}`;
}

function parse12hTo24h(time12: string): string {
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "09:00";
  let hrs = Number(match[1]);
  const mns = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hrs < 12) hrs += 12;
  if (period === "AM" && hrs === 12) hrs = 0;
  return `${String(hrs).padStart(2, "0")}:${String(mns).padStart(2, "0")}`;
}

export default function ScheduleManager({
  initialAllocations,
  interestedCandidates,
}: ScheduleManagerProps) {
  const router = useRouter();

  // Convert initial database allocations to Slot interface
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState("2026-08-06");
  const [startTime, setStartTime] = useState("09:00");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchIndex, setSearchIndex] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) {
      setDraggedIdx(null);
      return;
    }
    
    const newSlots = [...slots];
    const assignments = newSlots.map(s => ({
      candidateId: s.candidateId,
      candidateName: s.candidateName,
      studentId: s.studentId,
      status: s.status,
    }));
    
    const [moved] = assignments.splice(draggedIdx, 1);
    assignments.splice(index, 0, moved);
    
    const reorderedSlots = newSlots.map((slot, i) => ({
      ...slot,
      candidateId: assignments[i].candidateId,
      candidateName: assignments[i].candidateName,
      studentId: assignments[i].studentId,
      status: assignments[i].status,
    }));
    
    setSlots(reorderedSlots);
    setDraggedIdx(null);
  };

  useEffect(() => {
    if (initialAllocations && initialAllocations.length > 0) {
      const loadedSlots = initialAllocations.map((a, idx) => ({
        id: a.id || `temp-${idx}-${Date.now()}`,
        candidateId: a.candidate_id,
        candidateName: a.candidate_name,
        studentId: a.student_id || "-",
        timeSlot: a.time_slot,
        date: a.interview_date ? new Date(a.interview_date).toISOString().split("T")[0] : "2026-08-06",
        status: a.status,
      }));
      setSlots(loadedSlots);
      
      if (initialAllocations[0].interview_date) {
        setDate(new Date(initialAllocations[0].interview_date).toISOString().split("T")[0]);
      }
      if (initialAllocations[0].time_slot) {
        const startPart = initialAllocations[0].time_slot.split(" - ")[0];
        setStartTime(parse12hTo24h(startPart));
      }
    }
  }, [initialAllocations]);

  // Handle initialization of the FCFS default schedule
  const handleInitialize = async () => {
    setIsInitializing(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/v1/company/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initialize",
          date,
          startTime,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to initialize schedule");
        return;
      }

      setMessage("Default schedule successfully generated!");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setIsInitializing(false);
    }
  };

  // Handle saving the edited slots list
  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setMessage("");

    const payload = slots.map((s) => ({
      candidateId: s.candidateId,
      timeSlot: s.timeSlot,
      date: s.date,
      status: s.status,
    }));

    try {
      const res = await fetch("/api/v1/company/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          allocations: payload,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to save schedule");
        return;
      }

      setMessage("Schedule successfully saved!");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Swap candidates to shift position in schedule (Up)
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSlots = [...slots];
    
    const tempId = newSlots[index].candidateId;
    const tempName = newSlots[index].candidateName;
    const tempStatus = newSlots[index].status;
    const tempStudentId = newSlots[index].studentId;

    newSlots[index].candidateId = newSlots[index - 1].candidateId;
    newSlots[index].candidateName = newSlots[index - 1].candidateName;
    newSlots[index].status = newSlots[index - 1].status;
    newSlots[index].studentId = newSlots[index - 1].studentId;

    newSlots[index - 1].candidateId = tempId;
    newSlots[index - 1].candidateName = tempName;
    newSlots[index - 1].status = tempStatus;
    newSlots[index - 1].studentId = tempStudentId;

    setSlots(newSlots);
  };

  // Swap candidates to shift position in schedule (Down)
  const moveDown = (index: number) => {
    if (index === slots.length - 1) return;
    const newSlots = [...slots];

    const tempId = newSlots[index].candidateId;
    const tempName = newSlots[index].candidateName;
    const tempStatus = newSlots[index].status;
    const tempStudentId = newSlots[index].studentId;

    newSlots[index].candidateId = newSlots[index + 1].candidateId;
    newSlots[index].candidateName = newSlots[index + 1].candidateName;
    newSlots[index].status = newSlots[index + 1].status;
    newSlots[index].studentId = newSlots[index + 1].studentId;

    newSlots[index + 1].candidateId = tempId;
    newSlots[index + 1].candidateName = tempName;
    newSlots[index + 1].status = tempStatus;
    newSlots[index + 1].studentId = tempStudentId;

    setSlots(newSlots);
  };

  // Add a new empty slot at the end of the schedule
  const addSlot = () => {
    let nextStart = startTime;
    const lastSlot = slots[slots.length - 1];
    if (lastSlot) {
      const parts = lastSlot.timeSlot.split(" - ");
      if (parts.length === 2) {
        nextStart = parse12hTo24h(parts[1]);
      }
    }
    const nextEnd = addMins(nextStart, 30);
    const newTimeSlot = `${formatTime12(nextStart)} - ${formatTime12(nextEnd)}`;

    const newSlot: Slot = {
      id: `new-${Date.now()}`,
      candidateId: "",
      candidateName: "Unassigned",
      studentId: "-",
      timeSlot: newTimeSlot,
      date,
      status: "0",
    };

    setSlots([...slots, newSlot]);
  };

  // Remove a slot
  const removeSlot = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id));
  };

  // Change slot candidate
  const handleCandidateChange = (id: string, candidateId: string) => {
    const selected = interestedCandidates.find((c) => c.candidate_id === candidateId);
    setSlots(
      slots.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            candidateId: candidateId,
            candidateName: selected ? selected.candidate_name : "Unassigned",
            studentId: selected ? (selected.student_id || "N/A") : "-",
          };
        }
        return s;
      })
    );
  };

  // Toggle status to ONGOING
  const setOngoing = (id: string) => {
    setSlots(
      slots.map((s) => {
        if (s.id === id) {
          return { ...s, status: "ONGOING" };
        }
        // Force other slots back to active status if they were ongoing
        if (s.status === "ONGOING") {
          return { ...s, status: "1" };
        }
        return s;
      })
    );
  };

  // Filter candidates already scheduled in OTHER slots
  const getAvailableCandidates = (currentCandidateId: string) => {
    const scheduledIds = new Set(
      slots.map((s) => s.candidateId).filter((id) => id && id !== currentCandidateId)
    );
    return interestedCandidates.filter((c) => !scheduledIds.has(c.candidate_id));
  };

  return (
    <div className="bg-white rounded-3xl border border-[#002454]/10 p-8 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#002454]/5 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-[#002454] flex items-center gap-2">
            <CalendarDays className="text-[#33aeda]" /> Interview Scheduler
          </h2>
          <p className="text-xs text-[#002454]/60 mt-1">
            Configure dates, times, candidate rankings, and set interviews as ongoing.
          </p>
        </div>

        {/* Action alerts */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          {message && (
            <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 shadow-sm">
              <CheckCircle size={14} />
              {message}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 shadow-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Scheduler Inputs / Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-[#f8fcfe] p-6 rounded-2xl border border-[#002454]/5">
        <div>
          <label className="block text-xs font-extrabold text-[#002454] mb-1.5 uppercase tracking-wider">
            Interview Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[#002454]/10 bg-white px-3.5 py-2.5 text-xs font-bold text-[#002454] outline-none focus:border-[#33aeda]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-[#002454] mb-1.5 uppercase tracking-wider">
            Start Time
          </label>
          <div className="relative">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-[#002454]/10 bg-white px-3.5 py-2.5 text-xs font-bold text-[#002454] outline-none focus:border-[#33aeda]"
            />
          </div>
        </div>

        <button
          onClick={handleInitialize}
          disabled={isInitializing || isSaving}
          className="flex h-11 items-center justify-center rounded-xl bg-[#33aeda] hover:bg-[#1688b2] text-white px-5 text-xs font-bold transition-all disabled:opacity-50"
        >
          {isInitializing ? (
            <>
              <Loader2 className="animate-spin mr-2" size={14} />
              Generating...
            </>
          ) : (
            "Generate Default (FCFS)"
          )}
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving || isInitializing || slots.length === 0}
          className="flex h-11 items-center justify-center rounded-xl bg-[#f6c430] hover:bg-[#d49400] text-[#002454] px-5 text-xs font-bold shadow-[0_0.5rem_1.5rem_rgba(246,196,48,0.2)] transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin mr-2" size={14} />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} className="mr-2" />
              Save Schedule
            </>
          )}
        </button>
      </div>

      {/* Slots Table */}
      {slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-[#002454]/40 border-2 border-dashed border-[#002454]/10 rounded-2xl">
          <Clock size={48} className="mb-3 text-[#002454]/20" />
          <p className="font-semibold text-sm">No interviews scheduled yet.</p>
          <p className="text-xs text-[#002454]/50 mt-1 max-w-sm">
            Select a date and start time above and click "Generate Default" to auto-populate from 1st preference candidates.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#f8fcfe] p-4 rounded-2xl border border-[#002454]/5">
            <div className="flex items-center gap-3 w-full sm:w-auto relative">
              <div className="bg-white p-2 rounded-xl border border-[#002454]/10 shadow-sm">
                <Search size={16} className="text-[#33aeda]" />
              </div>
              <div className="relative w-full sm:w-64">
                <input 
                  type="text" 
                  placeholder="Search candidate by index..."
                  value={searchIndex}
                  onChange={(e) => setSearchIndex(e.target.value)}
                  className="w-full rounded-xl border border-[#002454]/10 bg-white px-3.5 py-2 pr-8 text-xs font-bold text-[#002454] outline-none focus:border-[#33aeda] transition-colors"
                />
                {searchIndex && (
                  <button
                    onClick={() => setSearchIndex("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#002454]/40 hover:text-[#002454]/70 p-1 rounded-full transition-colors"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="text-[10px] font-bold text-[#002454]/50 flex items-center gap-1.5">
              <GripVertical size={12} /> Drag and drop rows to shift candidate positions
            </div>
          </div>
          <div className="overflow-x-auto border border-[#002454]/5 rounded-2xl bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#002454]/5 bg-[#f8fcfe] text-xs font-extrabold uppercase text-[#002454]/50 tracking-wider">
                  <th className="py-4 px-6 w-20">Slot</th>
                  <th className="py-4 px-4 w-44">Time</th>
                  <th className="py-4 px-4 w-32">Index Number</th>
                  <th className="py-4 px-4">Candidate Assignment</th>
                  <th className="py-4 px-4 text-center w-24">Shift</th>
                  <th className="py-4 px-4 text-center w-36">Status</th>
                  <th className="py-4 px-6 text-right w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, index) => {
                  const available = getAvailableCandidates(slot.candidateId);
                  const isHighlighted = searchIndex && slot.studentId.toLowerCase().includes(searchIndex.toLowerCase());
                  const isDragged = draggedIdx === index;
                  
                  return (
                    <tr 
                      key={slot.id} 
                      draggable
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragOver={(e) => onDragOver(e, index)}
                      onDrop={(e) => onDrop(e, index)}
                      className={`border-b border-[#002454]/5 last:border-b-0 transition-colors cursor-grab active:cursor-grabbing ${
                        isDragged ? "opacity-50 bg-[#e0f2fe]" :
                        isHighlighted && slot.studentId !== "-" ? "bg-[#fef9c3] hover:bg-[#fef08a]" :
                        slot.status === "ONGOING" ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-[#f8fcfe]"
                      }`}
                    >
                      <td className="py-4 px-6 text-sm font-extrabold text-[#002454]/60 flex items-center gap-2">
                        <GripVertical size={14} className="text-[#002454]/20 hover:text-[#002454]/50 cursor-grab" />
                        #{index + 1}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#002454]">
                          <Clock size={13} className="text-[#33aeda]" />
                          {slot.timeSlot}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs font-bold text-[#002454]/80">
                          {slot.studentId}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={slot.candidateId}
                          onChange={(e) => handleCandidateChange(slot.id, e.target.value)}
                          className="w-full max-w-sm rounded-xl border border-[#002454]/10 bg-white px-3 py-2 text-xs font-bold text-[#002454] outline-none focus:border-[#33aeda]"
                        >
                          <option value="">-- Assign Candidate --</option>
                          {available.map((c) => (
                            <option key={c.candidate_id} value={c.candidate_id}>
                              {c.candidate_name} (Pref {c.preference_num})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg border border-[#002454]/5 hover:bg-slate-50 text-[#002454]/70 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === slots.length - 1}
                            className="p-1.5 rounded-lg border border-[#002454]/5 hover:bg-slate-50 text-[#002454]/70 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {slot.status === "ONGOING" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                              ONGOING
                            </span>
                          ) : (
                            <button
                              onClick={() => setOngoing(slot.id)}
                              disabled={!slot.candidateId}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1 text-[10px] font-extrabold border border-amber-200 transition-colors disabled:opacity-30"
                            >
                              <Play size={10} /> Set Ongoing
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => removeSlot(slot.id)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Remove Slot"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={addSlot}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#33aeda] bg-[#33aeda]/5 hover:bg-[#33aeda]/10 text-[#1688b2] py-3 text-xs font-bold transition-colors w-full"
          >
            <Plus size={14} /> Add 30-Minute Time Slot
          </button>
        </div>
      )}
    </div>
  );
}
