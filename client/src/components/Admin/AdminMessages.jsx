import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchMessagesData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminMessages = () => {
    const dispatch = useDispatch();
    const { messages, messagesLoading, messagesError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConversation, setSelectedConversation] = useState(null);

    useEffect(() => {
        dispatch(fetchMessagesData());
    }, [dispatch]);

    const emptyStats = { totalConversations: 0, flaggedConversations: 0, messagesToday: 0, responseRate: 0 };
    const displayData = messages.conversations?.length > 0 ? messages : { conversations: [], stats: emptyStats };

    const filteredConversations = displayData.conversations.filter(conv =>
        conv.participants?.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    };

    return (
        <div className="admin-container">
            <AdminSidebar />
            <div className="admin-main-content">
                {/* Header */}
                <div className="admin-header">
                    <div className="welcome">
                        <h2>Message Monitoring</h2>
                        <h4>Monitor conversations between students and recruiters</h4>
                    </div>
                    <div className="admin-controls">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <i className="fas fa-search"></i>
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
                {messagesError && <div className="error-message">Error: {messagesError}. Please login as admin.</div>}
                <div className="message-stats">
                    <div className="stat-card">
                        <div className="stat-title">Total Active Conversations</div>
                        <div className="stat-value">{displayData.stats.totalConversations}</div>
                        <div className="stat-secondary">+24 this week</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-title">Flagged Conversations</div>
                        <div className="stat-value">{displayData.stats.flaggedConversations}</div>
                        <div className="stat-secondary">-3 from last week</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-title">Messages Today</div>
                        <div className="stat-value">{displayData.stats.messagesToday.toLocaleString()}</div>
                        <div className="stat-secondary">+126 from yesterday</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-title">Message Response Rate</div>
                        <div className="stat-value">{displayData.stats.responseRate}%</div>
                        <div className="stat-secondary">+2% this month</div>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="messages-container">
                    {/* Contacts Panel */}
                    <div className="contacts-panel">
                        <div className="contacts-header">
                            <div className="contacts-title">Active Conversations</div>
                            <button className="filter-btn">
                                <i className="fas fa-filter"></i> Filter
                            </button>
                        </div>
                        <div className="contact-search">
                            <input 
                                type="text" 
                                placeholder="Search conversations..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
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
                                        <i className="fas fa-users"></i>
                                    </div>
                                    <div className="contact-info">
                                        <div className="contact-name">
                                            <span>{conv.participants?.join(' & ')}</span>
                                            <span className="contact-time">{formatTime(conv.lastActivity)}</span>
                                        </div>
                                        <div className="contact-preview">{conv.lastMessage}</div>
                                    </div>
                                    {conv.flagged && <div className="status-flag"></div>}
                                </li>
                            ))}
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
                                    <p>Select a conversation to monitor</p>
                                    <p style={{ fontSize: '14px', marginTop: '10px' }}>You can view messages and flag inappropriate content</p>
                                </div>
                            </div>
                        ) : (
                            <div className="chat-interface">
                                <div className="chat-header">
                                    <div className="contact-avatar">
                                        <i className="fas fa-users"></i>
                                    </div>
                                    <div className="chat-title">
                                        <div className="chat-user">{selectedConversation.participants?.join(' & ')}</div>
                                        <div className="chat-status">Last activity: {formatTime(selectedConversation.lastActivity)}</div>
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
                                        <div key={msg.id} className={`message ${msg.isUserA ? 'user-a' : 'user-b'}`}>
                                            <div className="message-content">{msg.content}</div>
                                            <div className="message-meta">
                                                <span className="message-user">{msg.sender}</span>
                                                <span className="message-time">{msg.time}</span>
                                            </div>
                                        </div>
                                    ))}
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
