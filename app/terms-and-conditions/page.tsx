"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import SiteBackground from "../site-background";
import SiteHeader from "../site-header";

export default function TermsAndConditionsPage() {
  return (
    <div className="candidate-application-page">
      <SiteBackground />
      <SiteHeader />

      <main className="candidate-application-main">
        <Link className="signup-back-link" href="/#home">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to home
        </Link>

        <header className="candidate-application-heading">
          <p>Legal</p>
          <h1>Terms and Conditions</h1>
          <span>
            Please read the following terms carefully before submitting your
            application.
          </span>
        </header>

        <section className="application-section">
          <div className="application-section__heading">
            <span>01</span>
            <div>
              <h2>Time Slot Disclaimer</h2>
              <p>Important notice regarding time slot selection</p>
            </div>
          </div>

          <div className="terms-content">
            <p>
              The time slot you selected may not be the actual time slot you may
              get.
            </p>
            <p>
              The organizing committee reserves the right to reassign time slots
              based on logistical requirements, company availability, and overall
              scheduling needs. Your selected time slot is treated as a
              preference and every effort will be made to honor it, but it is not
              guaranteed.
            </p>
            <p>
              By agreeing to the terms and conditions during your application
              submission, you acknowledge and accept this policy.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
