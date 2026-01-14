import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './NavBar.jsx';
import '../../styles/UserHome.css';

const Friends = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        alert('Friend request sent');
        fetchIncoming();
      } else alert(res.data.message || 'Failed to send');
    } catch (err) {
      setError('Error sending request.');
      alert('Error sending request');
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
      <div className="container" style={{ paddingTop: '70px', maxWidth: '900px', margin: '40px auto' }}>
        <h2>Friends</h2>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        <div style={{ marginBottom: '20px' }}>
          <input placeholder="Search people by name or email" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} />
        </div>

        {loading && <div>Searching...</div>}
        <div>
          {results.map(u => (
            <div key={u._id} style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{u.email}</div>
              </div>
              <div>
                <button onClick={() => sendRequest(u._id)} className="btn btn-white">Send Request</button>
              </div>
            </div>
          ))}
        </div>

        <hr style={{ margin: '20px 0' }} />
        <h3>Incoming Requests</h3>
        <div>
          {incoming.length === 0 && <div>No incoming requests</div>}
          {incoming.map(r => {
            // Support both r.from and r.from_user for compatibility
            const from = r.from || r.from_user || {};
            return (
              <div key={r._id} style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{from.name || 'Unknown'}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{from.email || ''}</div>
                </div>
                <div>
                  <button className="btn btn-white" onClick={() => respondRequest(r._id, 'accept')}>Accept</button>
                  <button className="btn" style={{ marginLeft: '8px' }} onClick={() => respondRequest(r._id, 'reject')}>Reject</button>
                </div>
              </div>
            );
          })}
        </div>

        <hr style={{ margin: '20px 0' }} />
        <h3>Your Friends</h3>
        <div>
          {friends.length === 0 && <div>No friends yet</div>}
          {friends.map(f => (
            <div key={f._id} style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{f.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{f.email}</div>
              </div>
              <div>
                <button className="btn btn-white" onClick={() => window.location.href = `/profile/${f._id}`}>View Profile</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Friends;
