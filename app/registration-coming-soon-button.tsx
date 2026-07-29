"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

type RegistrationComingSoonButtonProps = {
  children: ReactNode;
  className: string;
  onClick?: () => void;
};

export default function RegistrationComingSoonButton({
  children,
  className,
  onClick,
}: RegistrationComingSoonButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const noticeId = useId();

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timeout = window.setTimeout(() => setIsVisible(false), 3600);

    return () => window.clearTimeout(timeout);
  }, [isVisible]);

  return (
    <>
      <button
        className={className}
        type="button"
        aria-describedby={isVisible ? noticeId : undefined}
        onClick={() => {
          onClick?.();
          setIsVisible(true);
        }}
      >
        {children}
      </button>
      {isVisible ? (
        <div
          id={noticeId}
          className="registration-coming-soon"
          role="status"
          aria-live="polite"
        >
          Company selection will be available soon.
        </div>
      ) : null}
    </>
  );
}
