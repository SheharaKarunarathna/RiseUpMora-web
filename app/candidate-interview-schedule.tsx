"use client";

import { AlertTriangle, Building2, CalendarClock } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ScheduleItem = {
  panel_number: number;
  /** Postgres TIME, serialised as "10:15:00". */
  interview_time: string;
  company_name: string;
  logo_url: string | null;
};

/** "10:15:00" -> "10.15 AM" */
function formatTime(value: string) {
  const [hourPart, minutePart] = value.split(":");
  const hour = Number.parseInt(hourPart, 10);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}.${minutePart ?? "00"} ${period}`;
}

/**
 * Shows the candidate's allocated interview times with the company logo.
 * Renders nothing for signed-out users, non-candidates, or candidates who
 * have no allocated slots.
 */
export default function CandidateInterviewSchedule({
  variant = "hero",
}: {
  variant?: "hero" | "panel";
}) {
  const { data: session, status } = useSession();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const isCandidate = status === "authenticated" && session?.user.role === "candidate";

  useEffect(() => {
    if (!isCandidate) return;

    const controller = new AbortController();
    fetch("/api/v1/candidate/interview-schedule", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { schedule?: ScheduleItem[] } | null) => {
        if (data?.schedule) setSchedule(data.schedule);
      })
      .catch(() => {
        // Silently ignore — the banner simply stays hidden.
      });

    return () => controller.abort();
  }, [isCandidate]);

  if (!isCandidate || schedule.length === 0) return null;

  return (
    <section
      className={`interview-schedule interview-schedule--${variant}`}
      aria-labelledby="interview-schedule-title"
    >
      <div className="interview-schedule__head">
        <CalendarClock size={16} aria-hidden="true" />
        <h2 id="interview-schedule-title">
          Your interview schedule
          <span> — Internship &amp; Mock Interview Fair</span>
        </h2>
      </div>

      <ul className="interview-schedule__list">
        {schedule.map((item) => (
          <li
            key={`${item.company_name}-${item.interview_time}-${item.panel_number}`}
            className="interview-schedule__item"
          >
            {item.logo_url ? (
              <img
                className="interview-schedule__logo"
                src={item.logo_url}
                alt={item.company_name}
              />
            ) : (
              <span className="interview-schedule__logo interview-schedule__logo--placeholder">
                <Building2 size={15} aria-hidden="true" />
              </span>
            )}

            <span className="interview-schedule__company">{item.company_name}</span>

            <span className="interview-schedule__meta">
              <strong className="interview-schedule__time">{formatTime(item.interview_time)}</strong>
              <span className="interview-schedule__panel">Panel {item.panel_number}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="interview-schedule__notice">
        <AlertTriangle size={14} aria-hidden="true" />
        Your time slot has been booked. Preference and time changes made after this point will
        not be considered.
      </p>
    </section>
  );
}
