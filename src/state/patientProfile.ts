export type SessionRecord = {
  date: string;
  reps: number;
  target: number;
  /** 0-4 readiness pick from the pre-session check-in, or null if skipped. */
  readiness: number | null;
};

export type PatientProfile = {
  name: string;
  createdAt: string;
  sessions: SessionRecord[];
};

export const READINESS_LABELS = ["Rough", "Sore", "Okay", "Good", "Great"];

const STORAGE_KEY = "physioloop.patient";

function isoDate(date: Date): string {
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
    return raw ? (JSON.parse(raw) as PatientProfile) : null;
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
  record: SessionRecord,
): PatientProfile {
  const updated: PatientProfile = { ...profile, sessions: [...profile.sessions, record] };
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

/**
 * Consecutive days with a session, walking back from today. A day without a
 * session yet still counts as "in progress" rather than breaking the streak,
 * so it only actually resets once a day is missed entirely.
 */
export function currentStreak(profile: PatientProfile): number {
  const days = new Set(profile.sessions.map((session) => session.date.slice(0, 10)));
  const cursor = new Date();

  if (!days.has(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (days.has(isoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
