import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import TabBar, { type PatientTab } from "./components/TabBar";
import type { ExerciseId } from "./exercises/exerciseCatalog";
import { exerciseName } from "./exercises/exerciseCatalog";
import { codesMatch, createPlanStep, type Prescription } from "./exercises/prescription";
import { loadReferenceExercise } from "./exercises/custom/referenceExercise";
import ChatScreen from "./screens/ChatScreen";
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
import TherapistInboxScreen from "./screens/TherapistInboxScreen";
import TherapistScreen from "./screens/TherapistScreen";
import {
  fetchExerciseReferences,
  fetchClinicPlan,
  fetchClinicSessions,
  isClinicCloudEnabled,
  normalizeClinicCode,
  publishClinicPlan,
  publishClinicSession,
  publishExerciseReference,
  subscribeClinic,
  subscribeExerciseReferences,
  type ClinicSession,
  type SharedExerciseReference,
} from "./state/clinicCloud";
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
  consumeSharedPlanFromUrl,
  loadStoredPrescription,
  publishPrescription,
  resetPrescription,
  saveStoredPrescription,
  type StoredPrescription,
} from "./state/prescriptionStore";

type Route =
  | { name: "role" }
  | { name: "login" }
  | { name: "therapist"; draft?: Prescription }
  | { name: "inbox" }
  | { name: "therapistChat"; patientName: string }
  | { name: "therapist-record"; draft: Prescription }
  | { name: "home" }
  | { name: "program" }
  | { name: "exercise"; exerciseId: ExerciseId }
  | { name: "progress" }
  | { name: "chat" }
  | { name: "profile" }
  | { name: "readiness"; plan: Prescription }
  | { name: "session"; plan: Prescription; readiness: number | null }
  | { name: "summary"; record: SessionRecord };

const TAB_FOR_ROUTE: Partial<Record<Route["name"], PatientTab>> = {
  home: "home",
  program: "program",
  exercise: "program",
  progress: "progress",
  chat: "chat",
  profile: "profile",
};

function practicePlan(exerciseId: ExerciseId, source: Prescription): Prescription {
  const prescribed = source.steps.find((step) => step.exerciseId === exerciseId);

  return {
    therapist: source.therapist,
    title: `Practice: ${prescribed?.referenceExercise?.name ?? exerciseName(exerciseId)}`,
    steps: [
      createPlanStep(exerciseId, prescribed?.targetReps ?? 8, prescribed?.referenceExercise),
    ],
  };
}

function referenceRecordingPlan(source: Prescription): Prescription {
  return {
    therapist: source.therapist,
    title: "Record a custom exercise",
    steps: [createPlanStep("custom", 1, loadReferenceExercise() ?? undefined)],
  };
}

function isRemoteNewer(remote: StoredPrescription, local: StoredPrescription): boolean {
  if (!remote.publishedAt) {
    return false;
  }

  if (!local.publishedAt) {
    return true;
  }

  return Date.parse(remote.publishedAt) >= Date.parse(local.publishedAt);
}

function applyRemotePlan(
  next: StoredPrescription,
  routeName: Route["name"],
  local: StoredPrescription,
  setStored: (stored: StoredPrescription) => void,
) {
  if (routeName === "session" || routeName === "readiness" || routeName === "therapist-record") {
    return;
  }

  if (!isRemoteNewer(next, local)) {
    return;
  }

  setStored(saveStoredPrescription(next));
}

export default function App() {
  const cloudEnabled = isClinicCloudEnabled();
  const [profile, setProfile] = useState<PatientProfile | null>(() => loadPatientProfile());
  const [stored, setStored] = useState<StoredPrescription>(() =>
    consumeSharedPlanFromUrl() ?? loadStoredPrescription(),
  );
  const [clinicSessions, setClinicSessions] = useState<ClinicSession[]>([]);
  const [exerciseReferences, setExerciseReferences] = useState<SharedExerciseReference[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(() =>
    loadPatientProfile() ? { name: "home" } : { name: "role" },
  );
  const routeRef = useRef(route);
  const storedRef = useRef(stored);
  routeRef.current = route;
  storedRef.current = stored;

  const plan = stored.plan;
  const clinicCode = normalizeClinicCode(profile?.clinicCode ?? stored.plan.accessCode);

  const go = useCallback((next: Route) => {
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (!cloudEnabled || !clinicCode) {
      setClinicSessions([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const remote = await fetchClinicPlan(clinicCode);
        if (!cancelled && remote) {
          applyRemotePlan(remote, routeRef.current.name, storedRef.current, setStored);
        }
      } catch {
        // Stay on the last local cache if the clinic is unreachable.
      }

      try {
        const sessions = await fetchClinicSessions(clinicCode);
        if (!cancelled) {
          setClinicSessions(sessions);
        }
      } catch {
        if (!cancelled) {
          setClinicSessions([]);
        }
      }
    })();

    const unsubscribe = subscribeClinic(clinicCode, {
      onPlan(next) {
        applyRemotePlan(next, routeRef.current.name, storedRef.current, setStored);
      },
      onSession(session) {
        setClinicSessions((current) => {
          if (current.some((item) => item.id === session.id)) {
            return current;
          }

          return [session, ...current].slice(0, 40);
        });
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [clinicCode, cloudEnabled]);

  useEffect(() => {
    if (!cloudEnabled) {
      setExerciseReferences([]);
      return;
    }

    let cancelled = false;

    void fetchExerciseReferences()
      .then((references) => {
        if (!cancelled) {
          setExerciseReferences(references);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExerciseReferences([]);
        }
      });

    const unsubscribe = subscribeExerciseReferences((reference) => {
      setExerciseReferences((current) =>
        current.some((item) => item.id === reference.id)
          ? current
          : [reference, ...current].slice(0, 100),
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cloudEnabled]);

  function handleSelectRole(role: Role) {
    if (role === "therapist") {
      go({ name: "therapist" });
      return;
    }

    go(profile ? { name: "home" } : { name: "login" });
  }

  async function handleLogin(name: string, code: string) {
    const trimmedCode = code.trim();

    if (cloudEnabled) {
      if (!trimmedCode) {
        setLoginError("Enter the access code your therapist published.");
        return;
      }

      try {
        const remote = await fetchClinicPlan(trimmedCode);

        if (!remote) {
          setLoginError("No published plan for that code yet. Ask your therapist to publish first.");
          return;
        }

        setLoginError(null);
        setStored(saveStoredPrescription(remote));
        setProfile(createPatientProfile(name, normalizeClinicCode(trimmedCode)));
        go({ name: "home" });
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : "Could not reach the clinic.");
      }

      return;
    }

    if (!codesMatch(plan.accessCode, trimmedCode)) {
      setLoginError("That therapist code does not match this plan.");
      return;
    }

    setLoginError(null);
    setProfile(createPatientProfile(name, plan.accessCode));
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
    const latest = updated.sessions[updated.sessions.length - 1];
    const sessionClinic = normalizeClinicCode(updated.clinicCode ?? sessionPlan.accessCode);

    setProfile(updated);

    if (cloudEnabled && sessionClinic && latest) {
      void publishClinicSession(sessionClinic, updated.name, latest).catch(() => {
        // Local history still saved.
      });
    }

    go({ name: "summary", record: latest });
  }

  async function handlePublish(nextPlan: Prescription) {
    const local = publishPrescription(nextPlan);
    setStored(local);

    if (!cloudEnabled) {
      return;
    }

    await publishClinicPlan(local);
  }

  function handleResetPrescription() {
    setStored(resetPrescription());
  }

  if (route.name === "therapist") {
    return (
      <TherapistScreen
        stored={stored}
        initialDraft={route.draft}
        patient={profile}
        clinicSessions={clinicSessions}
        exerciseReferences={exerciseReferences}
        cloudEnabled={cloudEnabled}
        onPublish={handlePublish}
        onResetToDefault={handleResetPrescription}
        onBack={() => go({ name: "role" })}
        onPreviewAsPatient={() => go(profile ? { name: "home" } : { name: "login" })}
        onOpenInbox={() => go({ name: "inbox" })}
        onRecordCustomExercise={(draft) => go({ name: "therapist-record", draft })}
      />
    );
  }

  if (route.name === "therapist-record") {
    return (
      <SessionScreen
        plan={referenceRecordingPlan(route.draft)}
        referenceAuthoring
        onReferenceSaved={async (referenceExercise) => {
          if (cloudEnabled) {
            const saved = await publishExerciseReference(route.draft.therapist, referenceExercise);
            setExerciseReferences((current) =>
              current.some((item) => item.id === saved.id) ? current : [saved, ...current],
            );
          }

          go({
            name: "therapist",
            draft: route.draft,
          });
        }}
        onFinish={() => go({ name: "therapist", draft: route.draft })}
        onExit={() => go({ name: "therapist", draft: route.draft })}
      />
    );
  }

  if (route.name === "inbox") {
    return (
      <TherapistInboxScreen
        patient={profile}
        clinicSessions={clinicSessions}
        clinicCode={clinicCode}
        cloudEnabled={cloudEnabled}
        onOpenChat={(patientName) => go({ name: "therapistChat", patientName })}
        onBack={() => go({ name: "therapist" })}
      />
    );
  }

  if (route.name === "therapistChat") {
    return (
      <ChatScreen
        key={route.patientName}
        peerName={route.patientName}
        patientName={route.patientName}
        sender="therapist"
        clinicCode={clinicCode}
        cloudEnabled={cloudEnabled}
        onBack={() => go({ name: "inbox" })}
      />
    );
  }

  if (route.name === "login") {
    return (
      <LoginScreen
        therapistName={plan.therapist}
        cloudEnabled={cloudEnabled}
        onLogin={handleLogin}
        requiresCode={cloudEnabled || Boolean(plan.accessCode)}
        loginError={loginError}
        onBack={() => {
          setLoginError(null);
          go({ name: "role" });
        }}
      />
    );
  }

  if (route.name === "role" || !profile) {
    return <RoleSelectScreen cloudEnabled={cloudEnabled} onSelectRole={handleSelectRole} />;
  }

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
        key={sessionPlan.steps.map((step) => `${step.id}:${step.exerciseId}:${step.targetReps}`).join("|")}
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
    case "chat":
      page = (
        <ChatScreen
          peerName={plan.therapist}
          patientName={profile.name}
          sender="patient"
          clinicCode={clinicCode}
          cloudEnabled={cloudEnabled}
        />
      );
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
          liveClinic={cloudEnabled && Boolean(clinicCode)}
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
