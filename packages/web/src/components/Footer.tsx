import type { JSX } from "react";

type FooterLink = {
  readonly label: string;
  readonly href: string;
};

type FooterColumn = {
  readonly heading: string;
  readonly links: readonly FooterLink[];
};

const COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Telegram bot", href: "https://t.me/UpDownBet_bot" },
      { label: "Mini App", href: "https://t.me/UpDownBet_bot/app" },
      { label: "GitHub", href: "https://github.com/Adwaitbytes/updown" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Move package on Sui", href: "https://suiscan.xyz/testnet/object/0x54b1ab9644a5d250d3009d4073a51d8484f9a388ca10eaa9293b5283dbfa5290" },
      { label: "DeepBook Predict", href: "https://blog.sui.io/introducing-deepbook-predict/" },
      { label: "Hall of Fame channel", href: "https://t.me/UpDownHallOfFame" },
    ],
  },
] as const;

type SocialLink = {
  readonly label: string;
  readonly href: string;
  readonly icon: JSX.Element;
};

const SOCIALS: readonly SocialLink[] = [
  {
    label: "X",
    href: "https://x.com/UpDownBet",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12.6 1.5h2.3l-5 5.7L16 15.5h-4.6l-3.6-4.7-4.1 4.7H1.4L6.7 9.4 1 1.5h4.7l3.3 4.3 3.6-4.3zm-.8 12.6h1.3L4.3 2.8H2.9l8.9 11.3z" />
      </svg>
    ),
  },
  {
    label: "Telegram",
    href: "https://t.me/UpDownBet_bot",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M14.96 2.24a.75.75 0 0 0-.78-.13L1.42 7.06c-.49.19-.49.88-.01 1.07l3.06 1.21 1.18 3.78c.13.42.66.55.97.24l1.74-1.74 3.07 2.27c.36.27.88.07.97-.37l2.7-10.4a.75.75 0 0 0-.14-.88zm-3.27 2.47-5.5 5.05-.22 2.34-1-3.21 6.72-4.18z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com/Adwaitbytes/updown",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.49c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.65-.89-3.65-3.97 0-.88.31-1.59.83-2.15-.08-.21-.36-1.03.08-2.14 0 0 .68-.22 2.22.82a7.7 7.7 0 0 1 4.04 0c1.54-1.04 2.22-.82 2.22-.82.44 1.11.16 1.93.08 2.14.52.56.83 1.27.83 2.15 0 3.08-1.87 3.76-3.66 3.96.29.25.54.74.54 1.49v2.21c0 .21.15.46.55.38A8 8 0 0 0 8 .2z" />
      </svg>
    ),
  },
  {
    label: "Sui Explorer",
    href: "https://suiscan.xyz/testnet/object/0x54b1ab9644a5d250d3009d4073a51d8484f9a388ca10eaa9293b5283dbfa5290",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 1.2a6.8 6.8 0 1 0 0 13.6A6.8 6.8 0 0 0 8 1.2zm2.94 8.65c0 1.55-1.31 2.81-2.94 2.81-1.62 0-2.94-1.26-2.94-2.81 0-.84.39-1.59.97-2.13l1.51-1.4c.27-.25.27-.66 0-.91l-.42-.39a.49.49 0 0 0-.66 0L4.96 6.4a3.91 3.91 0 0 0-1.18 2.81c0 2.32 1.95 4.21 4.36 4.21 2.4 0 4.36-1.89 4.36-4.21 0-1.05-.4-2.06-1.13-2.81L9.94 5.07a.49.49 0 0 0-.67 0l-.42.39c-.27.25-.27.66 0 .91l1.51 1.4c.59.54.98 1.29.98 2.08z" />
      </svg>
    ),
  },
] as const;

export function Footer(): JSX.Element {
  return (
    <footer className="bg-[var(--color-bg-ink)] text-[var(--color-fg-on-ink)]">
      <div className="container-page py-16">
        {/* Row 1: brand + columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand block */}
          <div className="flex flex-col gap-4">
            <span className="text-2xl font-medium tracking-tight">
              Up
              <span style={{ color: "var(--color-down)" }}>/</span>
              Down
            </span>
            <p className="text-sm opacity-70 leading-relaxed">
              Bet on BTC. 15 minutes.
              <br />
              On-chain.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col">
              <h3 className="font-mono text-xs uppercase tracking-wider opacity-50 mb-4">
                {col.heading}
              </h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm opacity-70 hover:opacity-100 hover:text-white transition"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Row 2: copyright + socials */}
        <div className="border-t border-white/10 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span className="font-mono text-xs opacity-50">
            © 2026 Up/Down — Built for Sui Overflow 2026.
          </span>

          <ul className="flex items-center gap-2">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full opacity-70 hover:opacity-100 hover:bg-white/10 transition"
                >
                  {social.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
