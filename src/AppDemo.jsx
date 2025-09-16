import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import HomePageDemo from './pages/HomePageDemo';
import FiltersPage from './pages/FiltersPage';
import ConversationPage from './pages/ConversationPage';

// Create theme with Beacon green
const theme = createTheme({
  palette: {
    primary: {
      main: '#187955',
      light: '#3a9474',
      dark: '#0e5f3f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6c757d',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function AppDemo() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/demo" replace />} />
          <Route path="/demo" element={<HomePageDemo />} />
          <Route path="/filters" element={<FiltersPage />} />
          <Route path="/conversation" element={<ConversationPage />} />
          {/* Keep existing app accessible */}
          <Route path="/original/*" element={
            <div>Original app would load here - integrate as needed</div>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default AppDemo;