import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const compRes = await query("SELECT * FROM companies ORDER BY created_at DESC");
    const slotRes = await query(
      "SELECT company_id, slot_number, filled_count, max_limit FROM company_slot_counts ORDER BY slot_number ASC"
    );

    const slotMap = new Map<string, Array<{ slot_number: number; filled_count: number; max_limit: number }>>();
    for (const row of slotRes.rows) {
      if (!slotMap.has(row.company_id)) {
        slotMap.set(row.company_id, []);
      }
      slotMap.get(row.company_id)!.push({
        slot_number: row.slot_number,
        filled_count: parseInt(row.filled_count),
        max_limit: parseInt(row.max_limit),
      });
    }

    const companies = compRes.rows.map((c) => ({
      ...c,
      slot_counts: slotMap.get(c.id) || [
        { slot_number: 1, filled_count: 0, max_limit: 10 },
        { slot_number: 2, filled_count: 0, max_limit: 10 },
        { slot_number: 3, filled_count: 0, max_limit: 10 },
        { slot_number: 4, filled_count: 0, max_limit: 10 },
      ],
    }));

    return NextResponse.json({ success: true, companies });
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}
