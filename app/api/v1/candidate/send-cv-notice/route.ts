import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { sendCvNoticeEmail } from "@/utils/email";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userResult = await query(
      "SELECT name, email FROM users WHERE id = $1",
      [session.user.id],
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { email, name } = userResult.rows[0];

    await sendCvNoticeEmail(email, name);

    return NextResponse.json({
      success: true,
      message: `Notice email sent to ${email}`,
    });
  } catch (error: unknown) {
    console.error("Error sending CV notice email:", error);
    return NextResponse.json(
      { error: "Failed to send email. Please try again later." },
      { status: 500 },
    );
  }
}
