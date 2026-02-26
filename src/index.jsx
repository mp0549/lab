import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    // <HashRouter basename="/lab">
    <HashRouter>
      <App />
    </HashRouter>
  );
} else {
  console.warn('No #root element found — add an HTML file that includes a container with id="root".');
}
