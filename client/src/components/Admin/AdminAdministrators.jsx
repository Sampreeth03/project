import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchPlatformAdmins, createPlatformAdmin } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminAdministrators = () => {
  const dispatch = useDispatch();
  const {
    platformAdmins,
    platformAdminsLoading,
    platformAdminsError,
    createPlatformAdminLoading,
    createPlatformAdminError
  } = useSelector((state) => state.admin);

  const [email, setEmail] = useState('');
  const [passkey, setPasskey] = useState('');
  const [adminId, setAdminId] = useState('');

  useEffect(() => {
    dispatch(fetchPlatformAdmins());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !passkey || !adminId) return;
    const resultAction = await dispatch(createPlatformAdmin({ email, passkey, adminId }));
    if (createPlatformAdmin.fulfilled.match(resultAction)) {
      setEmail('');
      setPasskey('');
      setAdminId('');
    }
  };

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-main-content">
        {/* Header */}
        <div className="admin-header">
          <div className="page-title">
            <h2>Platform Administrators</h2>
            <div className="breadcrumb">Dashboard &gt; Administrators</div>
          </div>
        </div>

        {/* Create Administrator Form */}
        <div className="admin-table-container" style={{ marginBottom: '24px' }}>
          <div className="table-header">
            <h4 className="table-title">Create New Administrator</h4>
          </div>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-row">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="Passkey"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
              />
              <input
                type="text"
                placeholder="Admin ID"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
              />
              <button type="submit" className="primary-btn" disabled={createPlatformAdminLoading}>
                {createPlatformAdminLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
            {createPlatformAdminError && (
              <div className="error-message" style={{ marginTop: '8px' }}>
                {createPlatformAdminError}
              </div>
            )}
          </form>
        </div>

        {/* Administrators List */}
        <div className="admin-table-container">
          <div className="table-header">
            <h4 className="table-title">Existing Administrators</h4>
            <span className="table-count">{platformAdmins.length} administrators</span>
          </div>
          <div className="table-wrapper">
            {platformAdminsLoading && <div className="loading-message">Loading administrators...</div>}
            {platformAdminsError && <div className="error-message">Error: {platformAdminsError}</div>}
            {!platformAdminsLoading && !platformAdminsError && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Admin ID</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {platformAdmins.map((admin) => (
                    <tr key={admin._id}>
                      <td>{admin.email}</td>
                      <td>{admin.adminId}</td>
                      <td>{admin.createdAt ? new Date(admin.createdAt).toLocaleString() : ''}</td>
                    </tr>
                  ))}
                  {platformAdmins.length === 0 && (
                    <tr>
                      <td colSpan="3" className="no-data">No administrators found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAdministrators;
