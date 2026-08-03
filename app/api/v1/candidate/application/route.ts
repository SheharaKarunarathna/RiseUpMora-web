import { v2 as cloudinary } from "cloudinary";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCandidateCvAsset } from "@/lib/cloudinary-cv";
import { query, pool } from "@/lib/db";
import { getSlotMax, getSlotStatus } from "@/app/api/v1/candidate/timeslots/route";
import { sendApplicationConfirmationEmail } from "@/utils/email";

export const runtime = "nodejs";

const maximumFileSize = 10 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function getCandidateSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "candidate") return null;
  return session;
}

export async function GET() {
  const session = await getCandidateSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [candidateResult, companyResult, interviewResult] = await Promise.all([
      query(
        `SELECT u.name, u.email, c.contact_number, c.student_id,
                c.faculty, c.department, c.cv_url,
                c.pref_1, c.pref_2, c.pref_3, c.pref_4,
                c.application_comment,
                c.pref_1_timeslot, c.pref_2_timeslot
         FROM users u
         JOIN candidates c ON c.user_id = u.id
         WHERE u.id = $1`,
        [session.user.id],
      ),
      query("SELECT id, name, is_it FROM companies ORDER BY name ASC"),
      query(
        `SELECT a.id as allocation_id, comp.name as company_name, comp.logo_url, a.status,
                f.technical_skills, f.communication, f.industry_ready, f.written_feedback
         FROM allocations a
         JOIN companies comp ON a.company_id = comp.id
         JOIN candidates c ON a.candidate_id = c.id
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = comp.id
         WHERE c.user_id = $1`,
        [session.user.id]
      ),
    ]);

    if (candidateResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Complete your candidate profile before applying" },
        { status: 404 },
      );
    }

    const candidate = candidateResult.rows[0] as {
      name: string;
      email: string;
      contact_number: string;
      student_id: string;
      faculty: string;
      department: string;
      cv_url: string | null;
      pref_1: string | null;
      pref_2: string | null;
      pref_3: string | null;
      pref_4: string | null;
      application_comment: string | null;
      pref_1_timeslot: number | null;
      pref_2_timeslot: number | null;
    };

    // Fetch slot counts for companies in preferences (if any)
    const prefCompanyIds = [candidate.pref_1, candidate.pref_2].filter((id): id is string => !!id);
    let slotCounts: Record<string, Array<{ slot: number; filled: number; max: number; status: string }>> = {};
    if (prefCompanyIds.length > 0) {
      const countsResult = await query(
        `SELECT csc.company_id, csc.slot_number, csc.filled_count, c.is_it
         FROM company_slot_counts csc
         JOIN companies c ON c.id = csc.company_id
         WHERE csc.company_id = ANY($1::uuid[])`,
        [prefCompanyIds],
      );
      for (const row of countsResult.rows) {
        const compId = row.company_id;
        if (!slotCounts[compId]) slotCounts[compId] = [];
        const max = getSlotMax(row.is_it, row.slot_number);
        const filled = parseInt(row.filled_count);
        slotCounts[compId].push({
          slot: row.slot_number,
          filled,
          max,
          status: getSlotStatus(filled, max),
        });
      }
    }

    return NextResponse.json({
      candidate: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.contact_number,
        studentId: candidate.student_id,
        faculty: candidate.faculty,
        department: candidate.department,
        cvUrl: candidate.cv_url,
        preferences: [
          candidate.pref_1,
          candidate.pref_2,
          candidate.pref_3,
          candidate.pref_4,
        ],
        comment: candidate.application_comment ?? "",
        pref1Timeslot: candidate.pref_1_timeslot,
        pref2Timeslot: candidate.pref_2_timeslot,
      },
      companies: companyResult.rows,
      interviews: interviewResult.rows,
      slotCounts,
    });
  } catch (error: unknown) {
    console.error("Candidate application fetch error:", error);
    return NextResponse.json(
      { error: "Unable to load the application" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    cvUrl?: unknown;
    publicId?: unknown;
    preferences?: unknown;
    comment?: unknown;
    pref1Timeslot?: unknown;
    pref2Timeslot?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid application submission" }, { status: 400 });
  }

  const cvUrl = typeof body.cvUrl === "string" ? body.cvUrl.trim() : "";
  const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";
  const rawPreferences = Array.isArray(body.preferences)
    ? body.preferences.map((value) => (typeof value === "string" ? value.trim() : ""))
    : [];
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const pref1Timeslot = typeof body.pref1Timeslot === "number" && [1, 2, 3].includes(body.pref1Timeslot) ? body.pref1Timeslot : null;
  const pref2Timeslot = typeof body.pref2Timeslot === "number" && [1, 2, 3].includes(body.pref2Timeslot) ? body.pref2Timeslot : null;

  // Normalize preferences to array of 4 string | null elements
  const preferences: Array<string | null> = Array.from({ length: 4 }, (_, index) => {
    const pref = rawPreferences[index];
    return pref && uuidPattern.test(pref) ? pref : null;
  });

  // Verify that any provided non-empty preferences are valid UUIDs
  for (let i = 0; i < rawPreferences.length && i < 4; i++) {
    const raw = rawPreferences[i];
    if (raw && !uuidPattern.test(raw)) {
      return NextResponse.json(
        { error: "Invalid company preference" },
        { status: 400 },
      );
    }
  }

  const selectedPrefs = preferences.filter((p): p is string => p !== null);

  if (new Set(selectedPrefs).size !== selectedPrefs.length) {
    return NextResponse.json(
      { error: "Each company preference must be different" },
      { status: 400 },
    );
  }

  if (comment.length > 2000) {
    return NextResponse.json(
      { error: "Comment cannot exceed 2,000 characters" },
      { status: 400 },
    );
  }

  if (selectedPrefs.length > 0) {
    const companyResult = await query(
      "SELECT id FROM companies WHERE id = ANY($1::uuid[])",
      [selectedPrefs],
    );
    if ((companyResult.rowCount ?? 0) !== selectedPrefs.length) {
      return NextResponse.json(
        { error: "One or more selected companies are unavailable" },
        { status: 400 },
      );
    }
  }

  const candidateResult = await query(
    `SELECT id, student_id, faculty, department, contact_number, cv_url
     FROM candidates
     WHERE user_id = $1`,
    [session.user.id],
  );
  if (candidateResult.rowCount === 0) {
    return NextResponse.json(
      { error: "Candidate profile not found" },
      { status: 404 },
    );
  }

  const candidate = candidateResult.rows[0] as {
    id: string;
    student_id: string;
    faculty: string;
    department: string;
    contact_number: string;
    cv_url: string | null;
  };

  // Validate timeslots: required when a company is selected for pref 1 or 2
  if (preferences[0] && !pref1Timeslot) {
    return NextResponse.json(
      { error: "Please select a time slot for Preference 1" },
      { status: 400 },
    );
  }
  if (preferences[1] && !pref2Timeslot) {
    return NextResponse.json(
      { error: "Please select a time slot for Preference 2" },
      { status: 400 },
    );
  }

  let savedCvUrl = candidate.cv_url;

  if (publicId) {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { error: "CV upload is not available until Cloudinary is configured" },
        { status: 503 },
      );
    }

    const expectedAsset = getCandidateCvAsset({
      studentId: candidate.student_id,
      faculty: candidate.faculty,
      department: candidate.department,
    });

    if (publicId !== expectedAsset.fullPublicId) {
      return NextResponse.json(
        { error: "The uploaded CV path does not match your candidate profile" },
        { status: 400 },
      );
    }

    try {
      let uploadedAsset: any;
      try {
        uploadedAsset = await cloudinary.api.resource(expectedAsset.fullPublicId, {
          resource_type: "raw",
          type: "authenticated",
        });
      } catch {
        try {
          uploadedAsset = await cloudinary.api.resource(expectedAsset.fullPublicId, {
            resource_type: "raw",
            type: "upload",
          });
        } catch (resourceErr) {
          console.error("Cloudinary resource fetch error:", resourceErr);
          return NextResponse.json(
            { error: "The uploaded CV could not be found on Cloudinary. Please re-upload your PDF." },
            { status: 400 },
          );
        }
      }

      if (
        !uploadedAsset ||
        uploadedAsset.bytes > maximumFileSize ||
        !uploadedAsset.public_id.toLowerCase().endsWith(".pdf")
      ) {
        console.error("Cloudinary asset verification failed:", {
          bytes: uploadedAsset?.bytes,
          public_id: uploadedAsset?.public_id,
          expected: expectedAsset.fullPublicId,
        });
        return NextResponse.json(
          { error: "Cloudinary could not verify the uploaded PDF" },
          { status: 400 },
        );
      }

      savedCvUrl = uploadedAsset.secure_url || cvUrl || candidate.cv_url;
    } catch (error: unknown) {
      console.error("Candidate application submission error:", error);
      return NextResponse.json(
        { error: "Unable to verify your CV file. Please try again." },
        { status: 500 },
      );
    }
  }

  if (!savedCvUrl) {
    return NextResponse.json(
      { error: "Select your CV in PDF format before submitting." },
      { status: 400 },
    );
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Remove old timeslot bookings for this candidate
      const oldBookingsResult = await client.query(
        `SELECT tb.company_id, tb.slot_number, tb.preference_number
         FROM timeslot_bookings tb
         WHERE tb.candidate_id = $1`,
        [candidate.id],
      );

      // Decrement old slot counts
      for (const old of oldBookingsResult.rows) {
        if (old.slot_number) {
          await client.query(
            `UPDATE company_slot_counts
             SET filled_count = GREATEST(filled_count - 1, 0)
             WHERE company_id = $1 AND slot_number = $2`,
            [old.company_id, old.slot_number],
          );
        }
      }

      // Delete old bookings
      await client.query(
        "DELETE FROM timeslot_bookings WHERE candidate_id = $1",
        [candidate.id],
      );

      // Validate capacity and insert new bookings for pref 1 & 2
      const timeslotInserts: Array<{ companyId: string; slotNumber: number; prefNumber: number }> = [];
      if (preferences[0] && pref1Timeslot) {
        timeslotInserts.push({ companyId: preferences[0], slotNumber: pref1Timeslot, prefNumber: 1 });
      }
      if (preferences[1] && pref2Timeslot) {
        timeslotInserts.push({ companyId: preferences[1], slotNumber: pref2Timeslot, prefNumber: 2 });
      }

      for (const ins of timeslotInserts) {
        // Check capacity with row lock
        const countResult = await client.query(
          `SELECT csc.filled_count, c.is_it
           FROM company_slot_counts csc
           JOIN companies c ON c.id = csc.company_id
           WHERE csc.company_id = $1 AND csc.slot_number = $2
           FOR UPDATE`,
          [ins.companyId, ins.slotNumber],
        );

        if (countResult.rowCount === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Slot data not found for the selected company" },
            { status: 400 },
          );
        }

        const { filled_count, is_it } = countResult.rows[0];
        const max = getSlotMax(is_it, ins.slotNumber);
        if (parseInt(filled_count) >= max) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: `Time slot ${ins.slotNumber} for Preference ${ins.prefNumber} is fully booked. Please select a different slot.` },
            { status: 400 },
          );
        }

        // Insert booking
        await client.query(
          `INSERT INTO timeslot_bookings (company_id, candidate_id, slot_number, preference_number, no_timeslot_selected)
           VALUES ($1, $2, $3, $4, FALSE)`,
          [ins.companyId, candidate.id, ins.slotNumber, ins.prefNumber],
        );

        // Increment counter
        await client.query(
          `UPDATE company_slot_counts
           SET filled_count = filled_count + 1
           WHERE company_id = $1 AND slot_number = $2`,
          [ins.companyId, ins.slotNumber],
        );
      }

      // Insert bookings for pref 3 & 4 (no timeslot)
      if (preferences[2]) {
        await client.query(
          `INSERT INTO timeslot_bookings (company_id, candidate_id, slot_number, preference_number, no_timeslot_selected)
           VALUES ($1, $2, NULL, 3, TRUE)`,
          [preferences[2], candidate.id],
        );
      }
      if (preferences[3]) {
        await client.query(
          `INSERT INTO timeslot_bookings (company_id, candidate_id, slot_number, preference_number, no_timeslot_selected)
           VALUES ($1, $2, NULL, 4, TRUE)`,
          [preferences[3], candidate.id],
        );
      }

      // Update candidate record
      await client.query(
        `UPDATE candidates
         SET cv_url = $1,
             pref_1 = $2,
             pref_2 = $3,
             pref_3 = $4,
             pref_4 = $5,
             application_comment = $6,
             pref_1_timeslot = $7,
             pref_2_timeslot = $8
         WHERE user_id = $9`,
        [
          savedCvUrl,
          preferences[0],
          preferences[1],
          preferences[2],
          preferences[3],
          comment || null,
          preferences[0] ? pref1Timeslot : null,
          preferences[1] ? pref2Timeslot : null,
          session.user.id,
        ],
      );

      await client.query("COMMIT");

      // Send confirmation email to candidate asynchronously
      try {
        if (session.user?.email) {
          const prefIds = preferences.filter((id): id is string => !!id);
          const compRes = prefIds.length > 0
            ? await query("SELECT id, name FROM companies WHERE id = ANY($1::uuid[])", [prefIds])
            : { rows: [] };
          const compMap = new Map(compRes.rows.map((c) => [c.id, c.name]));

          const emailPrefs = preferences
            .map((id, index) => {
              if (!id) return null;
              return {
                rank: index + 1,
                companyName: compMap.get(id) || "Company",
                slotNumber: index === 0 ? pref1Timeslot : index === 1 ? pref2Timeslot : null,
              };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

          sendApplicationConfirmationEmail(session.user.email, {
            candidateName: session.user.name || "Candidate",
            candidateEmail: session.user.email,
            studentId: candidate.student_id,
            faculty: candidate.faculty,
            department: candidate.department,
            phone: candidate.contact_number,
            cvUrl: savedCvUrl,
            preferences: emailPrefs,
            comment: comment || null,
          }).catch((err) => console.error("Confirmation email error:", err));
        }
      } catch (emailErr) {
        console.error("Confirmation email preparation error:", emailErr);
      }

      return NextResponse.json({
        success: true,
        message: "Your application has been updated successfully",
        candidate: {
          cvUrl: savedCvUrl,
        },
      });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("Candidate application submission error:", error);
    return NextResponse.json(
      { error: "Unable to submit your application. Please try again." },
      { status: 500 },
    );
  }
}
