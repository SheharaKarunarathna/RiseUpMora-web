"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, BookOpen, UserRound, GraduationCap, CalendarCheck, FileText } from "lucide-react";

interface Metrics {
  totalUsers: number;
  candidates: number;
  cvsUploaded: number;
  companyCoordinators: number;
  deptCoordinators: number;
  panelists: number;
  companies: number;
  interviewsScheduled: number;
}

// Lightweight animated counter
function useCountUp(target: number, duration = 1000, delay = 0) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      if (target === 0) return;

      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return count;
}

export default function DashboardClient({ metrics }: { metrics: Metrics }) {
  const companiesCount  = useCountUp(metrics.companies, 800, 200);
  const interviewsCount = useCountUp(metrics.interviewsScheduled, 800, 350);
  const candidatesCount = useCountUp(metrics.candidates, 900, 500);
  const cvsCount        = useCountUp(metrics.cvsUploaded, 900, 550);
  const compCoorCount   = useCountUp(metrics.companyCoordinators, 800, 600);
  const deptCoorCount   = useCountUp(metrics.deptCoordinators, 800, 700);
  const panelistsCount  = useCountUp(metrics.panelists, 800, 800);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <style>{`
        @keyframes smooth-slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-smooth {
          opacity: 0;
          animation: smooth-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div className="animate-smooth" style={{ animationDelay: '0ms' }}>
        <h1 className="text-2xl font-extrabold text-[#002454]">Platform Overview</h1>
        <p className="text-sm text-[#002454]/55">Real-time metrics for Rise Up Mora</p>
      </div>

      {/* Event Activity */}
      <section className="animate-smooth" style={{ animationDelay: '150ms' }}>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#002454]/40">Event Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div className="group flex items-center gap-5 rounded-2xl bg-white border border-[#002454]/10 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1688b2]/10 text-[#1688b2] transition-transform duration-300 group-hover:scale-105">
              <Building2 size={26} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#002454]/60">Total Companies</p>
              <p className="text-4xl font-extrabold tabular-nums text-[#002454]">{companiesCount}</p>
            </div>
          </div>

          <div className="group flex items-center gap-5 rounded-2xl bg-white border border-[#002454]/10 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#33aeda]/10 text-[#33aeda] transition-transform duration-300 group-hover:scale-105">
              <CalendarCheck size={26} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#002454]/60">Interviews Scheduled</p>
              <p className="text-4xl font-extrabold tabular-nums text-[#002454]">{interviewsCount}</p>
            </div>
          </div>

        </div>
      </section>

      {/* User Breakdown */}
      <section className="animate-smooth" style={{ animationDelay: '300ms' }}>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#002454]/40">User Breakdown</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          <div className="group rounded-2xl bg-white border border-[#002454]/10 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-smooth" style={{ animationDelay: '400ms' }}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#002454]/5 text-[#002454] transition-transform duration-300 group-hover:scale-105">
              <GraduationCap size={22} />
            </div>
            <p className="text-sm font-bold text-[#002454]/60">Candidates</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums text-[#002454]">{candidatesCount}</p>
            <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#33aeda]/10 px-2.5 py-1 text-xs font-bold text-[#1688b2] w-fit">
              <FileText size={13} />
              <span>{cvsCount} CVs Uploaded</span>
            </div>
          </div>

          <div className="group rounded-2xl bg-white border border-[#002454]/10 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-smooth" style={{ animationDelay: '500ms' }}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f6c430]/10 text-[#f6c430] transition-transform duration-300 group-hover:scale-105">
              <Building2 size={22} />
            </div>
            <p className="text-sm font-bold text-[#002454]/60">Company Co.</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums text-[#002454]">{compCoorCount}</p>
          </div>

          <div className="group rounded-2xl bg-white border border-[#002454]/10 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-smooth" style={{ animationDelay: '600ms' }}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1688b2]/10 text-[#1688b2] transition-transform duration-300 group-hover:scale-105">
              <BookOpen size={22} />
            </div>
            <p className="text-sm font-bold text-[#002454]/60">Dept. Co.</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums text-[#002454]">{deptCoorCount}</p>
          </div>

          <div className="group rounded-2xl bg-white border border-[#002454]/10 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-smooth" style={{ animationDelay: '700ms' }}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#33aeda]/10 text-[#33aeda] transition-transform duration-300 group-hover:scale-105">
              <UserRound size={22} />
            </div>
            <p className="text-sm font-bold text-[#002454]/60">Panelists</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums text-[#002454]">{panelistsCount}</p>
          </div>

        </div>
      </section>
    </div>
  );
}
