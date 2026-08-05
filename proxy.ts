import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.SECRET || "default_secret" });
  const { pathname } = req.nextUrl;

  // Redirect panelist from homepage '/' directly to panelist dashboard
  if (pathname === "/") {
    if (token && token.role === "panelist") {
      return NextResponse.redirect(new URL("/panelist/dashboard", req.url));
    }
  }

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    // 1. If hitting exactly /admin, redirect to /admin/dashboard or /admin/login
    if (pathname === "/admin") {
      if (token && token.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      } else {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    // 2. If logged in and visiting /admin/login, send to dashboard
    if (pathname === "/admin/login") {
      if (token && token.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // 3. Prevent access to /admin/dashboard/* for non-admins
    if (pathname.startsWith("/admin/dashboard")) {
      if (!token || token.role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }
  }

  // Protect /company routes
  if (pathname.startsWith("/company")) {
    if (!token || token.role !== "company_coordinator") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect /panelist routes
  if (pathname.startsWith("/panelist")) {
    if (!token || token.role !== "panelist") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/company/:path*", "/panelist/:path*"],
};
