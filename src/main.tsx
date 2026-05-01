import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import TrayPanel from "./TrayPanel";
import { AudioProvider } from "./context/AudioContext";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CS2 Reactions] Unhandled render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '20px',
          background: '#050505', color: '#fff', fontFamily: 'Outfit, sans-serif', padding: '32px'
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '0.75rem', opacity: 0.4, maxWidth: '360px', textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            style={{
              padding: '12px 28px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', color: '#fff', cursor: 'pointer', fontWeight: 800,
              fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em'
            }}
          >
            Try to recover
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Root = () => {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(getCurrentWindow().label);
  }, []);

  if (label === null) return null;

  return (
    <ErrorBoundary>
      <AudioProvider>
        {label === "tray-panel" ? <TrayPanel /> : <App />}
      </AudioProvider>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
