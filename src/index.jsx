import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// import DataAnalysisApp from './DataAnalysisApp.jsx';
import AppDemo from './AppDemo.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppDemo />
    </ErrorBoundary>
  </React.StrictMode>
);
