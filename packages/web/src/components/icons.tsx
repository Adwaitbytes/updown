import * as React from "react";

type SVGProps = React.SVGProps<SVGSVGElement> & { size?: number };

const sized = ({ size, width, height, ...rest }: SVGProps) => ({
  width: size ?? width ?? 24,
  height: size ?? height ?? 24,
  ...rest,
});

/**
 * Voxa "Echo V" mark. Three nested chevron strokes form a V silhouette
 * with reverberation, suggesting voice plus its echo. Uses currentColor so
 * it can be tinted by a parent class.
 */
export function VoxaMark(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...sized(props)}
    >
      <path
        d="M2.5 12 L16 28.5 L29.5 12"
        strokeWidth={1.4}
        opacity={0.28}
      />
      <path
        d="M5 10 L16 24.5 L27 10"
        strokeWidth={1.7}
        opacity={0.55}
      />
      <path d="M7.5 8 L16 20.5 L24.5 8" strokeWidth={2.3} />
    </svg>
  );
}

export function AppleIcon(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...sized(props)}
    >
      <path d="M16.365 1.43c0 1.14-.42 2.13-1.25 2.97-1 .99-2.2 1.56-3.5 1.46-.07-1.13.4-2.18 1.21-3.01.81-.84 2.16-1.45 3.54-1.42zM20.5 17.4c-.6 1.4-.9 2.03-1.66 3.27-1.05 1.71-2.53 3.84-4.36 3.86-1.62.02-2.04-1.06-4.24-1.05-2.2.01-2.66 1.07-4.28 1.05-1.83-.04-3.23-1.95-4.28-3.66C-.83 16.45-1.04 9.6 3.36 7.4c1.33-.66 2.49-.99 3.85-1.02 1.61-.04 3.13 1.08 4.13 1.08 1 0 2.85-1.34 4.81-1.14.82.04 3.12.33 4.6 2.5-4.04 2.21-3.4 7.99-.25 8.58z" />
    </svg>
  );
}

export function PlayCircle(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ArrowRight(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function ArrowUpRight(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

export function CheckCircle(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6.5" />
    </svg>
  );
}

export function MicSolid(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function Sparkle(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />
    </svg>
  );
}

export function Shield(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M12 3l8 3v6c0 4.5-3.5 8.5-8 9.5-4.5-1-8-5-8-9.5V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function Bolt(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

export function Mail(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export function Calendar(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function FileDoc(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

export function Search(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function Code(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

export function Layers(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M12 3l9 4-9 4-9-4 9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 17l9 4 9-4" />
    </svg>
  );
}

export function Quote(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...sized(props)}
    >
      <path d="M9 5c-3.5 0-6 2.7-6 6.6V19h7v-7H6c0-2.4 1.4-4 3-4V5zm12 0c-3.5 0-6 2.7-6 6.6V19h7v-7h-4c0-2.4 1.4-4 3-4V5z" />
    </svg>
  );
}

export function XSocial(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...sized(props)}
    >
      <path d="M18.244 2H21.5l-7.36 8.41L23 22h-7.062l-5.523-7.226L4.1 22H.84l7.875-9L1 2h7.187l5 6.61L18.244 2zm-1.18 18h1.95L7.04 4H5l12.064 16z" />
    </svg>
  );
}

export function Github(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...sized(props)}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56C20.21 21.39 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function Lock(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function Slack(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M9 13h2v6a2 2 0 1 1-2-2v-4z" />
      <path d="M11 9V7a2 2 0 1 1 2 2h-2z" />
      <path d="M15 11h-6V9a2 2 0 1 1 2-2h4v4z" />
      <path d="M13 15h6a2 2 0 1 1-2 2v-2h-4z" />
    </svg>
  );
}

export function Sun(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
    </svg>
  );
}

export function Moon(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function Brain(props: SVGProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...sized(props)}
    >
      <path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5.7V16a3 3 0 0 0 4 2.8V20a2 2 0 0 0 4 0v-2.2A3 3 0 0 0 17 16v-2.3A3 3 0 0 0 16 8V7a3 3 0 0 0-3-3" />
      <path d="M9 4a3 3 0 0 1 3 3" />
    </svg>
  );
}
