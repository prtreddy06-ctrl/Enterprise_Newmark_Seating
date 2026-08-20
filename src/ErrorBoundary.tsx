import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Catches any rendering crash anywhere below it and shows a recoverable
 * screen instead of letting the whole app go blank white. This doesn't fix
 * the underlying bug that caused a crash — it just means a broken record
 * (e.g. one bad zone/seat) can't take down the entire session, and the
 * person gets a clear next step instead of a dead screen.
 */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("EnterprizSeat crashed:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "24px"
        }}>
          <div style={{
            maxWidth: "420px",
            width: "100%",
            background: "white",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            padding: "32px",
            textAlign: "center"
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "16px",
              background: "#fef2f2", color: "#dc2626",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: "26px", fontWeight: "bold"
            }}>!</div>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, margin: "0 0 20px" }}>
              A screen hit an unexpected error and couldn't render. Your data hasn't been lost — reloading usually recovers this. If it keeps happening, it's worth reporting exactly what you were doing right before it appeared.
            </p>
            {this.state.error?.message && (
              <p style={{
                fontSize: "11px", fontFamily: "monospace", color: "#94a3b8",
                background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px",
                padding: "10px", marginBottom: "20px", wordBreak: "break-word", textAlign: "left"
              }}>
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReload}
              style={{
                background: "#1d4ed8", color: "white", border: "none",
                padding: "10px 20px", borderRadius: "12px", fontSize: "13px",
                fontWeight: 700, cursor: "pointer"
              }}
            >
              Reload the App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
