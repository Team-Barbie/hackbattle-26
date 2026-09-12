import type { ExerciseId } from "../exercises/exerciseCatalog";

export type StepResult = {
  exerciseId: ExerciseId;
  targetReps: number;
  reps: number;
};

export type SessionRecord = {
  id: string;
  /** ISO timestamp for when the session was finished. */
  date: string;
  planTitle: string;
  therapist: string;
  /** 0-4 readiness pick from the pre-session check-in, or null if skipped. */
  readiness: number | null;
  durationMs: number;
  steps: StepResult[];
};

export type PatientProfile = {
  name: string;
  createdAt: string;
  sessions: SessionRecord[];
};

export const READINESS_LABELS = ["Rough", "Sore", "Okay", "Good", "Great"] as const;

const STORAGE_KEY = "physioloop.patient";

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function save(profile: PatientProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Private browsing or a full quota — the session still works, it just won't persist.
  }
}

export function loadPatientProfile(): PatientProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PatientProfile>;

    if (typeof parsed.name !== "string") {
      return null;
    }

    return {
      name: parsed.name,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      // Drop records from the older squat-only schema that have no per-step results.
      sessions: (parsed.sessions ?? []).filter((session) => Array.isArray(session.steps)),
    };
  } catch {
    return null;
  }
}

export function createPatientProfile(name: string): PatientProfile {
  const profile: PatientProfile = { name, createdAt: new Date().toISOString(), sessions: [] };
  save(profile);
  return profile;
}

export function recordSession(
  profile: PatientProfile,
  record: Omit<SessionRecord, "id">,
): PatientProfile {
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const updated: PatientProfile = { ...profile, sessions: [...profile.sessions, { id, ...record }] };
  save(updated);
  return updated;
}

export function clearSessionHistory(profile: PatientProfile): PatientProfile {
  const updated: PatientProfile = { ...profile, sessions: [] };
  save(updated);
  return updated;
}

export function clearPatientProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ---------- derived stats ---------- */

export function sessionReps(session: SessionRecord): number {
  return session.steps.reduce((total, step) => total + step.reps, 0);
}

export function sessionTarget(session: SessionRecord): number {
  return session.steps.reduce((total, step) => total + step.targetReps, 0);
}

/** 0-1 share of prescribed reps actually completed. */
export function sessionCompletion(session: SessionRecord): number {
  const target = sessionTarget(session);
  return target > 0 ? Math.min(1, sessionReps(session) / target) : 0;
}

export function lastSession(profile: PatientProfile): SessionRecord | null {
  return profile.sessions.length > 0 ? profile.sessions[profile.sessions.length - 1] : null;
}

export function totalReps(profile: PatientProfile): number {
  return profile.sessions.reduce((total, session) => total + sessionReps(session), 0);
}

/**
 * Consecutive days with a session, walking back from today. A day without a
 * session yet still counts as "in progress" rather than breaking the streak,
 * so it only actually resets once a day is missed entirely.
 */
export function currentStreak(profile: PatientProfile): number {
  const days = new Set(profile.sessions.map((session) => session.date.slice(0, 10)));
  const cursor = new Date();

  if (!days.has(isoDay(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (days.has(isoDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export type DayActivity = {
  /** ISO day, YYYY-MM-DD. */
  day: string;
  /** Single-letter weekday label. */
  label: string;
  reps: number;
  sessions: number;
  isToday: boolean;
};

/** Reps and session counts for the trailing `days` days, oldest first. */
export function recentActivity(profile: PatientProfile, days = 7): DayActivity[] {
  const buckets = new Map<string, { reps: number; sessions: number }>();

  for (const session of profile.sessions) {
    const day = session.date.slice(0, 10);
    const bucket = buckets.get(day) ?? { reps: 0, sessions: 0 };
    bucket.reps += sessionReps(session);
    bucket.sessions += 1;
    buckets.set(day, bucket);
  }

  const today = new Date();
  const result: DayActivity[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const day = isoDay(date);
    const bucket = buckets.get(day);

    result.push({
      day,
      label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
      reps: bucket?.reps ?? 0,
      sessions: bucket?.sessions ?? 0,
      isToday: offset === 0,
    });
  }

  return result;
}

export function sessionsThisWeek(profile: PatientProfile): number {
  return recentActivity(profile, 7).reduce((total, day) => total + day.sessions, 0);
}
