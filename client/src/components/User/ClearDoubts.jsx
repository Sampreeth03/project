import React, { useEffect, useState } from 'react';
import NavBar from './NavBar.jsx';
import '../../styles/ClearDoubts.css';
import { useAuth } from '../../context/AuthContext.jsx';

const ClearDoubts = () => {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState([]);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);

  useEffect(()=>{ fetchDoubts(); }, []);

  const fetchDoubts = async () => {
    try{
      const res = await fetch('/api/doubts?board=clear', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setDoubts(data.doubts||[]);
    }catch(err){ console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const fd = new FormData();
    fd.append('message', message);
    if (file) fd.append('file-input', file);
    try{
      const res = await fetch('/api/ask', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (data.success) { setMessage(''); setFile(null); fetchDoubts(); }
      else alert(data.message||'Failed to post');
    }catch(err){ console.error(err); alert('Network error'); }
  };

  const sendReply = async (doubtId, text, setInputRef) => {
    if (!text || !text.trim()) return;
    try{
      const res = await fetch('/api/reply', { method: 'POST', headers: { 'Content-Type':'application/json' }, credentials: 'include', body: JSON.stringify({ doubtId, text, isPrivate: false }) });
      const data = await res.json();
      if (data.success) { fetchDoubts(); if (setInputRef) setInputRef(''); }
      else alert(data.message||'Failed to send reply');
    }catch(err){ console.error(err); alert('Network error'); }
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
    <div className="clear-page-root doubt-page-root">
      <NavBar />
      <div className="chat-area">
        <div className="chat-header"><h2>Clear Doubts</h2></div>
        <div className="messages-container">
          {doubts.length===0 && <div className="no-doubts">No doubts found. Be the first to ask a question!</div>}
          {doubts.map(d=> (
            <div className="message" key={d._id}>
              <div className="message-avatar">{(d.author||'A').charAt(0)}</div>
              <div className="message-content">
                <div className="message-header"><span className="message-author">{d.author}</span><span className="message-time">{d.timestamp}</span></div>
                <div className="message-text">{d.text}</div>
                {d.file_path && (<div className="image-container"><a href={`/${d.file_path}`} target="_blank" rel="noreferrer">View File</a></div>)}
                {(d.replies||[]).map(r=> (
                  <div className="reply-message" key={r._id}><div className="reply-avatar">{(r.author||'U').charAt(0)}</div><div className="reply-content"><div className="reply-header"><span className="reply-author">{r.author}</span><span className="message-time">{r.timestamp}</span>{r.isPrivate && <span className="private-badge">🔒 PRIVATE</span>}</div><div className="reply-text">{r.text}</div></div></div>
                ))}

                {canReplyToDoubt(d) && <ReplyBox doubtId={d._id} onSend={sendReply} />}
              </div>
            </div>
          ))}
        </div>

        <div style={{padding:'16px', borderTop:'1px solid #2D2D2D'}}>
          <form id="ask-doubt-form" onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="messageBox" style={{alignItems:'center'}}>
              <div className="fileUploadWrapper">
                <label htmlFor="file-input"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 16v4H8v-4" stroke="#9AA1A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="tooltip">Attach a file (optional)</span></label>
                <input id="file-input" className="fileInput" name="file-input" type="file" style={{display:'none'}} onChange={e=>setFile(e.target.files[0]||null)} />
              </div>
              <input className="messageInput" name="message" id="ask-message" type="text" placeholder="Ask your doubt here..." value={message} onChange={e=>setMessage(e.target.value)} required />
              <button type="submit" className="sendButton"><svg viewBox="0 0 664 663" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888" stroke="#6c6c6c" strokeWidth="33.67" strokeLinecap="round" strokeLinejoin="round"></path></svg></button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ReplyBox = ({ doubtId, onSend }) => {
  const [text, setText] = useState('');
  return (
    <div className="reply-container">
      <input className="messageInput" placeholder="Your reply..." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); onSend(doubtId, text, setText); } }} />
      <button className="sendButton" type="button" onClick={()=>onSend(doubtId, text, setText)}><svg viewBox="0 0 664 663" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888" stroke="#6c6c6c" strokeWidth="33.67" strokeLinecap="round" strokeLinejoin="round"></path></svg></button>
    </div>
  );
};

export default ClearDoubts;
