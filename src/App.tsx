import CameraView from "./components/CameraView";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <p className="app-eyebrow">HackBattle 26</p>
        <h1>Form Coach</h1>
        <p className="app-subtitle">Allow camera access to start your squat session.</p>
      </header>
      <main className="app-main">
        <CameraView />
      </main>
    </div>
  );
}
