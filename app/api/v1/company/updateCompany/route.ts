import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, name, logo_url, is_it, slot_limits } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: "Company ID and name are required" }, { status: 400 });
    }

    const res = await query(
      "UPDATE companies SET name = $1, logo_url = $2, is_it = $3 WHERE id = $4 RETURNING *",
      [name, logo_url || null, is_it === true, id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Update slot limits if provided
    if (slot_limits && typeof slot_limits === "object") {
      const countsResult = await query(
        "SELECT slot_number, filled_count FROM company_slot_counts WHERE company_id = $1",
        [id]
      );

      const filledMap = new Map<number, number>();
      for (const row of countsResult.rows) {
        filledMap.set(row.slot_number, parseInt(row.filled_count));
      }

      // Check validation for all slots 1..4 first
      for (const slotNum of [1, 2, 3, 4]) {
        const rawVal = slot_limits[slotNum] ?? slot_limits[String(slotNum)];
        if (rawVal !== undefined && rawVal !== null) {
          const proposedLimit = parseInt(String(rawVal));
          const currentFilled = filledMap.get(slotNum) ?? 0;
          if (isNaN(proposedLimit) || proposedLimit < currentFilled) {
            return NextResponse.json(
              { error: "There are already more candidates registered for this slot, please provide a higher limit" },
              { status: 400 }
            );
          }
        }
      }

      // Upsert slot limits if validation passed
      for (const slotNum of [1, 2, 3, 4]) {
        const rawVal = slot_limits[slotNum] ?? slot_limits[String(slotNum)];
        if (rawVal !== undefined && rawVal !== null) {
          const proposedLimit = parseInt(String(rawVal));
          if (!isNaN(proposedLimit) && proposedLimit >= 0) {
            await query(
              `INSERT INTO company_slot_counts (company_id, slot_number, filled_count, max_limit)
               VALUES ($1, $2, 0, $3)
               ON CONFLICT (company_id, slot_number)
               DO UPDATE SET max_limit = EXCLUDED.max_limit`,
              [id, slotNum, proposedLimit]
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, company: res.rows[0] });
  } catch (error: any) {
    console.error("Error updating company:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "A company with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}
