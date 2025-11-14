import React, { useState, useEffect } from 'react';
import App from './App';

const PASSWORD = 'notgonnagiveu?p';
const EXPIRATION_DAYS = 30;

const PasswordProtect = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      const { timestamp } = JSON.parse(storedAuth);
      const now = new Date().getTime();
      const thirtyDaysInMillis = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

      if (now - timestamp < thirtyDaysInMillis) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('auth');
      }
    }
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === PASSWORD) {
      const authData = {
        timestamp: new Date().getTime(),
      };
      localStorage.setItem('auth', JSON.stringify(authData));
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
    setPassword('');
  };

  if (isAuthenticated) {
    return <App />;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#202020',
      color: '#d1d5db',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '320px',
        padding: '32px',
        background: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #2a2a2a'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '24px', color: '#e5e7eb', textAlign: 'center' }}>Enter Password</h2>
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              background: '#0d0d0d',
              border: '1px solid #2a2a2a',
              borderRadius: '4px',
              padding: '10px 12px',
              fontSize: '14px',
              color: '#d1d5db',
              outline: 'none'
            }}
            placeholder="Password"
          />
          <button
            type="submit"
            style={{
              background: '#7c3aed',
              color: 'white',
              padding: '10px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Unlock
          </button>
          {error && <p style={{ color: '#f87171', fontSize: '12px', textAlign: 'center', margin: '8px 0 0' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default PasswordProtect;
