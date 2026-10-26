import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthPage from './components/AuthPage.jsx';
import { AuthProvider, useAuth } from './auth.jsx';
import './styles.css';

function Root() {
  const { user } = useAuth();
  if (user === undefined) return null;   // still checking the cookie
  return user ? <App /> : <AuthPage />;
}

createRoot(document.getElementById('root')).render(
  <AuthProvider><Root /></AuthProvider>
);