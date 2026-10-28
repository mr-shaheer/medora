import { useState } from 'react';
import { Logo } from './ui.jsx';
import { useAuth } from '../auth.jsx';

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', api_key: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await (isSignup ? signup(form) : login(form));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <Logo />
        <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>

        {isSignup && (
          <input placeholder="Full name" value={form.name} onChange={set('name')}
                 required maxLength={60} autoComplete="name" />
        )}
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')}
               required autoComplete="email" />
        <input type="password" placeholder="Password (min 8 characters)" value={form.password}
               onChange={set('password')} required minLength={isSignup ? 8 : undefined} maxLength={64}
               autoComplete={isSignup ? 'new-password' : 'current-password'} />

        
        {isSignup && (
                  <>
                    <input type="password" placeholder="Gemini API key (optional)" value={form.api_key}
                          onChange={set('api_key')} autoComplete="off" />
                    <p className="auth-hint">Stored encrypted. You can add or change it later from your profile menu.</p>
                  </>
                )}


        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="btn btn-solid" disabled={busy} aria-busy={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
        </button>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New to Medora?'}{' '}
          <button type="button" className="link"
                  onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); }}>
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </form>
    </main>
  );
}