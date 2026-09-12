import { useCallback, useState, type ReactNode } from "react";
import TabBar, { type PatientTab } from "./components/TabBar";
import type { ExerciseId } from "./exercises/exerciseCatalog";
import { exerciseName } from "./exercises/exerciseCatalog";
import { createPlanStep, type Prescription } from "./exercises/prescription";
import ExerciseDetailScreen from "./screens/ExerciseDetailScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ProgramScreen from "./screens/ProgramScreen";
import ProgressScreen from "./screens/ProgressScreen";
import ReadinessScreen from "./screens/ReadinessScreen";
import RoleSelectScreen, { type Role } from "./screens/RoleSelectScreen";
import SessionScreen, { type SessionOutcome } from "./screens/SessionScreen";
import SessionSummaryScreen from "./screens/SessionSummaryScreen";
import TherapistScreen from "./screens/TherapistScreen";
import {
  clearPatientProfile,
  clearSessionHistory,
  createPatientProfile,
  loadPatientProfile,
  recordSession,
  type PatientProfile,
  type SessionRecord,
} from "./state/patientProfile";
import {
  loadStoredPrescription,
  publishPrescription,
  resetPrescription,
  type StoredPrescription,
} from "./state/prescriptionStore";

type Route =
  | { name: "role" }
  | { name: "login" }
  | { name: "therapist" }
  | { name: "home" }
  | { name: "program" }
  | { name: "exercise"; exerciseId: ExerciseId }
  | { name: "progress" }
  | { name: "profile" }
  | { name: "readiness"; plan: Prescription }
  | { name: "session"; plan: Prescription; readiness: number | null }
  | { name: "summary"; record: SessionRecord };

const TAB_FOR_ROUTE: Partial<Record<Route["name"], PatientTab>> = {
  home: "home",
  program: "program",
  exercise: "program",
  progress: "progress",
  profile: "profile",
};

function practicePlan(exerciseId: ExerciseId, source: Prescription): Prescription {
  const prescribed = source.steps.find((step) => step.exerciseId === exerciseId);

  return {
    therapist: source.therapist,
    title: `Practice: ${exerciseName(exerciseId)}`,
    steps: [createPlanStep(exerciseId, prescribed?.targetReps ?? 8)],
  };
}

export default function App() {
  const [profile, setProfile] = useState<PatientProfile | null>(() => loadPatientProfile());
  const [stored, setStored] = useState<StoredPrescription>(() => loadStoredPrescription());
  const [route, setRoute] = useState<Route>(() =>
    loadPatientProfile() ? { name: "home" } : { name: "role" },
  );

  const plan = stored.plan;

  const go = useCallback((next: Route) => {
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  function handleSelectRole(role: Role) {
    if (role === "therapist") {
      go({ name: "therapist" });
      return;
    }

    go(profile ? { name: "home" } : { name: "login" });
  }

  function handleLogin(name: string) {
    setProfile(createPatientProfile(name));
    go({ name: "home" });
  }

  function handleSwitchUser() {
    clearPatientProfile();
    setProfile(null);
    go({ name: "role" });
  }

  function handleClearHistory() {
    if (!profile) {
      return;
    }

    if (window.confirm("Clear every logged session on this device? This can't be undone.")) {
      setProfile(clearSessionHistory(profile));
    }
  }

  function handleFinishSession(outcome: SessionOutcome, sessionPlan: Prescription, readiness: number | null) {
    if (!profile) {
      go({ name: "role" });
      return;
    }

    const updated = recordSession(profile, {
      date: new Date().toISOString(),
      planTitle: sessionPlan.title,
      therapist: sessionPlan.therapist,
      readiness,
      durationMs: outcome.durationMs,
      steps: outcome.steps,
    });

    setProfile(updated);
    go({ name: "summary", record: updated.sessions[updated.sessions.length - 1] });
  }

  function handlePublish(nextPlan: Prescription) {
    setStored(publishPrescription(nextPlan));
  }

  function handleResetPrescription() {
    setStored(resetPrescription());
  }

  /* ---------- therapist + auth routes ---------- */

  if (route.name === "therapist") {
    return (
      <TherapistScreen
        stored={stored}
        patient={profile}
        onPublish={handlePublish}
        onResetToDefault={handleResetPrescription}
        onBack={() => go({ name: "role" })}
        onPreviewAsPatient={() => go(profile ? { name: "home" } : { name: "login" })}
      />
    );
  }

  if (route.name === "login") {
    return (
      <LoginScreen
        therapistName={plan.therapist}
        onLogin={handleLogin}
        onBack={() => go({ name: "role" })}
      />
    );
  }

  if (route.name === "role" || !profile) {
    return <RoleSelectScreen onSelectRole={handleSelectRole} />;
  }

  /* ---------- session flow (no tab bar) ---------- */

  if (route.name === "readiness") {
    const sessionPlan = route.plan;

    return (
      <ReadinessScreen
        plan={sessionPlan}
        onContinue={(readiness) => go({ name: "session", plan: sessionPlan, readiness })}
        onBack={() => go({ name: "home" })}
      />
    );
  }

  if (route.name === "session") {
    const { plan: sessionPlan, readiness } = route;

    return (
      <SessionScreen
        key={sessionPlan.title}
        plan={sessionPlan}
        onFinish={(outcome) => handleFinishSession(outcome, sessionPlan, readiness)}
        onExit={() => go({ name: "home" })}
      />
    );
  }

  if (route.name === "summary") {
    return (
      <SessionSummaryScreen
        record={route.record}
        profile={profile}
        onDone={() => go({ name: "home" })}
        onViewProgress={() => go({ name: "progress" })}
      />
    );
  }

  /* ---------- patient tabs ---------- */

  const startPrescribed = () => go({ name: "readiness", plan });
  let page: ReactNode;

  switch (route.name) {
    case "program":
      page = (
        <ProgramScreen
          plan={plan}
          onOpenExercise={(exerciseId) => go({ name: "exercise", exerciseId })}
          onStartSession={startPrescribed}
        />
      );
      break;
    case "exercise":
      page = (
        <ExerciseDetailScreen
          exerciseId={route.exerciseId}
          plan={plan}
          onBack={() => go({ name: "program" })}
          onStartSession={startPrescribed}
          onPractice={(exerciseId) =>
            go({ name: "readiness", plan: practicePlan(exerciseId, plan) })
          }
        />
      );
      break;
    case "progress":
      page = <ProgressScreen profile={profile} />;
      break;
    case "profile":
      page = (
        <ProfileScreen
          profile={profile}
          plan={plan}
          onClearHistory={handleClearHistory}
          onSwitchUser={handleSwitchUser}
        />
      );
      break;
    default:
      page = (
        <HomeScreen
          profile={profile}
          plan={plan}
          publishedAt={stored.publishedAt}
          onStartSession={startPrescribed}
          onOpenProgram={() => go({ name: "program" })}
        />
      );
  }

  return (
    <>
      {page}
      <TabBar active={TAB_FOR_ROUTE[route.name] ?? "home"} onSelect={(tab) => go({ name: tab })} />
    </>
  );
}
