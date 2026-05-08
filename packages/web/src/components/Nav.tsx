"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type NavLink = {
  label: string;
  href: string;
};

const NAV_LINKS: readonly NavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Commands", href: "#commands" },
  { label: "Streaks", href: "#streaks" },
  { label: "FAQ", href: "#faq" },
] as const;

const TELEGRAM_URL = "https://t.me/UpDownBetaBot";
const SCROLL_THRESHOLD = 12;

function Wordmark(): React.JSX.Element {
  return (
    <span className="text-lg font-medium tracking-tight text-[var(--color-fg)]">
      Up
      <span style={{ color: "var(--color-down)" }}>/</span>
      Down
    </span>
  );
}

function HamburgerIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="17" y2="14" />
    </svg>
  );
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="5" y1="5" x2="17" y2="17" />
      <line x1="17" y1="5" x2="5" y2="17" />
    </svg>
  );
}

export function Nav(): React.JSX.Element {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = (): void => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > SCROLL_THRESHOLD);
        ticking = false;
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Lock body scroll when the mobile overlay is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : previous;
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <header
        className={[
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-[220ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          scrolled
            ? "h-[3.75rem] bg-[rgba(247,247,247,0.85)] backdrop-blur-[12px] border-b border-[var(--color-border)]"
            : "h-20 bg-[rgba(247,247,247,0)] border-b border-transparent",
        ].join(" ")}
      >
        <div className="container-page flex h-full items-center justify-between gap-4">
          {/* Left: wordmark + BETA chip */}
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Up/Down — home"
          >
            <Wordmark />
            <span className="pill h-6 px-2 py-0 text-[0.625rem] leading-none">
              BETA
            </span>
          </Link>

          {/* Center: desktop nav links */}
          <nav
            className="hidden md:flex items-center gap-7"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative text-sm text-[var(--color-fg)] focus-visible:outline-none"
              >
                <span className="relative inline-block">
                  {link.label}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-1 left-0 block h-[2px] w-0 bg-[var(--color-fg)] transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:w-full"
                  />
                </span>
              </a>
            ))}
          </nav>

          {/* Right: desktop CTA */}
          <div className="hidden md:flex items-center">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="pill h-9 bg-[var(--color-cta-bg)] text-[var(--color-cta-fg)] hover:bg-[var(--color-cta-bg-hover)] hover:scale-[1.02] transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] border-transparent"
            >
              Open in Telegram
            </a>
          </div>

          {/* Right: mobile hamburger */}
          <button
            type="button"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-fg)]"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen(true)}
          >
            <HamburgerIcon />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        id="mobile-nav"
        className={[
          "md:hidden fixed inset-0 z-[60] bg-[var(--color-bg)] text-[var(--color-fg)]",
          "transition-opacity duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
      >
        <div className="container-page flex h-20 items-center justify-between">
          <Wordmark />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-fg)]"
            aria-label="Close menu"
            onClick={closeMobile}
          >
            <CloseIcon />
          </button>
        </div>
        <nav
          className="container-page flex flex-col gap-6 pt-6"
          aria-label="Mobile"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMobile}
              className="text-3xl font-medium tracking-tight text-[var(--color-fg)]"
            >
              {link.label}
            </a>
          ))}
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noreferrer"
            onClick={closeMobile}
            className="pill mt-4 h-12 justify-center bg-[var(--color-cta-bg)] text-[var(--color-cta-fg)] hover:bg-[var(--color-cta-bg-hover)] border-transparent text-sm"
          >
            Open in Telegram
          </a>
        </nav>
      </div>
    </>
  );
}

export default Nav;
