import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import DataAnalysisApp from './DataAnalysisApp.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <DataAnalysisApp />
    </ErrorBoundary>
  </React.StrictMode>
);
