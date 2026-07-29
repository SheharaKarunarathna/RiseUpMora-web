"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const userName = session?.user?.name || "Coordinator";
  const userInitials = userName.substring(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f8fcfe]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        <header className="flex h-16 items-center justify-between border-b border-[#002454]/10 bg-white/50 px-8 backdrop-blur-md">
          <Link href="/company/dashboard" className="text-xl font-extrabold text-[#002454]">
            Rise Up <span className="text-[#33aeda]">Co.</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-[#002454]/70">{userName}</span>
            <div className="h-8 w-8 rounded-full bg-[#f6c430] flex items-center justify-center font-bold text-[#002454]">
              {userInitials}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50 hover:text-red-600 ml-2 border border-red-100"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>
        
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
