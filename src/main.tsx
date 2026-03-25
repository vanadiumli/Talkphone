import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// #region agent log
fetch('http://127.0.0.1:7815/ingest/fcf5ef23-5fd2-4507-a987-0b0da575aebe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Debug-Session-Id': '25aad1',
  },
  body: JSON.stringify({
    sessionId: '25aad1',
    runId: 'pre-fix',
    hypothesisId: 'H-link-1',
    location: 'src/main.tsx:5',
    message: 'App entry mounted',
    data: {},
    timestamp: Date.now(),
  }),
}).catch(() => {})
// #endregion agent log

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: 'red', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
          <h2>Runtime Error</h2>
          <p>{this.state.error.message}</p>
          <pre>{this.state.error.stack}</pre>
          <button onClick={() => { localStorage.clear(); location.reload() }}
            style={{ marginTop: 12, padding: '8px 16px', background: 'red', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Clear Storage & Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
