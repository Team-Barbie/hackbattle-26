import { useEffect, useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import PatientDashboard from "./screens/PatientDashboard";
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

type Screen = "role" | "login" | "dashboard" | "session" | "summary";
type SessionResult = { reps: number; target: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>("role");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);

  useEffect(() => {
    const existing = loadPatientProfile();

    if (existing) {
      setProfile(existing);
      setScreen("dashboard");
    }
  }, []);

  function handleSelectRole(role: Role) {
    if (role === "patient") {
      setScreen("login");
    }
  }

  function handleLogin(name: string) {
    setProfile(createPatientProfile(name));
    setScreen("dashboard");
  }

  function handleSwitchUser() {
    clearPatientProfile();
    setProfile(null);
    setScreen("role");
  }

  function handleFinishSession(reps: number, target: number) {
    setProfile((current) => {
      if (!current) {
        return current;
      }

      return recordSession(current, { date: new Date().toISOString(), reps, target });
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

  if (screen === "session") {
    return <SessionScreen onFinish={handleFinishSession} onBack={() => setScreen("dashboard")} />;
  }

  if (screen === "summary" && lastResult) {
    return (
      <SessionSummaryScreen
        reps={lastResult.reps}
        target={lastResult.target}
        onDone={() => setScreen("dashboard")}
      />
    );
  }

  return (
    <PatientDashboard
      profile={profile}
      onStartSession={() => setScreen("session")}
      onSwitchUser={handleSwitchUser}
    />
  );
}
