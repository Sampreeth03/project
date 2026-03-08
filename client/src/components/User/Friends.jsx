import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './NavBar.jsx';
import UserProfileModal from '../../components/Recruiter/UserProfileModal';
import '../../styles/Friends.css';

const Friends = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  const isUserRole = (entry) => {
    if (!entry) return false;
    if (!entry.role) return true; // Backward compatibility for older records without role field
    return String(entry.role).toLowerCase() === 'user';
  };

  const visibleResults = results.filter(isUserRole);
  const visibleFriends = friends.filter(isUserRole);
  const visibleIncoming = incoming.filter((r) => isUserRole(r?.from || r?.from_user));

  useEffect(() => {
    fetchFriends();
    fetchIncoming();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query && query.trim().length > 0) searchUsers(query.trim());
      else setResults([]);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const searchUsers = async (q) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`/api/users/search?q=${encodeURIComponent(q)}`);
      setResults(res.data.users || []);
    } catch (err) {
      setError('Search failed.');
      setResults([]);
      console.error('Search error', err);
    } finally { setLoading(false); }
  };

  const fetchFriends = async () => {
    try {
      setError(null);
      const res = await axios.get('/api/friends');
      setFriends(res.data.friends || []);
    } catch (err) {
      setError('Failed to fetch friends.');
      setFriends([]);
      console.error('Failed to fetch friends', err);
    }
  };

  const fetchIncoming = async () => {
    try {
      setError(null);
      const res = await axios.get('/api/friend-requests');
      setIncoming(res.data.requests || []);
    } catch (err) {
      setError('Failed to fetch incoming requests.');
      setIncoming([]);
      console.error('Failed to fetch incoming requests', err);
    }
  };

  const sendRequest = async (userId) => {
    try {
      setError(null);
      const res = await axios.post('/api/friend-request/send', { toUserId: userId });
      if (res.data.success) {
        // Update local results so button immediately shows "Request Sent"
        setResults(prev => prev.map(u => u._id === userId ? { ...u, requestStatus: 'pending_sent' } : u));
      } else {
        setError(res.data.message || 'Failed to send request.');
      }
    } catch (err) {
      setError('Error sending request.');
    }
  };

  const respondRequest = async (requestId, action) => {
    try {
      setError(null);
      const res = await axios.post('/api/friend-request/respond', { requestId, action });
      if (res.data.success) {
        fetchFriends();
        fetchIncoming();
      } else alert(res.data.message || 'Failed');
    } catch (err) {
      setError('Error responding to request.');
      alert('Error');
    }
  };

  // Error boundary: if error, show message but not blank screen
  return (
    <>
      <Navbar />
      <div className="friends-page">
        <div className="friends-container">

          <h1 className="friends-page-title">
            Find &amp; Connect <span>Friends</span>
          </h1>
          <p className="friends-page-subtitle">Search for people, manage requests, and view your connections.</p>

          {error && <div className="friends-error">{error}</div>}

          {/* Search */}
          <div className="friends-search-wrapper">
            <i className="fas fa-search"></i>
            <input
              className="friends-search-input"
              placeholder="Search people by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && <div className="friends-loading">Searching...</div>}

          {visibleResults.length > 0 && (
            <div>
              {visibleResults.map(u => (
                <div key={u._id} className="friends-user-card">
                  <div className="friends-user-info">
                    <div className="friends-avatar">{(u.name || 'U').charAt(0)}</div>
                    <div className="friends-user-details">
                      <div className="friends-user-name">{u.name}</div>
                      <div className="friends-user-email">{u.email}</div>
                    </div>
                  </div>
                  <div className="friends-actions">
                    <button className="friends-btn friends-btn-outline" onClick={() => setSelectedUserProfile({ userId: u._id, userName: u.name })}>View Profile</button>
                    {u.requestStatus === 'friends' ? (
                      <span className="friends-status-badge friends-badge-friends"><i className="fas fa-check"></i> Friends</span>
                    ) : u.requestStatus === 'pending_sent' ? (
                      <span className="friends-status-badge friends-badge-sent">Request Sent</span>
                    ) : u.requestStatus === 'pending_received' ? (
                      <span className="friends-status-badge friends-badge-received"><i className="fas fa-envelope"></i> Requested You</span>
                    ) : (
                      <button className="friends-btn friends-btn-primary" onClick={() => sendRequest(u._id)}>Send Request</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <hr className="friends-divider" />

          {/* Incoming Requests */}
          <div className="friends-section-header">
            <span className="friends-section-title">Incoming Requests</span>
            {visibleIncoming.length > 0 && <span className="friends-section-count">{visibleIncoming.length}</span>}
          </div>
          {visibleIncoming.length === 0
            ? <div className="friends-empty"><i className="fas fa-inbox"></i> No incoming requests</div>
            : visibleIncoming.map(r => {
                const from = r.from || r.from_user || {};
                return (
                  <div key={r._id} className="friends-user-card">
                    <div className="friends-user-info">
                      <div className="friends-avatar">{(from.name || 'U').charAt(0)}</div>
                      <div className="friends-user-details">
                        <div className="friends-user-name">{from.name || 'Unknown'}</div>
                        <div className="friends-user-email">{from.email || ''}</div>
                      </div>
                    </div>
                    <div className="friends-actions">
                      <button className="friends-btn friends-btn-outline" onClick={() => setSelectedUserProfile({ userId: (from._id || from.id || from._id?.toString()), userName: from.name || 'Profile' })}>View Profile</button>
                      <button className="friends-btn friends-btn-accept" onClick={() => respondRequest(r._id, 'accept')}>Accept</button>
                      <button className="friends-btn friends-btn-reject" onClick={() => respondRequest(r._id, 'reject')}>Reject</button>
                    </div>
                  </div>
                );
              })
          }

          <hr className="friends-divider" />

          {/* Your Friends */}
          <div className="friends-section-header">
            <span className="friends-section-title">Your Friends</span>
            {visibleFriends.length > 0 && <span className="friends-section-count">{visibleFriends.length}</span>}
          </div>
          {visibleFriends.length === 0
            ? <div className="friends-empty"><i className="fas fa-user-friends"></i> No friends yet</div>
            : visibleFriends.map(f => (
                <div key={f._id} className="friends-user-card">
                  <div className="friends-user-info">
                    <div className="friends-avatar">{(f.name || 'U').charAt(0)}</div>
                    <div className="friends-user-details">
                      <div className="friends-user-name">{f.name}</div>
                      <div className="friends-user-email">{f.email}</div>
                    </div>
                  </div>
                  <div className="friends-actions">
                    <button className="friends-btn friends-btn-outline" onClick={() => setSelectedUserProfile({ userId: f._id, userName: f.name })}>View Profile</button>
                  </div>
                </div>
              ))
          }

        </div>
      </div>

      {selectedUserProfile && (
        <UserProfileModal
          userId={selectedUserProfile.userId}
          userName={selectedUserProfile.userName}
          onClose={() => setSelectedUserProfile(null)}
        />
      )}
    </>
  );
};

export default Friends;
