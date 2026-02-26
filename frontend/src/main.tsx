import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { WalletProvider } from './contexts/WalletContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/index.css';
import svc from './utils/serviceWorker';
import { initializeThemeOnLoad } from './utils/theme';

// Apply persisted/system theme before React boot to minimize flashing.
initializeThemeOnLoad();

// Register the service worker early so offline capabilities are available.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  svc.registerServiceWorker();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
