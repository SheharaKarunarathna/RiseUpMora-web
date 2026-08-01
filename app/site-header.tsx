"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import SignInModal from "./sign-in-modal";

const navigation = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Timeline", href: "#timeline" },
  { label: "Partner", href: "#sponsors" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

function SiteHeaderContent() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isHomePage = pathname === "/";

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    await signOut({ callbackUrl: "/", redirect: true });
  };

  useEffect(() => {
    if (searchParams.get("login") === "true") {
      setIsSignInOpen(true);
      // Clean up the URL parameter without triggering a page reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [searchParams]);

  const resolveHref = (href: string) => {
    if (!href.startsWith("#")) return href;
    return isHomePage ? href : `/${href}`;
  };

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 48);

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    const closeDesktopMenu = () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", closeDesktopMenu);

    return () => window.removeEventListener("resize", closeDesktopMenu);
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const closeMenu = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsUserMenuOpen(false);
    };

    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [isUserMenuOpen]);

  return (
    <>
      <header
        className={`site-header${isScrolled ? " site-header--scrolled" : ""}${isMenuOpen ? " site-header--menu-open" : ""
          }`}
      >
        <Link
          className="site-brand"
          href={isHomePage ? "#home" : "/"}
          aria-label="Rise Up Mora home"
        >
          <Image
            src="/assets/rise-up-mora-logo.png"
            alt="Rise Up Mora"
            width={830}
            height={535}
            loading="eager"
          />
        </Link>

        <nav id="site-navigation" className="site-navigation" aria-label="Main navigation">
          <ul>
            {navigation.map((item) => (
              <li key={item.label}>
                <Link href={resolveHref(item.href)}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header-actions">
          {status === "authenticated" ? (
            <div className="site-user-menu" ref={userMenuRef}>
              <button
                className="site-user"
                type="button"
                title={session.user.email ?? undefined}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
              >
                <UserRound size={17} aria-hidden="true" />
                <span>{session.user.name || "Candidate"}</span>
                <ChevronDown
                  className={isUserMenuOpen ? "site-user__chevron--open" : undefined}
                  size={15}
                  aria-hidden="true"
                />
              </button>

              {isUserMenuOpen && (
                <div className="site-user-menu__dropdown" role="menu">
                  <Link
                    href={
                      session.user.role === "company_coordinator"
                        ? "/company/dashboard"
                        : session.user.role === "panelist"
                        ? "/panelist/dashboard"
                        : session.user.role === "admin"
                        ? "/admin/dashboard"
                        : "/candidate/dashboard"
                    }
                    className="site-user-menu__account"
                    onClick={() => setIsUserMenuOpen(false)}
                    title="Go to dashboard"
                  >
                    <div aria-hidden="true">
                      <UserRound size={18} />
                    </div>
                    <span>
                      <strong>{session.user.name || "Candidate"}</strong>
                      <small>{session.user.email}</small>
                    </span>
                  </Link>
                  <div className="site-user-menu__divider" role="separator" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                  >
                    <LogOut size={17} aria-hidden="true" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="sign-in-link"
              type="button"
              onClick={() => setIsSignInOpen(true)}
              disabled={status === "loading"}
            >
              Sign In
            </button>
          )}

          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            aria-controls="site-navigation"
            title={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>

      <SignInModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
    </>
  );
}

export default function SiteHeader() {
  return (
    <Suspense fallback={null}>
      <SiteHeaderContent />
    </Suspense>
  );
}
