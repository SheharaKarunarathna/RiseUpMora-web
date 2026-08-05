import { query } from "@/lib/db";

export async function fetchCompanyCandidates(companyId: string) {
  let slot1Candidates: any[] = [];
  let slot2Candidates: any[] = [];
  let slot3Candidates: any[] = [];
  let slot4Candidates: any[] = [];
  let unassignedCandidates: any[] = [];

  let pref1Candidates: any[] = [];
  let pref2Candidates: any[] = [];
  let pref3Candidates: any[] = [];
  let pref4Candidates: any[] = [];

  try {
    const [
      slot1Res,
      slot2Res,
      slot3Res,
      slot4Res,
      unassignedRes,
      pref1Res,
      pref2Res,
      pref3Res,
      pref4Res
    ] = await Promise.all([
      // Slot 1: 10:00 AM – 11:00 AM
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                COALESCE(tb.is_interviewed, c.is_interviewed, FALSE) as is_interviewed,
                COALESCE(tb.created_at, c.created_at) as preference_added_at,
                c.created_at,
                f.id as feedback_id
         FROM timeslot_bookings tb
         JOIN candidates c ON tb.candidate_id = c.id
         JOIN users u ON c.user_id = u.id
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = tb.company_id
         WHERE tb.company_id = $1::uuid AND tb.slot_number = 1
         ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      ),
      // Slot 2: 11:00 AM – 12:00 PM
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                COALESCE(tb.is_interviewed, c.is_interviewed, FALSE) as is_interviewed,
                COALESCE(tb.created_at, c.created_at) as preference_added_at,
                c.created_at,
                f.id as feedback_id
         FROM timeslot_bookings tb
         JOIN candidates c ON tb.candidate_id = c.id
         JOIN users u ON c.user_id = u.id
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = tb.company_id
         WHERE tb.company_id = $1::uuid AND tb.slot_number = 2
         ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      ),
      // Slot 3: 1:30 PM – 2:30 PM
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                COALESCE(tb.is_interviewed, c.is_interviewed, FALSE) as is_interviewed,
                COALESCE(tb.created_at, c.created_at) as preference_added_at,
                c.created_at,
                f.id as feedback_id
         FROM timeslot_bookings tb
         JOIN candidates c ON tb.candidate_id = c.id
         JOIN users u ON c.user_id = u.id
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = tb.company_id
         WHERE tb.company_id = $1::uuid AND tb.slot_number = 3
         ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      ),
      // Slot 4: 2:30 PM – 3:30 PM
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                COALESCE(tb.is_interviewed, c.is_interviewed, FALSE) as is_interviewed,
                COALESCE(tb.created_at, c.created_at) as preference_added_at,
                c.created_at,
                f.id as feedback_id
         FROM timeslot_bookings tb
         JOIN candidates c ON tb.candidate_id = c.id
         JOIN users u ON c.user_id = u.id
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = tb.company_id
         WHERE tb.company_id = $1::uuid AND tb.slot_number = 4
         ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      ),
      // Unassigned / Candidates without fixed slot
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment,
                tb.slot_number, tb.preference_number, tb.no_timeslot_selected,
                COALESCE(tb.is_interviewed, c.is_interviewed, FALSE) as is_interviewed,
                COALESCE(tb.created_at, c.created_at) as preference_added_at,
                c.created_at,
                f.id as feedback_id
         FROM timeslot_bookings tb
         JOIN candidates c ON tb.candidate_id = c.id
         JOIN users u ON c.user_id = u.id
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = tb.company_id
         WHERE tb.company_id = $1::uuid AND (tb.slot_number IS NULL OR tb.no_timeslot_selected = TRUE)
         ORDER BY tb.preference_number ASC NULLS LAST, COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      ),
      // Preferences 1
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                array_agg(tb.slot_number ORDER BY tb.slot_number) FILTER (WHERE tb.slot_number IS NOT NULL) as slot_numbers,
                bool_or(COALESCE(tb.no_timeslot_selected, FALSE)) as no_timeslot_selected,
                bool_or(COALESCE(tb.is_interviewed, c.is_interviewed, FALSE)) as is_interviewed,
                MIN(COALESCE(tb.created_at, c.created_at)) as preference_added_at,
                f.id as feedback_id
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1::uuid AND tb.preference_number = 1
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = $1::uuid
         WHERE c.pref_1 = $1::text
         GROUP BY c.id, u.name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at, f.id
         ORDER BY MIN(COALESCE(tb.created_at, c.created_at)) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      ),
      // Preferences 2
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                array_agg(tb.slot_number ORDER BY tb.slot_number) FILTER (WHERE tb.slot_number IS NOT NULL) as slot_numbers,
                bool_or(COALESCE(tb.no_timeslot_selected, FALSE)) as no_timeslot_selected,
                bool_or(COALESCE(tb.is_interviewed, c.is_interviewed, FALSE)) as is_interviewed,
                MIN(COALESCE(tb.created_at, c.created_at)) as preference_added_at,
                f.id as feedback_id
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1::uuid AND tb.preference_number = 2
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = $1::uuid
         WHERE c.pref_2 = $1::text
         GROUP BY c.id, u.name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at, f.id
         ORDER BY MIN(COALESCE(tb.created_at, c.created_at)) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      ),
      // Preferences 3
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                tb.slot_number, tb.no_timeslot_selected,
                COALESCE(tb.is_interviewed, c.is_interviewed, FALSE) as is_interviewed,
                COALESCE(tb.created_at, c.created_at) as preference_added_at,
                f.id as feedback_id
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1::uuid AND tb.preference_number = 3
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = $1::uuid
         WHERE c.pref_3 = $1::text
         ORDER BY COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      ),
      // Preferences 4
      query(
        `SELECT c.id, u.name as candidate_name, u.email, c.student_id, c.department, c.contact_number, c.cv_url, c.application_comment, c.created_at,
                tb.slot_number, tb.no_timeslot_selected,
                COALESCE(tb.is_interviewed, c.is_interviewed, FALSE) as is_interviewed,
                COALESCE(tb.created_at, c.created_at) as preference_added_at,
                f.id as feedback_id
         FROM candidates c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN timeslot_bookings tb ON tb.candidate_id = c.id AND tb.company_id = $1::uuid AND tb.preference_number = 4
         LEFT JOIN feedback f ON f.candidate_id = c.id AND f.company_id = $1::uuid
         WHERE c.pref_4 = $1::text
         ORDER BY COALESCE(tb.created_at, c.created_at) ASC, c.student_id ASC NULLS LAST`,
        [companyId]
      )
    ]);

    slot1Candidates = slot1Res.rows;
    slot2Candidates = slot2Res.rows;
    slot3Candidates = slot3Res.rows;
    slot4Candidates = slot4Res.rows;
    unassignedCandidates = unassignedRes.rows;

    pref1Candidates = pref1Res.rows;
    pref2Candidates = pref2Res.rows;
    pref3Candidates = pref3Res.rows;
    pref4Candidates = pref4Res.rows;
  } catch (error) {
    console.error("Error fetching company candidates:", error);
  }

  const totalCandidateCount =
    slot1Candidates.length +
    slot2Candidates.length +
    slot3Candidates.length +
    slot4Candidates.length +
    unassignedCandidates.length;

  const interviewedCandidateSet = new Set(
    [
      ...slot1Candidates,
      ...slot2Candidates,
      ...slot3Candidates,
      ...slot4Candidates,
      ...unassignedCandidates,
    ]
      .filter((c) => c.is_interviewed)
      .map((c) => c.id)
  );

  const totalInterviewedCount = interviewedCandidateSet.size;

  return {
    slot1Candidates,
    slot2Candidates,
    slot3Candidates,
    slot4Candidates,
    unassignedCandidates,
    pref1Candidates,
    pref2Candidates,
    pref3Candidates,
    pref4Candidates,
    totalCandidateCount,
    totalInterviewedCount,
  };
}
