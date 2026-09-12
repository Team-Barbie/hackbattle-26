import { useEffect, useState } from "react";
import TabBar, { type PatientTab } from "./components/TabBar";
import ExerciseDetailScreen from "./screens/ExerciseDetailScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ProgramScreen from "./screens/ProgramScreen";
import ProgressScreen from "./screens/ProgressScreen";
import ReadinessScreen from "./screens/ReadinessScreen";
import RoleSelectScreen, { type Role } from "./screens/RoleSelectScreen";
import SessionScreen from "./screens/SessionScreen";
import SessionSummaryScreen from "./screens/SessionSummaryScreen";
import {
  clearPatientProfile,
  createPatientProfile,
  loadPatientProfile,
  recordSession,
  type PatientProfile,
} from "./state/patientProfile";

type Screen =
  | "role"
  | "login"
  | "home"
  | "program"
  | "exerciseDetail"
  | "progress"
  | "profile"
  | "readiness"
  | "session"
  | "summary";

type SessionResult = { reps: number; target: number };

const TAB_SCREENS: Partial<Record<Screen, PatientTab>> = {
  home: "home",
  program: "program",
  exerciseDetail: "program",
  progress: "progress",
  profile: "profile",
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("role");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [pendingReadiness, setPendingReadiness] = useState<number | null>(null);

  useEffect(() => {
    const existing = loadPatientProfile();

    if (existing) {
      setProfile(existing);
      setScreen("home");
    }
  }, []);

  function handleSelectRole(role: Role) {
    if (role === "patient") {
      setScreen("login");
    }
  }

  function handleLogin(name: string) {
    setProfile(createPatientProfile(name));
    setScreen("home");
  }

  function handleSwitchUser() {
    clearPatientProfile();
    setProfile(null);
    setScreen("role");
  }

  function handleReadinessContinue(readiness: number | null) {
    setPendingReadiness(readiness);
    setScreen("session");
  }

  function handleFinishSession(reps: number, target: number) {
    setProfile((current) => {
      if (!current) {
        return current;
      }

      return recordSession(current, {
        date: new Date().toISOString(),
        reps,
        target,
        readiness: pendingReadiness,
      });
    });
    setLastResult({ reps, target });
    setScreen("summary");
  }

  if (screen === "login") {
    return <LoginScreen onLogin={handleLogin} onBack={() => setScreen("role")} />;
  }

  if (screen === "role" || !profile) {
    return <RoleSelectScreen onSelectRole={handleSelectRole} />;
  }

  if (screen === "readiness") {
    return (
      <ReadinessScreen
        onContinue={handleReadinessContinue}
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "session") {
    return (
      <SessionScreen onFinish={handleFinishSession} onBack={() => setScreen("home")} />
    );
  }

  if (screen === "summary" && lastResult) {
    return (
      <SessionSummaryScreen
        reps={lastResult.reps}
        target={lastResult.target}
        onDone={() => setScreen("home")}
      />
    );
  }

  const activeTab = TAB_SCREENS[screen] ?? "home";

  let page = <HomeScreen profile={profile} onStartSession={() => setScreen("readiness")} />;

  if (screen === "program") {
    page = <ProgramScreen onOpenSquat={() => setScreen("exerciseDetail")} />;
  } else if (screen === "exerciseDetail") {
    page = (
      <ExerciseDetailScreen
        onBack={() => setScreen("program")}
        onStartSession={() => setScreen("readiness")}
      />
    );
  } else if (screen === "progress") {
    page = <ProgressScreen profile={profile} />;
  } else if (screen === "profile") {
    page = <ProfileScreen profile={profile} onSwitchUser={handleSwitchUser} />;
  }

  return (
    <>
      {page}
      <TabBar active={activeTab} onSelect={(tab) => setScreen(tab)} />
    </>
  );
}
