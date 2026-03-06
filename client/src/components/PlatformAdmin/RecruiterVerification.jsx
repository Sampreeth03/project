import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/PlatformAdmin.css';

const RecruiterVerification = () => {
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser } = useAuth();

  useEffect(() => {
    const fetchRecruiters = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/platform-admin/recruiters', {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to load recruiters');
          setRecruiters([]);
        } else {
          setRecruiters(data.recruiters || []);
        }
      } catch (err) {
        console.error('Error fetching recruiters for verification:', err);
        setError('An unexpected error occurred while loading recruiters');
      } finally {
        setLoading(false);
      }
    };

    fetchRecruiters();
  }, []);

  const updateRecruiterStatus = async (id, status) => {
    const message =
      status === 'verified'
        ? ''
        : window.prompt('Message to recruiter for re-upload (optional):', 'Please re-upload a clearer company document.');

    try {
      setActionLoadingId(id);
      setError('');
      const res = await fetch(`/api/platform-admin/recruiters/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status, message }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update verification status');
        return;
      }
      setRecruiters(prev =>
        prev.map(r => (r._id === id || r.id === id ? { ...r, ...data.recruiter } : r))
      );
    } catch (err) {
      console.error('Error updating recruiter verification:', err);
      setError('An unexpected error occurred while updating verification status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/platform-admin-login', { replace: true });
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
            <h1 className="platform-admin-heading">Recruiter Document Verification</h1>
            <p className="platform-admin-subtitle">
              Review recruiter documents. Only verified recruiters can publish jobs.
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

        {loading ? (
          <div className="platform-admin-state-text">Loading recruiters...</div>
        ) : recruiters.length === 0 ? (
          <div className="platform-admin-state-text">No recruiters found yet.</div>
        ) : (
          <div className="platform-admin-table-shell">
            <table className="platform-admin-table">
              <thead>
                <tr>
                  <th className="platform-admin-th">Name</th>
                  <th className="platform-admin-th">Email</th>
                  <th className="platform-admin-th">Company</th>
                  <th className="platform-admin-th">Document</th>
                  <th className="platform-admin-th">Status</th>
                  <th className="platform-admin-th">Message</th>
                  <th className="platform-admin-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map(rec => {
                  const id = rec._id || rec.id;
                  const verified = rec.recruiterVerified;
                  const statusLabel = verified ? 'Verified' : 'Pending / Needs Update';
                  const statusClass = verified
                    ? 'platform-admin-status-pill platform-admin-status-pill--verified'
                    : 'platform-admin-status-pill platform-admin-status-pill--pending';

                  return (
                    <tr key={id} className="platform-admin-table-row">
                      <td className="platform-admin-td">{rec.name || '-'}</td>
                      <td className="platform-admin-td">{rec.email}</td>
                      <td className="platform-admin-td">{rec.companyName || '-'}</td>
                      <td className="platform-admin-td">
                        {rec.companyDocumentUrl ? (
                          <a
                            href={rec.companyDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="platform-admin-link"
                          >
                            View Document
                          </a>
                        ) : (
                          <span className="platform-admin-placeholder">Not uploaded</span>
                        )}
                      </td>
                      <td className="platform-admin-td">
                        <span className={statusClass}>{statusLabel}</span>
                      </td>
                      <td className="platform-admin-td">
                        {rec.recruiterVerificationMessage ? (
                          rec.recruiterVerificationMessage
                        ) : (
                          <span className="platform-admin-placeholder">—</span>
                        )}
                      </td>
                      <td className="platform-admin-td">
                        <div className="platform-admin-actions-cell">
                          <button
                            type="button"
                            onClick={() => updateRecruiterStatus(id, 'verified')}
                            disabled={actionLoadingId === id}
                            className="platform-admin-btn platform-admin-btn-primary"
                          >
                            {actionLoadingId === id ? 'Saving...' : 'Mark Verified'}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRecruiterStatus(id, 'reupload')}
                            disabled={actionLoadingId === id}
                            className="platform-admin-btn platform-admin-btn-outline"
                          >
                            {actionLoadingId === id ? 'Saving...' : 'Request Re-upload'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterVerification;
