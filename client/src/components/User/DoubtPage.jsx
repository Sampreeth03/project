import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import NavBar from './NavBar.jsx';
import { ClearDoubtsToast } from './OnboardingToast.jsx';
import '../../styles/Doubts.css';
import { useAuth } from '../../context/AuthContext.jsx';

const DoubtPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [doubts, setDoubts] = useState([]);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showClearToast, setShowClearToast] = useState(false);

  // Check if coming from projects page with toast param
  useEffect(() => {
    if (searchParams.get('showClearToast') === 'true') {
      setShowClearToast(true);
      // Remove the param from URL
      searchParams.delete('showClearToast');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (user) {
      fetchDoubts();
    }
  }, [user]);

  const fetchDoubts = async () => {
    try {
      const res = await fetch('/api/doubts', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        // Filter to only show doubts posted by the current user
        const userDoubts = (data.doubts || []).filter(d => d.author === user?.name);
        setDoubts(userDoubts);
      }
    } catch (err) {
      console.error('Failed to fetch doubts', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('message', message);
      if (file) fd.append('file-input', file);

      const res = await fetch('/api/ask', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        // fetch latest (could also prepend)
        fetchDoubts();
        setMessage('');
        setFile(null);
      } else {
        alert(data.message || 'Failed to post doubt');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
    setLoading(false);
  };

  const sendReply = async (doubtId, text, setInputRef) => {
    if (!text || !text.trim()) return;
    try {
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ doubtId, text, isPrivate: false })
      });
      const data = await res.json();
      if (data.success) {
        fetchDoubts();
        if (setInputRef) setInputRef('');
      } else {
        alert(data.message || 'Failed to send reply');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while sending reply');
    }
  };

  const canReplyToDoubt = (doubt) => {
    if (!user) return false;
    if (user.role !== 'user') return false;

    const currentName = user.name || '';
    const doubtAuthor = doubt.author || '';

    // If current user is the doubt owner: only allow replying after someone else has replied
    if (currentName === doubtAuthor) {
      const otherReplyExists = (doubt.replies || []).some(r => (r.author || '') !== doubtAuthor);
      return otherReplyExists;
    }

    // If current user is not the owner: avoid showing reply box if their last reply is already the most recent reply
    const replies = doubt.replies || [];
    if (replies.length === 0) return true;
    const lastReply = replies[replies.length - 1];
    if ((lastReply.author || '') === currentName) return false;
    return true;
  };

  return (
    <div className="doubt-page-root">
      <NavBar />
      <div className="chat-area">
        <div className="chat-header"><h2>Doubts</h2></div>
        <div className="messages-container">
          {doubts.length === 0 && <div className="no-doubts">No doubts posted yet. Be the first to ask!</div>}
          {doubts.map(d => (
            <div className="message" key={d._id} id={`doubt-${d._id}`}>
              <div className="message-avatar">{(d.author||'A').charAt(0)}</div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-author">{d.author}</span>
                  <span className="message-time">{d.timestamp}</span>
                </div>
                <div className="message-text">{d.text}</div>
                {d.file_path && (
                  <div className="image-container">
                    <a href={`/${d.file_path}`} target="_blank" rel="noreferrer">View File</a>
                  </div>
                )}
                <div className="replies-section">
                  {(d.replies||[]).map(r => (
                    <div className="reply-message" key={r._id}>
                      <div className="reply-avatar">{(r.author||'U').charAt(0)}</div>
                      <div className="reply-content">
                        <div className="reply-header">
                          <span className="reply-author">{r.author}</span>
                          <span className="message-time">{r.timestamp}</span>
                          {r.isPrivate && <span className="private-badge">🔒 PRIVATE</span>}
                        </div>
                        <div className="reply-text">{r.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply input - only for logged-in users */}
                {canReplyToDoubt(d) && (
                  <ReplyBox doubtId={d._id} onSend={sendReply} />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="message-input-container">
          <form className="message-input-form" onSubmit={handleSubmit} encType="multipart/form-data">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <label className="file-label" htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <i className="fas fa-paperclip"></i> Attach a file (optional)
              </label>
              <input id="file-input" type="file" name="file-input" style={{display:'none'}} onChange={e=>setFile(e.target.files[0]||null)} />
              {file && (
                <span style={{ color: 'var(--accent-success)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-check-circle"></i>
                  {file.name}
                  <button 
                    type="button" 
                    onClick={() => setFile(null)} 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '0 4px' }}
                    title="Remove file"
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                </span>
              )}
            </div>
            <input type="text" className="message-input" name="message" placeholder="Ask your doubt here..." value={message} onChange={e=>setMessage(e.target.value)} required />
            <button type="submit" className="send-button" disabled={loading}>{loading? '...' : <i className="fas fa-paper-plane"></i>}</button>
          </form>
        </div>
      </div>

      {/* Clear Doubts Toast - shown when coming from projects Ask Doubts */}
      {showClearToast && (
        <ClearDoubtsToast onComplete={() => setShowClearToast(false)} />
      )}
    </div>
  );
};

const ReplyBox = ({ doubtId, onSend }) => {
  const [text, setText] = useState('');
  return (
    <div className="reply-container">
      <input className="message-input" placeholder="Your reply..." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); onSend(doubtId, text, setText); } }} />
      <button className="send-button" type="button" onClick={()=>onSend(doubtId, text, setText)}><i className="fas fa-paper-plane"></i></button>
    </div>
  );
};

export default DoubtPage;
