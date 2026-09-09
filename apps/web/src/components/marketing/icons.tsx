// Stroke-based inline icons matching the approved homepage mockup — no
// emoji/dingbats, one consistent 24x24 stroke style so they scale and
// recolor cleanly. Purely decorative alongside a visible text label, so
// every icon is aria-hidden; the label carries the meaning for
// screen readers.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export function DedicatedVehicleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 16V8a1 1 0 0 1 1-1h9l4 4h3a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1" />
      <path d="M3 16h1" />
      <path d="M13 16H9" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

export function NoConsolidationIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8l8-4 8 4-8 4-8-4z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </svg>
  );
}

export function SecureDeliveryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function ProofOfDeliveryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="4" width="12" height="16" rx="1.5" />
      <path d="M9 4V3.5A0.5 0.5 0 0 1 9.5 3h5a0.5 0.5 0 0 1 0.5 0.5V4" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function RealTimeTrackingIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.25" />
    </svg>
  );
}

export function BoxesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8l9-5 9 5-9 5-9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
      <path d="M3 8l9 5 9-5" />
    </svg>
  );
}

export function PalletsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4" width="8" height="8" rx="0.5" />
      <path d="M3 16h18" />
      <path d="M3 20h18" />
      <path d="M5 16v4" />
      <path d="M19 16v4" />
      <path d="M12 16v4" />
    </svg>
  );
}

export function EquipmentIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="2.75" />
      <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M6.3 17.7l1.6-1.6M16.1 7.9l1.6-1.6" />
    </svg>
  );
}

export function ConfidentialIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function VerifiedRecipientIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M8 11l2.5 2.5L16 8" />
    </svg>
  );
}

export function SignedPodIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
      <path d="M9 15c1.5-1.5 3.5-1.5 5 0" />
      <path d="M9 18h6" />
    </svg>
  );
}
