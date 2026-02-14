import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchMessagesData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminMessages = () => {
    const dispatch = useDispatch();
    const { messages, messagesLoading, messagesError } = useSelector((state) => state.admin);
    const [searchInput, setSearchInput] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState(null);

    useEffect(() => {
        const query = searchInput.trim();
        if (!query) {
            setSelectedUser(null);
            setSelectedConversation(null);
            setShowSuggestions(false);
            dispatch(fetchMessagesData(''));
            return;
        }

        const timer = setTimeout(() => {
            setShowSuggestions(true);
            dispatch(fetchMessagesData({ username: query }));
        }, 300);

        return () => clearTimeout(timer);
    }, [dispatch, searchInput]);

    useEffect(() => {
        if (!selectedUser || !messages?.user?.id) {
            setSelectedConversation(null);
            return;
        }

        if (String(selectedUser.id) !== String(messages.user.id)) {
            setSelectedConversation(null);
            return;
        }

        setSelectedConversation(messages.conversations?.[0] || null);
    }, [messages.conversations, messages.user, selectedUser]);

    useEffect(() => {
        if (messagesError) {
            setSelectedConversation(null);
        }
    }, [messagesError]);

    const emptyStats = {
        totalConversations: 0,
        totalMessages: 0,
        channelMessages: 0,
        directMessages: 0,
        messagesToday: 0,
        flaggedConversations: 0,
        responseRate: 0
    };
    const displayData = {
        ...messages,
        conversations: Array.isArray(messages.conversations) ? messages.conversations : [],
        stats: { ...emptyStats, ...(messages.stats || {}) }
    };

    const suggestions = Array.isArray(displayData.userMatches) ? displayData.userMatches : [];
    const hasSelectedUserData = selectedUser && displayData.user && String(selectedUser.id) === String(displayData.user.id);

    const filteredConversations = hasSelectedUserData ? displayData.conversations : [];

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    };

    const selectUserAndLoadChats = (user) => {
        if (!user?.id) return;
        setSelectedUser(user);
        setSearchInput(user.name || '');
        setShowSuggestions(false);
        setSelectedConversation(null);
        dispatch(fetchMessagesData({ username: user.name || '', userId: user.id }));
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && suggestions.length > 0) {
            e.preventDefault();
            selectUserAndLoadChats(suggestions[0]);
        }
    };

    return (
        <div className="admin-container">
            <AdminSidebar />
            <div className="admin-main-content">
                {/* Header */}
                <div className="admin-header">
                    <div className="welcome">
                        <h2>Chat Search</h2>
                        <h4>Select a user from search suggestions to load all chats below</h4>
                    </div>
                    <div className="admin-controls">
                        <div className="search-box admin-user-search">
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                onFocus={() => {
                                    if (searchInput.trim()) setShowSuggestions(true);
                                }}
                            />
                            <i className="fas fa-search"></i>
                            {showSuggestions && searchInput.trim() && (
                                <div className="user-suggestions-dropdown">
                                    {messagesLoading && <div className="user-suggestion-item muted">Searching users...</div>}
                                    {!messagesLoading && suggestions.length === 0 && (
                                        <div className="user-suggestion-item muted">No matching users</div>
                                    )}
                                    {!messagesLoading && suggestions.map((user) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            className="user-suggestion-item"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => selectUserAndLoadChats(user)}
                                        >
                                            <span className="user-suggestion-name">{user.name}</span>
                                            <span className="user-suggestion-email">{user.email}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="admin-profile">
                            <div className="admin-avatar">
                                <i className="fas fa-user"></i>
                            </div>
                            <div className="admin-info">
                                <div className="admin-name">Admin</div>
                                <div className="admin-role">Super Admin</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Message Stats */}
                {messagesError && <div className="error-message">Error: {messagesError}</div>}
                {selectedUser && hasSelectedUserData && (
                    <div className="stat-secondary" style={{ marginBottom: '12px' }}>
                        Showing chats for <strong>{displayData.user.name}</strong> ({displayData.user.email})
                    </div>
                )}
                <div className="message-stats">
                    <div className="stat-card">
                        <div className="stat-title">Conversations Found</div>
                        <div className="stat-value">{displayData.stats.totalConversations}</div>
                        <div className="stat-secondary">Channels and DMs involving the user</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-title">Total Messages</div>
                        <div className="stat-value">{displayData.stats.totalMessages}</div>
                        <div className="stat-secondary">All messages in matched threads</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-title">Channel Messages</div>
                        <div className="stat-value">{displayData.stats.channelMessages}</div>
                        <div className="stat-secondary">Public project conversations</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-title">Direct Messages</div>
                        <div className="stat-value">{displayData.stats.directMessages}</div>
                        <div className="stat-secondary">1-on-1 project chats</div>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="messages-container">
                    {/* Contacts Panel */}
                    <div className="contacts-panel">
                        <div className="contacts-header">
                            <div className="contacts-title">Active Conversations</div>
                        </div>
                        <ul className="contact-list">
                            {messagesLoading && <li className="loading-message">Loading...</li>}
                            {!messagesLoading && filteredConversations.map((conv) => (
                                <li 
                                    key={conv.id} 
                                    className={`contact-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                                    onClick={() => setSelectedConversation(conv)}
                                >
                                    <div className="contact-avatar">
                                        <span>{getInitials(conv.title)}</span>
                                    </div>
                                    <div className="contact-info">
                                        <div className="contact-name">
                                            <span>{conv.title}</span>
                                            <span className="contact-time">{conv.lastActivityLabel || formatTime(conv.lastActivity)}</span>
                                        </div>
                                        <div className="contact-preview">{conv.projectTitle} • {conv.messageCount} messages</div>
                                    </div>
                                    <div className="status-flag" title={conv.type === 'direct' ? 'Direct chat' : 'Channel chat'}></div>
                                </li>
                            ))}
                            {!messagesLoading && hasSelectedUserData && filteredConversations.length === 0 && (
                                <li className="loading-message">No conversations for this user yet.</li>
                            )}
                            {!messagesLoading && !selectedUser && (
                                <li className="loading-message">Search and select a user from the top bar.</li>
                            )}
                        </ul>
                    </div>

                    {/* Chat Panel */}
                    <div className="chat-panel">
                        {!selectedConversation ? (
                            <div className="no-message-selected">
                                <div className="no-message-icon">
                                    <i className="fas fa-shield-alt"></i>
                                </div>
                                <div className="no-message-text">
                                    {!selectedUser && <p>Search and select a user from the top search bar.</p>}
                                    {!!selectedUser && hasSelectedUserData && <p>{displayData.user.name} selected. Pick a conversation from the left panel.</p>}
                                    {!!selectedUser && !hasSelectedUserData && <p>Loading selected user chats...</p>}
                                    <p style={{ fontSize: '14px', marginTop: '10px' }}>All channel and DM threads for the selected user will appear below.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="chat-interface">
                                <div className="chat-header">
                                    <div className="contact-avatar">
                                        <span>{getInitials(selectedConversation.title)}</span>
                                    </div>
                                    <div className="chat-title">
                                        <div className="chat-user">{selectedConversation.title}</div>
                                        <div className="chat-status">{selectedConversation.projectTitle} • Last activity: {selectedConversation.lastActivityLabel || formatTime(selectedConversation.lastActivity)}</div>
                                    </div>
                                    <div className="chat-controls">
                                        <button className="chat-control-btn">
                                            <i className="fas fa-file-export"></i> Export
                                        </button>
                                        <button className="chat-control-btn danger-btn">
                                            <i className="fas fa-flag"></i> Flag
                                        </button>
                                    </div>
                                </div>
                                <div className="messages-area">
                                    {selectedConversation.messages?.map((msg) => (
                                        <div key={msg.id} className={`message ${msg.isTargetUser ? 'user-a' : 'user-b'}`}>
                                            <div className="message-content">
                                                {msg.text || (msg.fileName ? `Attachment: ${msg.fileName}` : 'Message')}
                                            </div>
                                            <div className="message-meta">
                                                <span className="message-user">{msg.author}{msg.isTargetUser ? ' (searched user)' : ''}</span>
                                                <span className="message-time">{msg.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedConversation.messages?.length === 0 && (
                                        <div className="no-message-text" style={{ padding: '24px' }}>
                                            No messages found in this thread.
                                        </div>
                                    )}
                                </div>
                                <div className="monitoring-tools">
                                    <div className="monitoring-status">
                                        <i className="fas fa-eye"></i> Monitoring Active
                                    </div>
                                    <div className="action-buttons">
                                        <button className="btn btn-outline">
                                            <i className="fas fa-envelope"></i> Send System Message
                                        </button>
                                        <button className="btn btn-primary">
                                            <i className="fas fa-ban"></i> Block Conversation
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminMessages;
