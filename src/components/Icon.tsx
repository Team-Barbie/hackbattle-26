import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "program"
  | "progress"
  | "profile"
  | "back"
  | "forward"
  | "play"
  | "camera"
  | "camera-off"
  | "skeleton"
  | "voice"
  | "voice-off"
  | "reset"
  | "restart"
  | "record"
  | "stop"
  | "trash"
  | "plus"
  | "up"
  | "down"
  | "check"
  | "info"
  | "patient"
  | "therapist"
  | "logo";

const PATHS: Record<IconName, string> = {
  home: "M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z",
  program: "M5 6h14M5 12h14M5 18h9",
  progress: "M4 19h16M7 16V9M12 16V5M17 16v-4",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  back: "M15 5l-7 7 7 7",
  forward: "M9 5l7 7-7 7",
  play: "M8 5v14l11-7z",
  camera: "M4 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 10l4-2v8l-4-2",
  "camera-off": "M4 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 10l4-2v8l-4-2M3 3l18 18",
  skeleton: "M12 4v6M12 10l-5 4M12 10l5 4M12 10v5M12 15l-3 5M12 15l3 5M8 6h8",
  voice: "M5 10v4M9 6v12M13 9v6M17 4v16M21 10v4",
  "voice-off": "M5 10v4M9 6v12M13 9v6M17 4v16M21 10v4M3 3l18 18",
  reset: "M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5",
  restart: "M4 12a8 8 0 1 1 2.3 5.6M4 20v-5h5M12 8v4l3 2",
  record: "M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0",
  stop: "M7 7h10v10H7z",
  trash: "M5 7h14M9 7V4h6v3M8 7l1 13h6l1-13",
  plus: "M12 5v14M5 12h14",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  check: "M5 12l5 5L20 7",
  info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  patient: "M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M12 14v3M10.5 15.5h3",
  therapist: "M9 4h6v3H9zM6 7h12v13H6zM12 11v5M9.5 13.5h5",
  logo: "M5 13c2-6 5-6 7 0s5 6 7 0M5 13v0M19 13v0",
};

type Props = SVGProps<SVGSVGElement> & {
  name: IconName;
  /** Filled glyphs (play, home, record, stop) render as solid shapes. */
  solid?: boolean;
};

export default function Icon({ name, solid = false, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={solid ? "currentColor" : "none"}
      stroke={solid ? "none" : "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
