import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/PlatformAdmin.css';

const PlatformAdminDashboard = () => {
  const [summary, setSummary] = useState({ totalAssigned: 0, completedTasks: 0, newTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser } = useAuth();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/platform-admin/summary', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to load dashboard');
          return;
        }
        setSummary(data.summary || { totalAssigned: 0, completedTasks: 0, newTasks: 0 });
      } catch (err) {
        console.error('Error fetching platform admin summary:', err);
        setError('An unexpected error occurred while loading dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const { totalAssigned, completedTasks, newTasks } = summary;

  const handleLogout = async () => {
    await logoutUser();
    navigate('/platform-admin-login');
  };

  const goToDashboard = () => navigate('/platform-admin');
  const goToRecruiters = () => navigate('/platform-admin/recruiters');

  const onDashboard = location.pathname === '/platform-admin';
  const onRecruiters = location.pathname === '/platform-admin/recruiters';

  return (
    <div className="platform-admin-wrapper">
      <div className="platform-admin-shell">
        <div className="platform-admin-topbar">
          <div className="platform-admin-title-block">
            <div className="platform-admin-role-pill">
              <span className="platform-admin-role-dot" />
              Platform Admin
            </div>
            <h1 className="platform-admin-heading">Welcome back, Administrator</h1>
            <p className="platform-admin-subtitle">
              Track recruiter verification workload and jump into pending tasks.
            </p>
          </div>
          <div className="platform-admin-actions">
            <div className="platform-admin-tabs">
              <button
                type="button"
                className={`platform-admin-tab ${onDashboard ? 'platform-admin-tab--active' : ''}`}
                onClick={goToDashboard}
              >
                Overview
              </button>
              <button
                type="button"
                className={`platform-admin-tab ${onRecruiters ? 'platform-admin-tab--active' : ''}`}
                onClick={goToRecruiters}
              >
                Verification Queue
              </button>
            </div>
            <button type="button" className="platform-admin-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {error && <div className="platform-admin-error">{error}</div>}

        <div className="platform-admin-grid">
          <DashboardCard
            label="New verification tasks"
            value={newTasks}
            accent="#f97316"
            subtitle="Recruiters waiting for your review."
            loading={loading}
          />
          <DashboardCard
            label="Completed verifications"
            value={completedTasks}
            accent="#22c55e"
            subtitle="Recruiters you have already verified."
            loading={loading}
          />
          <DashboardCard
            label="Total assigned recruiters"
            value={totalAssigned}
            accent="#6366f1"
            subtitle="Overall workload in your queue."
            loading={loading}
          />
        </div>

        <div className="platform-admin-focus-panel">
          <div className="platform-admin-focus-header">
            <div>
              <h2 className="platform-admin-focus-title">Today&apos;s focus</h2>
              <p className="platform-admin-focus-subtitle">
                Start with new verification tasks to unblock recruiters.
              </p>
            </div>
            <button type="button" className="platform-admin-cta" onClick={goToRecruiters}>
              Go to queue
            </button>
          </div>
          <div className="platform-admin-focus-metrics">
            <span>
              
              New tasks: <strong style={{ color: '#fbbf24' }}>{newTasks}</strong>
            </span>
            <span>
              Completed today: <strong style={{ color: '#22c55e' }}>{completedTasks}</strong>
            </span>
            <span>
              Total in queue: <strong style={{ color: '#60a5fa' }}>{totalAssigned}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardCard = ({ label, value, accent, subtitle, loading }) => {
  return (
    <div className="platform-admin-card">
      <div className="platform-admin-card-header">
        <span className="platform-admin-card-label">{label}</span>
        <span
          className="platform-admin-card-dot platform-admin-card-dot--glow"
          style={{ background: accent, boxShadow: `0 0 0 4px ${accent}33` }}
        />
      </div>
      <div className="platform-admin-card-value">{loading ? '—' : value}</div>
      <div className="platform-admin-card-subtitle">{subtitle}</div>
    </div>
  );
};

export default PlatformAdminDashboard;
