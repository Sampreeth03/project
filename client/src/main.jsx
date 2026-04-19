import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx'; 
import { ThemeProvider } from './context/ThemeContext.jsx';
import { store } from './store';
import './index.css';
import './styles/global.css';
import './styles/Recruiter.css';

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const proxiedPrefixes = [
  '/api',
  '/apply',
  '/apply-job',
  '/job',
  '/job_not',
  '/delete-notification',
  '/mark-notification-read',
  '/revoke-application',
  '/uploads',
  '/socket.io',
];

if (apiBaseUrl && typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);
  const shouldPrefix = (url) => {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('/')) return false;
    return proxiedPrefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
  };

  window.fetch = (input, init) => {
    if (typeof input === 'string' && shouldPrefix(input)) {
      return nativeFetch(`${apiBaseUrl}${input}`, init);
    }
    return nativeFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ThemeProvider>
      <BrowserRouter> 
        <AuthProvider> 
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </Provider>,
);