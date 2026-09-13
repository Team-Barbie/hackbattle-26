export type ActiveRole = "patient" | "therapist";

const STORAGE_KEY = "physioloop.role";

export function loadActiveRole(): ActiveRole | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "patient" || raw === "therapist" ? raw : null;
  } catch {
    return null;
  }
}

export function saveActiveRole(role: ActiveRole): ActiveRole {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // Session still works for this visit.
  }

  return role;
}

export function clearActiveRole() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function routeForSession(
  role: ActiveRole | null,
  hasPatient: boolean,
): "therapist" | "home" | "login" | "role" {
  if (role === "therapist") {
    return "therapist";
  }

  if (role === "patient") {
    return hasPatient ? "home" : "login";
  }

  return hasPatient ? "home" : "role";
}
