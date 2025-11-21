import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SylionTechHomePage } from './pages/SylionTechHomePage';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <SylionTechHomePage />
  </StrictMode>
);