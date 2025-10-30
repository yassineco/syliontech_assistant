import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DemoPage } from './pages/DemoPage';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <DemoPage />
  </StrictMode>
);