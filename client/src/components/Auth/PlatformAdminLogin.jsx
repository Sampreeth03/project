import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PlatformAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [passkey, setPasskey] = useState('');
  const [adminId, setAdminId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !passkey || !adminId) {
      setError('All fields are required.');
      return;
    }
    setError('');

    try {
      setLoading(true);
      const response = await fetch('/api/platform-admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, passkey, adminId }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Login failed. Please check your credentials.');
        return;
      }

      navigate(data.redirectPath || '/platform-admin');
    } catch (err) {
      console.error('Platform admin login error:', err);
      setError('An unexpected error occurred while logging in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080e1a' }}>
      <form onSubmit={handleSubmit} style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid #2931ab',
        borderRadius: '16px',
        padding: '40px 32px',
        minWidth: '340px',
        boxShadow: '0 4px 32px rgba(41,49,171,0.08)',
        display: 'flex', flexDirection: 'column', gap: '22px',
      }}>
        <h2 style={{ color: '#2931ab', fontFamily: 'Work Sans, sans-serif', fontWeight: 600, textAlign: 'center', marginBottom: '12px' }}>Platform Admin Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Passkey"
          value={passkey}
          onChange={e => setPasskey(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Admin ID"
          value={adminId}
          onChange={e => setAdminId(e.target.value)}
          style={inputStyle}
        />
        {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

const inputStyle = {
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #bfc6e0',
  fontSize: '15px',
  fontFamily: 'Work Sans, sans-serif',
  outline: 'none',
};

const buttonStyle = {
  padding: '12px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #0068FF, #0090ff)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '16px',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'Work Sans, sans-serif',
  marginTop: '8px',
};

export default PlatformAdminLogin;
