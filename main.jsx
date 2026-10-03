import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Entry point.
 * Providers are ordered so that language/theme are available to the store and every
 * screen below them. StrictMode is on to surface side-effect bugs during development.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
