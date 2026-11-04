import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthPage from './components/AuthPage.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { AuthProvider, useAuth } from './auth.jsx';
import { ThemeProvider } from './theme.jsx';
import './styles.css';

function Root() {
  const { user } = useAuth();
  if (user === undefined) return null;   // still checking the cookie
  return (
    <>
      {user ? <App /> : <AuthPage />}
      <div className="theme-dock">
        <ThemeToggle size="sm" />
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider><AuthProvider><Root /></AuthProvider></ThemeProvider>
);
