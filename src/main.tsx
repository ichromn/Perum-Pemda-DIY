import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safeguard against third-party or browser-level window.fetch override exceptions
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('Cannot set property fetch') ||
      event.message.includes('property fetch of #<Window>')
    )) {
      console.warn('Suppressed benign environment fetch override error:', event.message);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
