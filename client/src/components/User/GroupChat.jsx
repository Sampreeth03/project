import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import NavBar from './NavBar.jsx';
import '../../styles/GroupChat.css';

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const socketBaseUrl = String(import.meta.env.VITE_SOCKET_URL || apiBaseUrl).trim().replace(/\/$/, '');

const GroupChat = () => {
    const { projectId } = useParams(); // Get projectId from URL parameter
    const navigate = useNavigate();
    const { user } = useAuth(); // Get current user from auth context
    
    // State for projects, channels, users, messages
    const [projects, setProjects] = useState([]);
    const [channels, setChannels] = useState([]);
    const [users, setUsers] = useState([]);
    const currentUserId = user?.id || user?._id; // Get current user ID from auth

    const [unreadChannels, setUnreadChannels] = useState({});
    const [unreadDMs, setUnreadDMs] = useState({});
    
    // Channel messages state
    const [messages, setMessages] = useState([]);
    const [directMessages, setDirectMessages] = useState([]);

    // UI State
    const [currentChannel, setCurrentChannel] = useState(null);
    const [currentChannelId, setCurrentChannelId] = useState(null);
    const [isDM, setIsDM] = useState(false);
    const [currentDmUser, setCurrentDmUser] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [activeProject, setActiveProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newChannelName, setNewChannelName] = useState('');
    const [showChannelInput, setShowChannelInput] = useState(false);
    
    // New feature states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const searchSeqRef = useRef(0);

    // Ref for scrolling to bottom
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const prevMessagesLength = useRef(0);

    const socketRef = useRef(null);
    const activeProjectRef = useRef(null);
    const isDMRef = useRef(false);
    const currentChannelIdRef = useRef(null);
    const currentDmUserRef = useRef(null);
    const onlineUserIdsRef = useRef(new Set());
    const currentUserIdRef = useRef(null);

    // Only scroll to bottom when NEW messages are added (not on initial load or channel switch)
    useEffect(() => {
        const currentLength = messages.length || directMessages.length;
        
        // Only auto-scroll if messages were added (not replaced) and user is near bottom
        if (currentLength > prevMessagesLength.current && messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            
            if (isNearBottom) {
                scrollToBottom();
            }
        }
        
        prevMessagesLength.current = currentLength;
    }, [messages, directMessages]);

    useEffect(() => {
        currentChannelIdRef.current = currentChannelId;
    }, [currentChannelId]);

    useEffect(() => {
        currentDmUserRef.current = currentDmUser;
    }, [currentDmUser]);

    useEffect(() => {
        activeProjectRef.current = activeProject;
    }, [activeProject]);

    useEffect(() => {
        isDMRef.current = isDM;
    }, [isDM]);

    useEffect(() => {
        currentUserIdRef.current = currentUserId;
    }, [currentUserId]);

    const appendUnique = (prev, msg) => {
        if (!msg) return prev;
        if (!msg._id) return [...prev, msg];
        return prev.some(m => m?._id === msg._id) ? prev : [...prev, msg];
    };

    useEffect(() => {
        const socket = io(socketBaseUrl || undefined, {
            withCredentials: true,
            transports: ['websocket']
        });

        socketRef.current = socket;

        socket.on('presence:update', ({ projectId: pid, onlineUserIds } = {}) => {
            if (!pid || pid !== activeProjectRef.current) return;
            const onlineSet = new Set((onlineUserIds || []).map(String));
            onlineUserIdsRef.current = onlineSet;
            setUsers(prev => prev.map(u => ({ ...u, online: onlineSet.has(String(u.id)) })));
        });

        socket.on('channel:newMessage', ({ channelId, message } = {}) => {
            if (!channelId || channelId !== currentChannelIdRef.current) return;
            setMessages(prev => appendUnique(prev, message));
        });

        socket.on('channel:notify', ({ projectId: pid, channelId, message } = {}) => {
            if (!pid || pid !== activeProjectRef.current || !channelId) return;

            const senderId = message?.senderId ? String(message.senderId) : '';
            if (senderId && senderId === String(currentUserIdRef.current || '')) return;

            if (!isDMRef.current && currentChannelIdRef.current === channelId) return;

            setUnreadChannels(prev => ({
                ...prev,
                [channelId]: (prev?.[channelId] || 0) + 1
            }));
        });

        socket.on('dm:newMessage', ({ message } = {}) => {
            if (!isDMRef.current || !currentDmUserRef.current) return;
            setDirectMessages(prev => appendUnique(prev, message));
        });

        socket.on('dm:notify', ({ projectId: pid, fromUserId, message } = {}) => {
            if (!pid || pid !== activeProjectRef.current) return;

            const fromId = String(fromUserId || message?.from || '');
            if (!fromId) return;
            if (fromId === String(currentUserIdRef.current || '')) return;

            if (isDMRef.current && String(currentDmUserRef.current || '') === fromId) return;

            setUnreadDMs(prev => ({
                ...prev,
                [fromId]: (prev?.[fromId] || 0) + 1
            }));
        });

        socket.on('project:channelCreated', ({ projectId: pid, channel } = {}) => {
            if (!pid || pid !== activeProjectRef.current || !channel?._id) return;
            setChannels(prev => (prev.some(c => c?._id === channel._id) ? prev : [...prev, channel]));
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !activeProject) return;

        socket.emit('join:project', { projectId: activeProject });

        return () => {
            socket.emit('leave:project', { projectId: activeProject });
        };
    }, [activeProject]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !currentChannelId || isDM) return;

        socket.emit('join:channel', { channelId: currentChannelId });
        return () => {
            socket.emit('leave:channel', { channelId: currentChannelId });
        };
    }, [currentChannelId, isDM]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !activeProject || !isDM || !currentDmUser) return;

        socket.emit('join:dm', { projectId: activeProject, otherUserId: currentDmUser });
        return () => {
            socket.emit('leave:dm', { projectId: activeProject, otherUserId: currentDmUser });
        };
    }, [activeProject, isDM, currentDmUser]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const emitAck = (event, payload) => {
        const socket = socketRef.current;
        return new Promise((resolve) => {
            if (!socket?.connected) return resolve({ success: false, error: 'WebSocket disconnected' });
            socket.emit(event, payload, (ack) => resolve(ack || { success: false }));
        });
    };

    // Fetch user's projects on mount
    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setLoading(true);
            const ack = await emitAck('fetch:projects', {});
            if (cancelled) return;
            if (!ack?.success) {
                console.error('Error fetching projects:', ack?.error);
                setLoading(false);
                return;
            }

            setProjects(ack.projects || []);

            const initialProject = projectId
                ? (ack.projects || []).find(p => p._id === projectId)
                : (ack.projects || [])[0];

            if (initialProject?._id) {
                setActiveProject(initialProject._id);
                loadProjectData(initialProject._id);
            } else {
                setLoading(false);
            }
        };

        const socket = socketRef.current;
        if (socket?.connected) run();
        else socket?.once('connect', run);

        return () => {
            cancelled = true;
            socket?.off('connect', run);
        };
    }, [projectId]);

    // Load channels and members for a project
    const loadProjectData = async (projId) => {
        try {
            setLoading(true);
            const [channelsAck, membersAck] = await Promise.all([
                emitAck('fetch:channels', { projectId: projId }),
                emitAck('fetch:members', { projectId: projId })
            ]);

            if (channelsAck?.success) {
                setChannels(channelsAck.channels || []);

                if ((channelsAck.channels || []).length > 0) {
                    const firstChannel = channelsAck.channels[0];
                    setCurrentChannel(firstChannel.name);
                    setCurrentChannelId(firstChannel._id);
                    loadChannelMessages(firstChannel._id);
                }
            }

            if (membersAck?.success) {
                const onlineSet = new Set((membersAck.onlineUserIds || []).map(String));
                onlineUserIdsRef.current = onlineSet;
                setUsers((membersAck.members || []).map(u => ({ ...u, online: onlineSet.has(String(u.id)) })));
            }

            const unreadAck = await emitAck('fetch:unreadCounts', { projectId: projId });
            if (unreadAck?.success) {
                setUnreadChannels(unreadAck.channelUnread || {});
                setUnreadDMs(unreadAck.dmUnread || {});
            }

            setLoading(false);
        } catch (error) {
            console.error('Error loading project data:', error);
            setLoading(false);
        }
    };

    // Load messages for a channel
    const loadChannelMessages = async (channelId) => {
        try {
            const ack = await emitAck('fetch:channelMessages', { channelId });
            if (ack?.success) {
                setMessages(ack.messages || []);
                await emitAck('mark:channelRead', { channelId });
                setUnreadChannels(prev => ({ ...prev, [channelId]: 0 }));
            }
        } catch (error) {
            console.error('Error loading channel messages:', error);
        }
    };

    // Load direct messages between users
    const loadDirectMessages = async (projId, otherUserId) => {
        try {
            const ack = await emitAck('fetch:directMessages', { projectId: projId, otherUserId });
            if (ack?.success) {
                setDirectMessages(ack.messages || []);
                await emitAck('mark:dmRead', { projectId: projId, otherUserId });
                setUnreadDMs(prev => ({ ...prev, [otherUserId]: 0 }));
            }
        } catch (error) {
            console.error('Error loading direct messages:', error);
        }
    };

    // Handle sending a message
    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedMessage = messageInput.trim();
        if (!trimmedMessage && !selectedFile) return;

        try {
            if (isDM && currentDmUser) {
                const socket = socketRef.current;
                if (!socket?.connected) {
                    alert('WebSocket disconnected. Please refresh and try again.');
                    return;
                }

                socket.emit(
                    'send:directMessage',
                    { projectId: activeProject, otherUserId: currentDmUser, text: trimmedMessage },
                    (ack) => {
                        if (ack?.success) {
                            setMessageInput('');
                        } else {
                            alert(ack?.error || 'Failed to send message');
                        }
                    }
                );
            } else if (currentChannelId) {
                const socket = socketRef.current;

                if (!socket?.connected) {
                    alert('WebSocket disconnected. Please refresh and try again.');
                    return;
                }

                if (!selectedFile) {
                    socket.emit(
                        'send:channelMessage',
                        { channelId: currentChannelId, text: trimmedMessage },
                        (ack) => {
                            if (ack?.success) {
                                setMessageInput('');
                            } else {
                                alert(ack?.error || 'Failed to send message');
                            }
                        }
                    );
                    return;
                }

                const formData = new FormData();
                if (trimmedMessage) {
                    formData.append('text', trimmedMessage);
                }
                if (selectedFile) {
                    formData.append('file', selectedFile);
                }

                const response = await axios.post(
                    `/api/messages/channels/${currentChannelId}/messages`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
                
                if (response.data.success) {
                    setMessageInput('');
                    setSelectedFile(null);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    };

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File too large! Maximum size is 10MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    // Switch to a channel
    const switchToChannel = (channel) => {
        setCurrentChannel(channel.name);
        setCurrentChannelId(channel._id);
        setIsDM(false);
        setCurrentDmUser(null);
        setSearchQuery('');
        setShowSearchResults(false);
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError('');
        setUnreadChannels(prev => ({ ...prev, [channel._id]: 0 }));
        loadChannelMessages(channel._id);
    };

    // Switch to DM
    const switchToDM = (userId) => {
        setIsDM(true);
        setCurrentDmUser(userId);
        setCurrentChannel(null);
        setCurrentChannelId(null);
        setSearchQuery('');
        setShowSearchResults(false);
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError('');
        setUnreadDMs(prev => ({ ...prev, [userId]: 0 }));
        loadDirectMessages(activeProject, userId);
    };
    
    // Search messages
    const handleSearch = async (query) => {
        const seq = ++searchSeqRef.current;
        setSearchQuery(query);
        if (!query.trim()) {
            setShowSearchResults(false);
            setSearchResults([]);
            setSearchLoading(false);
            setSearchError('');
            return;
        }

        setShowSearchResults(true);
        setSearchLoading(true);
        setSearchError('');
        setSearchResults([]);

        if (isDM) {
            if (!activeProject || !currentDmUser) {
                if (seq !== searchSeqRef.current) return;
                setSearchLoading(false);
                setSearchError('Open a DM to search.');
                return;
            }

            try {
                const ack = await emitAck('search:directMessages', {
                    projectId: activeProject,
                    otherUserId: currentDmUser,
                    query: query.trim()
                });
                if (seq !== searchSeqRef.current) return;
                if (ack?.success) setSearchResults(ack.messages || []);
                else setSearchError(ack?.error || 'Search failed');
                setSearchLoading(false);
            } catch (error) {
                if (seq !== searchSeqRef.current) return;
                console.error('Error searching direct messages:', error);
                setSearchError('Search failed');
                setSearchLoading(false);
            }

            return;
        }

        if (!currentChannelId) {
            if (seq !== searchSeqRef.current) return;
            setSearchLoading(false);
            setSearchError('Open a channel to search.');
            return;
        }
        try {
            const ack = await emitAck('search:channelMessages', { channelId: currentChannelId, query: query.trim() });
            if (seq !== searchSeqRef.current) return;
            if (ack?.success) setSearchResults(ack.messages || []);
            else setSearchError(ack?.error || 'Search failed');
            setSearchLoading(false);
        } catch (error) {
            if (seq !== searchSeqRef.current) return;
            console.error('Error searching messages:', error);
            setSearchError('Search failed');
            setSearchLoading(false);
        }
    };
    
    // Online status is handled via websockets now

    // Switch project
    const switchProject = (projId) => {
        setActiveProject(projId);
        setIsDM(false);
        setCurrentDmUser(null);
        setCurrentChannel(null);
        setCurrentChannelId(null);
        setMessages([]);
        setDirectMessages([]);
        setUnreadChannels({});
        setUnreadDMs({});
        navigate(`/group-chat/${projId}`);
        loadProjectData(projId);
    };

    // Add new channel (creator only)
    const handleAddChannel = async () => {
        if (!newChannelName.trim()) {
            alert('Please enter a channel name');
            return;
        }

        try {
            const ack = await emitAck('create:channel', { projectId: activeProject, channelName: newChannelName.trim() });
            if (ack?.success) {
                setChannels(prev => [...prev, ack.channel]);
                if (ack.channel?._id) {
                    setUnreadChannels(prev => ({ ...prev, [ack.channel._id]: 0 }));
                }
                setNewChannelName('');
                setShowChannelInput(false);
            } else {
                alert(ack?.error || 'Failed to create channel');
            }
        } catch (error) {
            console.error('Error creating channel:', error);
            alert('Failed to create channel');
        }
    };

    // Get messages for current view
    const getCurrentMessages = () => {
        if (isDM && currentDmUser) {
            return directMessages;
        }
        return messages;
    };

    // Get current chat name
    const getCurrentChatName = () => {
        if (isDM && currentDmUser) {
            const user = users.find(u => u.id === currentDmUser);
            return user?.username || 'Unknown';
        }
        return currentChannel || 'Select a channel';
    };

    // Get placeholder text
    const getPlaceholder = () => {
        if (isDM && currentDmUser) {
            const user = users.find(u => u.id === currentDmUser);
            return `Message @${user?.username || 'user'}`;
        }
        return `Message #${currentChannel || 'channel'}`;
    };

    // Get active project name
    const getActiveProjectName = () => {
        const project = projects.find(p => p._id === activeProject);
        return project?.title || 'Select Project';
    };

    // Get project abbreviation (first 2-3 letters)
    const getProjectAbbreviation = (projectTitle) => {
        if (!projectTitle) return 'PRJ';
        
        // Remove special characters and split into words
        const words = projectTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
        
        if (words.length > 1) {
            // Multi-word: take first letter of each word (up to 3)
            return words.slice(0, 3).map(w => w.charAt(0)).join('').toUpperCase();
        } else {
            // Single word: take first 3 letters
            return projectTitle.substring(0, 3).toUpperCase();
        }
    };

    if (loading) {
        return (
            <div className="group-chat-wrapper">
                <NavBar />
                <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>
                    Loading chat...
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="group-chat-wrapper">
                <NavBar />
                <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>
                    <p>No projects available. Create or join a project to start chatting!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="group-chat-wrapper">
            <NavBar />

            <div className="app-container">
                {/* Server List Sidebar */}
                <div className="server-list">
                    {projects.map((project, index) => (
                        <div 
                            key={project._id}
                            className={`server-icon ${activeProject === project._id ? 'active' : ''}`}
                            onClick={() => switchProject(project._id)}
                            title={project.title}
                        >
                            {getProjectAbbreviation(project.title)}
                        </div>
                    ))}
                </div>

                {/* Channels Sidebar */}
                <div className="channels-sidebar">
                    <div className="server-header">{getActiveProjectName()}</div>
                    
                    <div className="channels-header">
                        <span>Text Channels</span>
                        <span 
                            style={{ cursor: 'pointer' }}
                            onClick={() => setShowChannelInput(!showChannelInput)}
                        >
                            +
                        </span>
                    </div>
                    
                    {showChannelInput && (
                        <div style={{ padding: '8px' }}>
                            <input
                                type="text"
                                placeholder="Channel name"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddChannel()}
                                style={{
                                    width: '100%',
                                    padding: '5px',
                                    background: '#2f3136',
                                    border: '1px solid #202225',
                                    color: '#dcddde',
                                    borderRadius: '3px'
                                }}
                            />
                            <button 
                                onClick={handleAddChannel}
                                style={{
                                    marginTop: '5px',
                                    width: '100%',
                                    padding: '5px',
                                    background: '#5865f2',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                }}
                            >
                                Create
                            </button>
                        </div>
                    )}
                    
                    <div className="channels-list">
                        {channels.map(channel => (
                            <div
                                key={channel._id}
                                className={`channel ${!isDM && currentChannelId === channel._id ? 'active' : ''}`}
                                onClick={() => switchToChannel(channel)}
                            >
                                # {unreadChannels?.[channel._id] > 0 ? `(${unreadChannels[channel._id]}) ` : ''}{channel.name}
                            </div>
                        ))}
                    </div>

                    <div className="direct-messages-header">
                        <span>Direct Messages</span>
                    </div>
                    
                    <div className="channels-list">
                        {users.filter(u => u.id !== currentUserId).map(user => (
                            <div
                                key={user.id}
                                className={`user ${isDM && currentDmUser === user.id ? 'active' : ''}`}
                                onClick={() => switchToDM(user.id)}
                            >
                                <div className="user-avatar">
                                    {user.username.charAt(0)}
                                </div>
                                <span>{unreadDMs?.[user.id] > 0 ? `(${unreadDMs[user.id]}) ` : ''}{user.username}</span>
                                <span className={`user-status ${user.online ? '' : 'offline'}`}></span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="chat-area">
                    <div className="chat-header">
                        <div className="chat-header-left">
                            <span className="chat-header-icon">
                                {isDM ? '@' : '#'}
                            </span>
                            <span>{getCurrentChatName()}</span>
                        </div>
                        
                        <div className="chat-header-actions">
                            {/* Search */}
                            <div className="search-container">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                                <span className="search-icon">⌕</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Search Results */}
                    {showSearchResults && (
                        <div className="search-results-panel">
                            <div className="search-results-header">
                                <h4>Search Results ({searchResults.length})</h4>
                                <button 
                                    className="close-pinned-btn"
                                    onClick={() => {
                                        setShowSearchResults(false);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setSearchLoading(false);
                                        setSearchError('');
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                            {searchLoading ? (
                                <div className="search-result-item">
                                    <div className="search-result-text">Searching…</div>
                                </div>
                            ) : searchError ? (
                                <div className="search-result-item">
                                    <div className="search-result-text">{searchError}</div>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="search-result-item">
                                    <div className="search-result-text">No results</div>
                                </div>
                            ) : (
                                searchResults.map(msg => (
                                    <div key={msg._id} className="search-result-item">
                                        <div>
                                            <span className="search-result-author">{msg.author}</span>
                                            <span className="search-result-time">{msg.time}</span>
                                        </div>
                                        <div className="search-result-text">{msg.text}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <div className="messages-container" ref={messagesContainerRef}>
                        {getCurrentMessages().length > 0 ? (
                            getCurrentMessages().map((message, index) => {
                                const me = String(currentUserId || '');
                                const fromId = isDM
                                    ? String(message?.from || '')
                                    : String(message?.senderId || '');
                                const isMine = !!me && !!fromId && fromId === me;
                                const authorLabel = isMine ? 'You' : (message?.author || '');

                                return (
                                    <div className="message" key={message._id || index}>
                                        <div className="message-content">
                                            <div className="message-header">
                                                <div className="message-avatar message-avatar--small">
                                                    {authorLabel ? authorLabel.charAt(0) : '?'}
                                                </div>
                                                <span className="message-author">{authorLabel}</span>
                                                <span className="message-time">{message.time}</span>
                                            </div>
                                            {message.text && <div className="message-text">{message.text}</div>}
                                            {message.file_url && (
                                                <div className="message-file">
                                                    {message.file_type?.startsWith('image/') ? (
                                                        <img
                                                            src={message.file_url}
                                                            alt={message.file_name}
                                                            className="message-image"
                                                            onClick={() => window.open(message.file_url, '_blank')}
                                                        />
                                                    ) : (
                                                        <a
                                                            href={message.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="message-file-link"
                                                        >
                                                            📎 {message.file_name}
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-messages">
                                <i className="fas fa-comments"></i>
                                <p>No messages yet. Start the conversation!</p>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="message-input-container">
                        {selectedFile && (
                            <div className="file-preview">
                                <span>{selectedFile.name}</span>
                                <button type="button" onClick={() => setSelectedFile(null)}>✕</button>
                            </div>
                        )}
                        <form className="message-input-form" onSubmit={handleSubmit}>
                            <div className="file-upload">
                                <label htmlFor="file-input" className="file-upload-label">
                                    <i className="fas fa-paperclip"></i>
                                </label>
                                <input 
                                    type="file" 
                                    id="file-input"
                                    onChange={handleFileSelect}
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                    style={{ display: 'none' }}
                                />
                            </div>
                            <input
                                type="text"
                                className="message-input"
                                placeholder={getPlaceholder()}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                autoComplete="off"
                            />
                            <button 
                                type="submit" 
                                className="send-button"
                                disabled={!messageInput.trim() && !selectedFile}
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Members Sidebar */}
                <div className="members-sidebar">
                    <div className="members-header">
                        Members — {users.length}
                    </div>
                    <div>
                        {users.map(user => (
                            <div className="user" key={user.id}>
                                <div className="user-avatar">
                                    {user.username.charAt(0)}
                                </div>
                                <span>
                                    {user.username}
                                    {user.id === currentUserId && <span style={{ color: '#888', fontSize: '0.85em', marginLeft: '5px' }}>(you)</span>}
                                </span>
                                <span className={`user-status ${user.online ? '' : 'offline'}`}></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupChat;
