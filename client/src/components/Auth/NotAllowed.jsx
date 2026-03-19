import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const NotAllowed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const normalizedRole = String(user?.role || '').trim().toLowerCase();

  const handleGoBack = () => {
    if (!user) { navigate('/login'); return; }
    if (normalizedRole === 'admin') navigate('/admin');
    else if (normalizedRole === 'recruiter') navigate('/recruiter-home');
    else navigate('/home');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#050816',
      color: '#fff',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2.5rem 3rem',
        borderRadius: '16px',
        background: 'rgba(15,23,42,0.95)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        maxWidth: '480px',
        width: '90%',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Access Denied
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
          You are not allowed to access this page with your current account type.
          Please go back to your own dashboard.
        </p>
        <button
          onClick={handleGoBack}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(90deg,#6366f1,#22c55e)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Go to my dashboard
        </button>
      </div>
    </div>
  );
};

export default NotAllowed;
