"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, HelpCircle } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const sidebarLinks = [
  { name: "Overview", href: "/panelist/dashboard", icon: LayoutDashboard },
];

export default function PanelistLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name || "Panelist";
  const userInitials = userName.substring(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f8fcfe]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[#002454]/10 bg-white/70 shadow-[0_2rem_5rem_rgba(0,36,84,0.05)] backdrop-blur-xl flex-col justify-between">
        <div>
          <div className="flex h-16 items-center px-6 border-b border-[#002454]/10">
            <Link href="/panelist/dashboard" className="text-xl font-extrabold text-[#002454]">
              Rise Up <span className="text-[#33aeda]">Panel</span>
            </Link>
          </div>

          <nav className="flex flex-col gap-1 p-4">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-[#33aeda]/10 text-[#1688b2]"
                      : "text-[#002454]/70 hover:bg-[#002454]/5 hover:text-[#002454]"
                  }`}
                >
                  <Icon size={18} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Guide Card in Sidebar */}
          <div className="mx-4 my-2 p-4 bg-[#f8fcfe] rounded-2xl border border-[#002454]/5 flex flex-col gap-3">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#002454] flex items-center gap-1.5">
                <HelpCircle size={18} className="text-[#33aeda]" /> Quick Guide
              </h3>
              <p className="text-[10.5px] text-[#002454]/70 leading-relaxed mt-1">
                Conduct mock interviews and evaluate candidates.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-start">
                <span className="text-[10px] text-green-600 font-extrabold mt-0.5">✓</span>
                <p className="text-[10px] text-[#002454]/60 leading-normal">
                  <strong>Track</strong> company allocation schedule.
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-[10px] text-[#33aeda] font-extrabold mt-0.5">✓</span>
                <p className="text-[10px] text-[#002454]/60 leading-normal">
                  <strong>Assess</strong> skills out of 1-10 points.
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-[10px] text-amber-500 font-extrabold mt-0.5">✓</span>
                <p className="text-[10px] text-[#002454]/60 leading-normal">
                  <strong>Submit</strong> notes visible to candidate when over.
                </p>
              </div>
            </div>

            <div className="text-[9.5px] font-semibold text-[#002454]/50 leading-normal border-t border-[#002454]/5 pt-2">
              Need help? Contact the coordinator.
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#002454]/10">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-[#002454]/10 bg-white/50 px-4 md:px-8 backdrop-blur-md">
          <h2 className="text-lg font-bold text-[#002454]">Panelist Dashboard</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#002454]/70 hidden sm:inline">{userName}</span>
            <div className="h-8 w-8 rounded-full bg-[#f6c430] flex items-center justify-center font-bold text-[#002454]">
              {userInitials}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="md:hidden flex items-center p-2 rounded-xl text-red-500 hover:bg-red-50"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
