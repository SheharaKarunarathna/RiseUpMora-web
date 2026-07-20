"use client";

import { useEffect, useRef, useState } from "react";

const events = [
  {
    day: "21",
    month: "July",
    year: "2026",
    type: "Session",
    title: "Awareness Session",
  },
  {
    day: "21",
    month: "July",
    year: "2026",
    type: "Registration",
    title: "Registration",
  },
  {
    day: "25",
    month: "July",
    year: "2026",
    type: "Workshop",
    title: "LinkedIn Profile Creation & Maintenance",
  },
  {
    day: "30",
    month: "July",
    year: "2026",
    type: "Workshop",
    title: "Excelling in CV Writing",
  },
  {
    day: "04",
    month: "August",
    year: "2026",
    type: "Workshop",
    title: "Mastering the Art of Acing Interviews",
  },
  {
    day: "06",
    month: "August",
    year: "2026",
    type: "Session",
    title: "Mock Interview Session",
  },
  {
    day: "",
    month: "August",
    year: "2026",
    type: "Other event",
    title: "Internship and Mock Interview Fair",
  },
] as const;

export default function EventTimeline() {
  const [activeIndex, setActiveIndex] = useState(0);
  const eventRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries.find((entry) => entry.isIntersecting);

        if (activeEntry) {
          const index = Number((activeEntry.target as HTMLElement).dataset.index);
          setActiveIndex(index);
        }
      },
      { rootMargin: "-38% 0px -45%", threshold: 0 },
    );

    eventRefs.current.forEach((event) => {
      if (event) observer.observe(event);
    });

    return () => observer.disconnect();
  }, []);

  const progress = (activeIndex / (events.length - 1)) * 100;

  return (
    <section className="event-timeline" id="timeline">
      <header className="timeline-heading">
        <p>Mark the dates</p>
        <h2>Event Timeline</h2>
        <span>
          From profile building to direct industry exposure, follow every step of
          the Rise Up Mora 2026 journey.
        </span>
      </header>

      <div className="timeline-track">
        <div className="timeline-line" aria-hidden="true">
          <span style={{ height: `${progress}%` }} />
        </div>

        <ol>
          {events.map((event, index) => (
            <li
              className={index <= activeIndex ? "timeline-event--active" : ""}
              data-index={index}
              key={`${event.day}-${event.month}-${event.title}`}
              ref={(element) => {
                eventRefs.current[index] = element;
              }}
            >
              <time
                className={event.day ? "" : "timeline-date--month-only"}
                dateTime={
                  event.day
                    ? `2026-${event.month === "July" ? "07" : "08"}-${event.day}`
                    : "2026-08"
                }
              >
                {event.day && <strong>{event.day}</strong>}
                <span>{event.month}</span>
                <small>{event.year}</small>
              </time>

              <div className="timeline-node" aria-hidden="true">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>

              <article>
                <p>{event.type}</p>
                <h3>{event.title}</h3>
                <span aria-hidden="true">Event {String(index + 1).padStart(2, "0")}</span>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
