import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { WalletProvider } from './contexts/WalletContext';
import './styles/index.css';
import svc from './utils/serviceWorker';

// Register the service worker early so offline capabilities are available.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  svc.registerServiceWorker();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
