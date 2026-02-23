import React from "react";

// ─────────────────────────────────────────────
// LicitaPH Icon System
// Design: Geometric line-art, 1.75px stroke,
// rounded caps, cohesive visual language
// ─────────────────────────────────────────────

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

const defaults = {
  size: 20,
  color: "currentColor",
};

const svgBase = (size: number, color: string): React.SVGAttributes<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  stroke: color,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

// ═══════════════════════════════════════════════
// SERVICE CATEGORY ICONS
// ═══════════════════════════════════════════════

export function Shield({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M12 2L3.5 6v4.5c0 5.25 3.63 10.16 8.5 11.5 4.87-1.34 8.5-6.25 8.5-11.5V6L12 2z" />
      <circle cx="12" cy="11" r="2" />
      <line x1="12" y1="13" x2="12" y2="16" />
    </svg>
  );
}

export function Broom({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <line x1="5" y1="19" x2="14" y2="7" />
      <path d="M14 7l3-4.5" />
      <path d="M11.5 10.5c-3 1-5.5 4-7 8l1.5 1c2.5-2 6-3.5 8.5-3l-1-2.5" />
    </svg>
  );
}

export function Elevator({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="3" y="2" width="18" height="20" rx="2" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <polyline points="7,10 7.5,7 8,10" />
      <polyline points="16,14 16.5,17 17,14" />
      <line x1="7.5" y1="7" x2="7.5" y2="17" />
      <line x1="16.5" y1="7" x2="16.5" y2="17" />
    </svg>
  );
}

export function Pool({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M2 16c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M2 20c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <line x1="7" y1="4" x2="7" y2="13" />
      <line x1="17" y1="4" x2="17" y2="13" />
      <line x1="7" y1="8" x2="17" y2="8" />
    </svg>
  );
}

export function PaintRoller({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="3" y="3" width="14" height="5" rx="1.5" />
      <line x1="17" y1="5.5" x2="20" y2="5.5" />
      <line x1="20" y1="5.5" x2="20" y2="11" />
      <line x1="20" y1="11" x2="13" y2="11" />
      <line x1="13" y1="11" x2="13" y2="21" />
    </svg>
  );
}

export function WaterDrop({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M12 2.5C12 2.5 5 10.5 5 14.5a7 7 0 0014 0c0-4-7-12-7-12z" />
      <path d="M9.5 14a2.5 2.5 0 005 0" />
    </svg>
  );
}

export function Plant({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M12 22V10" />
      <path d="M12 14c-4 0-7-3-7-7 3.5 0 6.5 2.5 7 7z" />
      <path d="M12 10c3.5 0 6-2.5 6-6-3.5 0-6 2.5-6 6z" />
      <path d="M8 22h8" />
    </svg>
  );
}

export function Snowflake({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="3" y1="7" x2="21" y2="17" />
      <line x1="3" y1="17" x2="21" y2="7" />
      <polyline points="10,3.5 12,2 14,3.5" />
      <polyline points="10,20.5 12,22 14,20.5" />
      <polyline points="4.5,8.5 3,7 4.5,5.5" />
      <polyline points="19.5,18.5 21,17 19.5,15.5" />
      <polyline points="4.5,18.5 3,17 4.5,15.5" />
      <polyline points="19.5,8.5 21,7 19.5,5.5" />
    </svg>
  );
}

export function Lightning({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <polygon points="13,2 6,13 12,13 11,22 18,11 12,11" />
    </svg>
  );
}

export function Wrench({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94L6.73 20.2a2 2 0 01-2.83 0l-.1-.1a2 2 0 010-2.83l6.73-6.73A6 6 0 0114.7 6.3z" />
    </svg>
  );
}

export function Camera({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M3 8h3l1-2h10l1 2h3a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <circle cx="12" cy="14" r="3.5" />
      <line x1="2" y1="5" x2="7" y2="5" />
    </svg>
  );
}

export function Construction({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <line x1="5" y1="22" x2="5" y2="8" />
      <line x1="5" y1="8" x2="19" y2="8" />
      <line x1="19" y1="8" x2="19" y2="12" />
      <line x1="15" y1="8" x2="15" y2="22" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <path d="M9 12v4l3-2 3 2v-4" />
      <line x1="2" y1="22" x2="22" y2="22" />
    </svg>
  );
}

export function Rain({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M18 10a4 4 0 00-4-4 5 5 0 00-9.5 1.5A3.5 3.5 0 005.5 14h12a3 3 0 001-5.82" />
      <line x1="8" y1="17" x2="7" y2="20" />
      <line x1="12" y1="17" x2="11" y2="20" />
      <line x1="16" y1="17" x2="15" y2="20" />
    </svg>
  );
}

export function Bug({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <ellipse cx="12" cy="14" rx="5" ry="6" />
      <line x1="12" y1="8" x2="12" y2="20" />
      <line x1="7" y1="14" x2="17" y2="14" />
      <path d="M7.5 10L4 7" />
      <path d="M16.5 10L20 7" />
      <path d="M7 17l-3 2" />
      <path d="M17 17l3 2" />
      <circle cx="10" cy="10.5" r="0.75" fill={color} stroke="none" />
      <circle cx="14" cy="10.5" r="0.75" fill={color} stroke="none" />
    </svg>
  );
}

export function BatteryIcon({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <line x1="22" y1="10" x2="22" y2="14" />
      <rect x="4.5" y="9.5" width="7" height="5" rx="0.5" fill={color} stroke="none" opacity={0.3} />
      <polygon points="12,9.5 10,12 12.5,12 11,14.5 14,12 11.5,12" fill={color} stroke="none" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// BUILDINGS & ENTITIES
// ═══════════════════════════════════════════════

export function Building({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="4" y="3" width="16" height="19" rx="1" />
      <line x1="4" y1="22" x2="20" y2="22" />
      <rect x="7" y="6" width="3" height="2.5" rx="0.5" />
      <rect x="14" y="6" width="3" height="2.5" rx="0.5" />
      <rect x="7" y="11" width="3" height="2.5" rx="0.5" />
      <rect x="14" y="11" width="3" height="2.5" rx="0.5" />
      <rect x="10" y="17" width="4" height="5" rx="0.5" />
    </svg>
  );
}

export function Monument({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M3 21h18" />
      <path d="M5 21v-3h14v3" />
      <path d="M7 18V9" />
      <path d="M11 18V9" />
      <path d="M13 18V9" />
      <path d="M17 18V9" />
      <path d="M5 9h14" />
      <path d="M6 9l6-6 6 6" />
    </svg>
  );
}

export function House({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <rect x="9.5" y="14" width="5" height="7" rx="0.5" />
    </svg>
  );
}

export function HardHat({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M3 15h18" />
      <path d="M4 15c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      <line x1="12" y1="3" x2="12" y2="7" />
      <path d="M5 15v2a1 1 0 001 1h12a1 1 0 001-1v-2" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// DOCUMENTS & DATA
// ═══════════════════════════════════════════════

export function Clipboard({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="5" y="4" width="14" height="18" rx="1.5" />
      <path d="M9 2h6a1 1 0 011 1v2H8V3a1 1 0 011-1z" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="13.5" x2="15" y2="13.5" />
      <line x1="9" y1="17" x2="12" y2="17" />
    </svg>
  );
}

export function DocumentIcon({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M6 2h8l6 6v13a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="16.5" x2="14" y2="16.5" />
    </svg>
  );
}

export function Chart({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <line x1="3" y1="21" x2="21" y2="21" />
      <rect x="5" y="12" width="3.5" height="9" rx="0.75" />
      <rect x="10.25" y="6" width="3.5" height="15" rx="0.75" />
      <rect x="15.5" y="9" width="3.5" height="12" rx="0.75" />
    </svg>
  );
}

export function Upload({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <polyline points="16,6 12,2 8,6" />
      <line x1="12" y1="2" x2="12" y2="16" />
      <path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5" />
    </svg>
  );
}

export function Download({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <polyline points="8,12 12,16 16,12" />
      <line x1="12" y1="2" x2="12" y2="16" />
      <path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5" />
    </svg>
  );
}

export function TrendUp({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <polyline points="22,6 16,6 16,12" />
      <path d="M2 18l6.5-6.5 4 4L22 6" />
    </svg>
  );
}

export function Folder({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
    </svg>
  );
}

export function Paperclip({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// ACTIONS & STATUS
// ═══════════════════════════════════════════════

export function Check({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="12" cy="12" r="9.5" />
      <polyline points="8,12.5 10.5,15 16,9.5" />
    </svg>
  );
}

export function CheckSimple({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <polyline points="4,12.5 9,17.5 20,6.5" />
    </svg>
  );
}

export function Cross({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="12" cy="12" r="9.5" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

export function CrossSimple({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function Bell({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

export function Eye({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function Chat({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M21 12a9 9 0 01-9 9 9.1 9.1 0 01-4.68-1.3L3 21l1.3-4.32A9 9 0 1121 12z" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="13.5" x2="13" y2="13.5" />
    </svg>
  );
}

export function Robot({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="4" y="8" width="16" height="12" rx="2.5" />
      <line x1="12" y1="4" x2="12" y2="8" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="9" cy="13" r="1.5" />
      <circle cx="15" cy="13" r="1.5" />
      <path d="M9.5 17h5" />
      <line x1="2" y1="13" x2="4" y2="13" />
      <line x1="20" y1="13" x2="22" y2="13" />
    </svg>
  );
}

export function SearchIcon({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
    </svg>
  );
}

export function Edit({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      <line x1="15" y1="5" x2="19" y2="9" />
    </svg>
  );
}

export function Trash({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M9 6V3.5a1 1 0 011-1h4a1 1 0 011 1V6" />
      <line x1="10" y1="10" x2="10" y2="18" />
      <line x1="14" y1="10" x2="14" y2="18" />
    </svg>
  );
}

export function Save({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2z" />
      <polyline points="15,3 15,8 9,8" />
      <rect x="7" y="14" width="10" height="7" rx="0.5" />
    </svg>
  );
}

export function Rocket({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M12 2C12 2 7 7 7 13l5 5 5-5c0-6-5-11-5-11z" />
      <circle cx="12" cy="12" r="2" />
      <path d="M7 13l-3 3 2 2" />
      <path d="M17 13l3 3-2 2" />
      <path d="M10 20l2 2 2-2" />
    </svg>
  );
}

export function LinkIcon({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M10 13a5 5 0 007.07.01l2-2a5 5 0 00-7.07-7.07l-1.12 1.12" />
      <path d="M14 11a5 5 0 00-7.07-.01l-2 2a5 5 0 007.07 7.07l1.12-1.12" />
    </svg>
  );
}

export function Globe({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="12" cy="12" r="10" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M4.5 7h15" />
      <path d="M4.5 17h15" />
    </svg>
  );
}

export function Target({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function Pin({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function Handshake({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M2 11l4-4 4 2 4-4 4 2 4-2" />
      <path d="M2 11l3 3 4.5-2 3 3 4-3 3.5 2" />
      <path d="M6 14l3 3" />
      <path d="M13 15l3 3" />
    </svg>
  );
}

export function ImageIcon({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.75" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  );
}

export function Lock({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
      <circle cx="12" cy="15.5" r="1.25" fill={color} stroke="none" />
      <line x1="12" y1="16.75" x2="12" y2="18.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// FINANCIAL
// ═══════════════════════════════════════════════

export function Money({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="5" x2="12" y2="19" />
      <path d="M8 8.5C8 7.12 9.79 6 12 6s4 1.12 4 2.5S14.21 11 12 11 8 12.12 8 13.5 9.79 16 12 16s4-1.12 4-2.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// TIME & CALENDAR
// ═══════════════════════════════════════════════

export function Clock({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

export function Calendar({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <rect x="7" y="13" width="3" height="3" rx="0.5" fill={color} stroke="none" opacity={0.25} />
    </svg>
  );
}

export function CalendarSchedule({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="11" y2="14" />
      <line x1="8" y1="18" x2="14" y2="18" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// PEOPLE
// ═══════════════════════════════════════════════

export function Users({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 21v-2a5 5 0 0110 0v2" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M22 21v-1.5a4 4 0 00-5-3.87" />
    </svg>
  );
}

export function UserIcon({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a6 6 0 0112 0v2" />
    </svg>
  );
}

export function HandRaise({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M18 9V5a1 1 0 00-2 0v6" />
      <path d="M14 9V3a1 1 0 00-2 0v9" />
      <path d="M10 9V5a1 1 0 00-2 0v8" />
      <path d="M6 13V9a1 1 0 00-2 0v5a8 8 0 0016 0v-2a1 1 0 00-2 0" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// ALERTS & INDICATORS
// ═══════════════════════════════════════════════

export function Warning({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13.5" />
      <circle cx="12" cy="16.5" r="0.75" fill={color} stroke="none" />
    </svg>
  );
}

export function RedCircle({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <circle cx="12" cy="12" r="6" fill={color} opacity={0.85} />
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={1.75} opacity={0.3} />
    </svg>
  );
}

export function Hourglass({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M5 3h14" />
      <path d="M5 21h14" />
      <path d="M7 3v4.5L12 12l-5 4.5V21" />
      <path d="M17 3v4.5L12 12l5 4.5V21" />
    </svg>
  );
}

export function Party({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M4 21l3.5-14L18 10.5z" />
      <line x1="9" y1="13" x2="6.5" y2="18" />
      <circle cx="16" cy="5" r="1" fill={color} stroke="none" />
      <circle cx="20" cy="9" r="0.75" fill={color} stroke="none" />
      <circle cx="19" cy="3" r="0.75" fill={color} stroke="none" />
      <path d="M14.5 2l.5 2" />
      <path d="M21 6l-2 .5" />
      <path d="M20 12l-1.5-1" />
    </svg>
  );
}

export function Star({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" style={style}>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarEmpty({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarHalf({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <clipPath id="starHalfClip">
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={color}
        clipPath="url(#starHalfClip)"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// COMMUNICATION
// ═══════════════════════════════════════════════

export function EmailIcon({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,6 12,14 2,6" />
    </svg>
  );
}

export function Phone({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  );
}

export function CityIcon({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="2" y="10" width="6" height="12" />
      <rect x="9" y="4" width="6" height="18" />
      <rect x="16" y="8" width="6" height="14" />
      <line x1="4" y1="13" x2="6" y2="13" />
      <line x1="4" y1="16" x2="6" y2="16" />
      <line x1="11.5" y1="8" x2="13" y2="8" />
      <line x1="11.5" y1="11" x2="13" y2="11" />
      <line x1="11.5" y1="14" x2="13" y2="14" />
      <line x1="18.5" y1="11" x2="20" y2="11" />
      <line x1="18.5" y1="14" x2="20" y2="14" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// UI ELEMENTS
// ═══════════════════════════════════════════════

export function Menu({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export function Heart({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

export function Flag({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <line x1="5" y1="2" x2="5" y2="22" />
      <path d="M5 3h14l-3 4.5L19 12H5" />
    </svg>
  );
}

export function Note({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <rect x="4" y="2" width="16" height="20" rx="1.5" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="13" y2="14" />
      <path d="M14 18l2 2 4-4" />
    </svg>
  );
}

export function ShieldCheck({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg {...svgBase(size, color)} style={style}>
      <path d="M12 2L3.5 6v4.5c0 5.25 3.63 10.16 8.5 11.5 4.87-1.34 8.5-6.25 8.5-11.5V6L12 2z" />
      <polyline points="8.5,12 10.75,14.5 15.5,9.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════
// GENERIC ICON WRAPPER
// ═══════════════════════════════════════════════

const ALL_ICONS: Record<string, React.FC<IconProps>> = {
  shield: Shield,
  broom: Broom,
  elevator: Elevator,
  pool: Pool,
  paintroller: PaintRoller,
  waterdrop: WaterDrop,
  plant: Plant,
  snowflake: Snowflake,
  lightning: Lightning,
  wrench: Wrench,
  camera: Camera,
  construction: Construction,
  rain: Rain,
  bug: Bug,
  battery: BatteryIcon,
  building: Building,
  monument: Monument,
  house: House,
  hardhat: HardHat,
  clipboard: Clipboard,
  document: DocumentIcon,
  chart: Chart,
  upload: Upload,
  download: Download,
  trendup: TrendUp,
  folder: Folder,
  paperclip: Paperclip,
  check: Check,
  checksimple: CheckSimple,
  cross: Cross,
  crosssimple: CrossSimple,
  bell: Bell,
  eye: Eye,
  chat: Chat,
  robot: Robot,
  search: SearchIcon,
  edit: Edit,
  trash: Trash,
  save: Save,
  rocket: Rocket,
  link: LinkIcon,
  globe: Globe,
  target: Target,
  pin: Pin,
  handshake: Handshake,
  image: ImageIcon,
  lock: Lock,
  money: Money,
  clock: Clock,
  calendar: Calendar,
  calendarschedule: CalendarSchedule,
  users: Users,
  user: UserIcon,
  handraise: HandRaise,
  warning: Warning,
  redcircle: RedCircle,
  hourglass: Hourglass,
  party: Party,
  star: Star,
  starempty: StarEmpty,
  starhalf: StarHalf,
  email: EmailIcon,
  phone: Phone,
  city: CityIcon,
  menu: Menu,
  heart: Heart,
  flag: Flag,
  note: Note,
  shieldcheck: ShieldCheck,
};

/** Generic icon resolver — pass a name string to render the matching icon */
export function Icon({
  name,
  size = defaults.size,
  color = defaults.color,
  style,
}: IconProps & { name: string }) {
  const Comp = ALL_ICONS[name.toLowerCase()];
  if (!Comp) return null;
  return <Comp size={size} color={color} style={style} />;
}

// ═══════════════════════════════════════════════
// CATEGORY MAP — maps tender category strings
// to their icon components
// ═══════════════════════════════════════════════

export const CATEGORY_ICONS: Record<string, React.FC<IconProps>> = {
  "Seguridad y vigilancia": Shield,
  "seguridad": Shield,
  "Limpieza y conserjería": Broom,
  "limpieza": Broom,
  "Ascensores": Elevator,
  "ascensores": Elevator,
  "Piscinas": Pool,
  "piscinas": Pool,
  "Pintura exterior": PaintRoller,
  "pintura": PaintRoller,
  "Impermeabilización": WaterDrop,
  "impermeabilizacion": WaterDrop,
  "Áreas verdes": Plant,
  "areas_verdes": Plant,
  "HVAC / Aire acondicionado": Snowflake,
  "hvac": Snowflake,
  "Electricidad": Lightning,
  "electricidad": Lightning,
  "Plomería": Wrench,
  "plomeria": Wrench,
  "CCTV / Control de acceso": Camera,
  "cctv": Camera,
  "Remodelaciones": Construction,
  "remodelaciones": Construction,
  "Sistemas pluviales": Rain,
  "pluviales": Rain,
  "Fumigación": Bug,
  "fumigacion": Bug,
  "Generadores": BatteryIcon,
  "generadores": BatteryIcon,
  "Otro": Globe,
  "otro": Globe,
  "Todas": Globe,
  "todas": Globe,
};

// ═══════════════════════════════════════════════
// STATUS MAP — maps status strings to icons
// ═══════════════════════════════════════════════

export const STATUS_ICONS: Record<string, React.FC<IconProps>> = {
  activa: Check,
  borrador: Note,
  en_evaluacion: SearchIcon,
  adjudicada: Party,
  cancelada: Cross,
  enviada: Upload,
  en_revision: SearchIcon,
  ganada: Party,
  no_seleccionada: Cross,
  pendiente: Hourglass,
  urgente: Lightning,
  completado: Check,
  verificada: ShieldCheck,
  rechazada: Cross,
};

export type { IconProps };
