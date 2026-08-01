import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const res = await query("DELETE FROM companies WHERE id = $1 RETURNING *", [id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    await query("UPDATE candidates SET pref_1 = NULL WHERE pref_1 = $1", [id]);
    await query("UPDATE candidates SET pref_2 = NULL WHERE pref_2 = $1", [id]);
    await query("UPDATE candidates SET pref_3 = NULL WHERE pref_3 = $1", [id]);
    await query("UPDATE candidates SET pref_4 = NULL WHERE pref_4 = $1", [id]);

    return NextResponse.json({ success: true, deletedCompany: res.rows[0] });
  } catch (error: any) {
    console.error("Error deleting company:", error);
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}
