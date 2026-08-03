import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Slot capacity limits
const SLOT_LIMITS = {
  it: { 1: 8, 2: 10, 3: 12 } as Record<number, number>,
  nonIt: { 1: 10, 2: 10, 3: 15 } as Record<number, number>,
};

export function getSlotMax(isIt: boolean, slotNumber: number): number {
  return isIt ? SLOT_LIMITS.it[slotNumber] : SLOT_LIMITS.nonIt[slotNumber];
}

export function getSlotStatus(filled: number, max: number): "available" | "overcrowded" | "filled" {
  if (filled >= max) return "filled";
  if (max - filled <= 2) return "overcrowded";
  return "available";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId || !uuidPattern.test(companyId)) {
    return NextResponse.json({ error: "Valid company ID is required" }, { status: 400 });
  }

  try {
    // Fetch company type and slot counts in parallel
    const [companyResult, countsResult] = await Promise.all([
      query("SELECT id, is_it FROM companies WHERE id = $1", [companyId]),
      query(
        "SELECT slot_number, filled_count FROM company_slot_counts WHERE company_id = $1 ORDER BY slot_number",
        [companyId],
      ),
    ]);

    if (companyResult.rowCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const isIt = companyResult.rows[0].is_it as boolean;

    // Build slot availability from counter cache
    const countMap = new Map<number, number>();
    for (const row of countsResult.rows) {
      countMap.set(row.slot_number, parseInt(row.filled_count));
    }

    const slots = [1, 2, 3].map((slotNumber) => {
      const filled = countMap.get(slotNumber) ?? 0;
      const max = getSlotMax(isIt, slotNumber);
      return {
        slot: slotNumber,
        filled,
        max,
        status: getSlotStatus(filled, max),
      };
    });

    return NextResponse.json({ slots });
  } catch (error: unknown) {
    console.error("Timeslot availability fetch error:", error);
    return NextResponse.json(
      { error: "Unable to fetch timeslot availability" },
      { status: 500 },
    );
  }
}
