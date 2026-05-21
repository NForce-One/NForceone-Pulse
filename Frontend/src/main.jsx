import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return React.createElement('div', { style: {
        padding: '40px', background: '#FEF2F2', color: '#991B1B',
        fontFamily: 'monospace', minHeight: '100vh'
      }},
        React.createElement('h1', { style: { fontSize: '20px', marginBottom: '16px' } }, 'React Error Boundary'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', fontSize: '14px' } },
          this.state.error.stack || this.state.error.message || String(this.state.error)
        )
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(ErrorBoundary, null,
      React.createElement(App, null)
    )
  )
);