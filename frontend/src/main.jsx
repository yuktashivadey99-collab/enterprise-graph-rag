import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  componentDidCatch(error, info) { this.setState({ error, info }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff', minHeight: '100vh' }}>
          <h2 style={{ color: '#dc2626', marginBottom: 16 }}>⚠ App Crash — React Error</h2>
          <pre style={{ color: '#dc2626', background: '#fef2f2', padding: 20, borderRadius: 8, fontSize: 13, overflow: 'auto', border: '1px solid #fca5a5' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ color: '#6b7280', background: '#f9fafb', padding: 20, borderRadius: 8, fontSize: 11, overflow: 'auto', marginTop: 12, border: '1px solid #e5e7eb' }}>
            {this.state.info?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
