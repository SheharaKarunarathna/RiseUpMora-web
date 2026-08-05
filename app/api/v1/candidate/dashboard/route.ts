import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, pool } from "@/lib/db";
import { getSlotStatus } from "@/app/api/v1/candidate/timeslots/route";
import { sendApplicationConfirmationEmail } from "@/utils/email";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Tolerates the pre-migration schema where pref_1_timeslot/pref_2_timeslot
// were a single INT rather than INT[], so the API never sends a bare number.
function normalizeTimeslots(value: unknown): number[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "number") return [value];
  return [];
}

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
    const [candidateResult, companyResult] = await Promise.all([
      query(
        `SELECT u.name, u.email, c.contact_number, c.student_id,
                c.faculty, c.department, c.cv_url,
                c.pref_1, c.pref_2, c.pref_3, c.pref_4,
                c.application_comment,
                c.pref_1_timeslot, c.pref_2_timeslot,
                c.id as candidate_id
         FROM users u
         JOIN candidates c ON c.user_id = u.id
         WHERE u.id = $1`,
        [session.user.id],
      ),
      query("SELECT id, name, logo_url, is_it FROM companies ORDER BY name ASC"),
    ]);

    if (candidateResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
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
      pref_1_timeslot: unknown;
      pref_2_timeslot: unknown;
      candidate_id: string;
    };

    // Fetch slot counts for companies in preferences
    const prefCompanyIds = [candidate.pref_1, candidate.pref_2].filter((id): id is string => !!id);
    let slotCounts: Record<string, Array<{ slot: number; filled: number; max: number; status: string }>> = {};
    if (prefCompanyIds.length > 0) {
      const countsResult = await query(
        `SELECT csc.company_id, csc.slot_number, csc.filled_count, csc.max_limit, c.is_it
         FROM company_slot_counts csc
         JOIN companies c ON c.id = csc.company_id
         WHERE csc.company_id = ANY($1::uuid[])`,
        [prefCompanyIds],
      );
      for (const row of countsResult.rows) {
        const compId = row.company_id;
        if (!slotCounts[compId]) slotCounts[compId] = [];
        const max = parseInt(row.max_limit ?? (row.is_it ? 10 : 15));
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
        pref1Timeslot: normalizeTimeslots(candidate.pref_1_timeslot),
        pref2Timeslot: normalizeTimeslots(candidate.pref_2_timeslot),
      },
      companies: companyResult.rows,
      slotCounts,
    });
  } catch (error: unknown) {
    console.error("Dashboard fetch error:", error);
    return NextResponse.json(
      { error: "Unable to load the dashboard" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getCandidateSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: unknown;
    phone?: unknown;
    studentId?: unknown;
    faculty?: unknown;
    department?: unknown;
    preferences?: unknown;
    comment?: unknown;
    pref1Timeslot?: unknown;
    pref2Timeslot?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const faculty = typeof body.faculty === "string" ? body.faculty.trim() : "";
  const department = typeof body.department === "string" ? body.department.trim() : "";
  const rawPreferences = Array.isArray(body.preferences)
    ? body.preferences.map((value) => (typeof value === "string" ? value.trim() : ""))
    : [];
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const parseTimeslots = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    const valid = value.filter((v): v is number => typeof v === "number" && [1, 2, 3, 4].includes(v));
    return Array.from(new Set(valid)).sort((a, b) => a - b);
  };
  const pref1Timeslot = parseTimeslots(body.pref1Timeslot);
  const pref2Timeslot = parseTimeslots(body.pref2Timeslot);

  if (!name) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: "Name cannot exceed 200 characters" }, { status: 400 });
  }
  if (phone.length > 50) {
    return NextResponse.json({ error: "Phone number is too long" }, { status: 400 });
  }
  if (studentId.length > 50) {
    return NextResponse.json({ error: "University ID is too long" }, { status: 400 });
  }
  if (faculty.length > 200) {
    return NextResponse.json({ error: "Faculty name is too long" }, { status: 400 });
  }
  if (department.length > 200) {
    return NextResponse.json({ error: "Department name is too long" }, { status: 400 });
  }

  const preferences: Array<string | null> = Array.from({ length: 4 }, (_, index) => {
    const pref = rawPreferences[index];
    return pref && uuidPattern.test(pref) ? pref : null;
  });

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

  // Validate timeslots: required when a company is selected for pref 1 or 2
  if (preferences[0] && pref1Timeslot.length === 0) {
    return NextResponse.json(
      { error: "Please select at least one time slot for Preference 1" },
      { status: 400 },
    );
  }
  if (preferences[1] && pref2Timeslot.length === 0) {
    return NextResponse.json(
      { error: "Please select at least one time slot for Preference 2" },
      { status: 400 },
    );
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get candidate ID
      const candResult = await client.query(
        "SELECT id FROM candidates WHERE user_id = $1",
        [session.user.id],
      );
      const candidateId = candResult.rows[0].id;

      // Remove old timeslot bookings
      const oldBookingsResult = await client.query(
        `SELECT company_id, slot_number FROM timeslot_bookings WHERE candidate_id = $1`,
        [candidateId],
      );
      for (const old of oldBookingsResult.rows) {
        if (old.slot_number) {
          await client.query(
            `UPDATE company_slot_counts SET filled_count = GREATEST(filled_count - 1, 0)
             WHERE company_id = $1 AND slot_number = $2`,
            [old.company_id, old.slot_number],
          );
        }
      }
      await client.query("DELETE FROM timeslot_bookings WHERE candidate_id = $1", [candidateId]);

      // Insert new bookings for pref 1 & 2 — one row per ticked slot (no capacity limit)
      const timeslotInserts: Array<{ companyId: string; slotNumber: number; prefNumber: number }> = [];
      if (preferences[0]) {
        for (const slot of pref1Timeslot) {
          timeslotInserts.push({ companyId: preferences[0], slotNumber: slot, prefNumber: 1 });
        }
      }
      if (preferences[1]) {
        for (const slot of pref2Timeslot) {
          timeslotInserts.push({ companyId: preferences[1], slotNumber: slot, prefNumber: 2 });
        }
      }

      for (const ins of timeslotInserts) {
        const countResult = await client.query(
          `SELECT csc.filled_count
           FROM company_slot_counts csc
           WHERE csc.company_id = $1 AND csc.slot_number = $2
           FOR UPDATE`,
          [ins.companyId, ins.slotNumber],
        );
        if (countResult.rowCount === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Slot data not found" }, { status: 400 });
        }
        await client.query(
          `INSERT INTO timeslot_bookings (company_id, candidate_id, slot_number, preference_number, no_timeslot_selected)
           VALUES ($1, $2, $3, $4, FALSE)`,
          [ins.companyId, candidateId, ins.slotNumber, ins.prefNumber],
        );
        await client.query(
          `UPDATE company_slot_counts SET filled_count = filled_count + 1
           WHERE company_id = $1 AND slot_number = $2`,
          [ins.companyId, ins.slotNumber],
        );
      }

      // Insert bookings for pref 3 & 4 (no timeslot)
      if (preferences[2]) {
        await client.query(
          `INSERT INTO timeslot_bookings (company_id, candidate_id, slot_number, preference_number, no_timeslot_selected)
           VALUES ($1, $2, NULL, 3, TRUE)`,
          [preferences[2], candidateId],
        );
      }
      if (preferences[3]) {
        await client.query(
          `INSERT INTO timeslot_bookings (company_id, candidate_id, slot_number, preference_number, no_timeslot_selected)
           VALUES ($1, $2, NULL, 4, TRUE)`,
          [preferences[3], candidateId],
        );
      }

      // Update user name
      await client.query("UPDATE users SET name = $1 WHERE id = $2", [name, session.user.id]);

      // Update candidate record
      await client.query(
        `UPDATE candidates
         SET contact_number = $1,
             student_id     = $2,
             faculty        = $3,
             department     = $4,
             pref_1         = $5,
             pref_2         = $6,
             pref_3         = $7,
             pref_4         = $8,
             application_comment = $9,
             pref_1_timeslot = $10,
             pref_2_timeslot = $11
         WHERE user_id = $12`,
        [
          phone || null,
          studentId || null,
          faculty || null,
          department || null,
          preferences[0],
          preferences[1],
          preferences[2],
          preferences[3],
          comment || null,
          preferences[0] && pref1Timeslot.length > 0 ? pref1Timeslot : null,
          preferences[1] && pref2Timeslot.length > 0 ? pref2Timeslot : null,
          session.user.id,
        ],
      );

      await client.query("COMMIT");

      // Send confirmation email to candidate asynchronously
      try {
        if (session.user?.email) {
          const prefIds = preferences.filter((id): id is string => !!id);
          const compRes = prefIds.length > 0
            ? await query("SELECT id, name, logo_url FROM companies WHERE id = ANY($1::uuid[])", [prefIds])
            : { rows: [] };
          const compMap = new Map(compRes.rows.map((c) => [c.id, c]));

          const emailPrefs = preferences
            .map((id, index) => {
              if (!id) return null;
              const comp = compMap.get(id);
              return {
                rank: index + 1,
                companyName: comp?.name || "Company",
                logoUrl: comp?.logo_url || null,
                slotNumbers: index === 0 ? pref1Timeslot : index === 1 ? pref2Timeslot : [],
              };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

          const candCvRes = await query("SELECT cv_url FROM candidates WHERE id = $1", [candidateId]);
          const cvUrl = candCvRes.rows[0]?.cv_url || null;

          sendApplicationConfirmationEmail(session.user.email, {
            candidateName: name || session.user.name || "Candidate",
            candidateEmail: session.user.email,
            studentId: studentId || "",
            faculty: faculty || "",
            department: department || "",
            phone: phone || "",
            cvUrl,
            preferences: emailPrefs,
            comment: comment || null,
          }).catch((err) => console.error("Confirmation email error:", err));
        }
      } catch (emailErr) {
        console.error("Confirmation email preparation error:", emailErr);
      }

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
      });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("Dashboard preferences update error:", error);
    return NextResponse.json(
      { error: "Unable to update preferences. Please try again." },
      { status: 500 },
    );
  }
}
