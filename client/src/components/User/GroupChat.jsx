import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import NavBar from './NavBar.jsx';
import '../../styles/GroupChat.css';

const GroupChat = () => {
    const { projectId } = useParams(); // Get projectId from URL parameter
    const navigate = useNavigate();
    const { user } = useAuth(); // Get current user from auth context
    
    // State for projects, channels, users, messages
    const [projects, setProjects] = useState([]);
    const [channels, setChannels] = useState([]);
    const [users, setUsers] = useState([]);
    const currentUserId = user?.id; // Get current user ID from auth
    
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

    // Ref for scrolling to bottom
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const prevMessagesLength = useRef(0);

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch user's projects on mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await axios.get('/api/messages/projects');
                if (response.data.success) {
                    setProjects(response.data.projects);
                    
                    // If projectId is in URL, use that; otherwise use first project
                    const initialProject = projectId 
                        ? response.data.projects.find(p => p._id === projectId)
                        : response.data.projects[0];
                    
                    if (initialProject) {
                        setActiveProject(initialProject._id);
                        loadProjectData(initialProject._id);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching projects:', error);
                setLoading(false);
            }
        };
        
        fetchProjects();
    }, [projectId]);

    // Load channels and members for a project
    const loadProjectData = async (projId) => {
        try {
            setLoading(true);
            
            // Fetch channels
            const channelsResponse = await axios.get(`/api/messages/projects/${projId}/channels`);
            if (channelsResponse.data.success) {
                setChannels(channelsResponse.data.channels);
                
                // Select first channel by default
                if (channelsResponse.data.channels.length > 0) {
                    const firstChannel = channelsResponse.data.channels[0];
                    setCurrentChannel(firstChannel.name);
                    setCurrentChannelId(firstChannel._id);
                    loadChannelMessages(firstChannel._id);
                }
            }
            
            // Fetch members
            const membersResponse = await axios.get(`/api/messages/projects/${projId}/members`);
            if (membersResponse.data.success) {
                const membersList = membersResponse.data.members;
                setUsers(membersList);
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
            const response = await axios.get(`/api/messages/channels/${channelId}/messages`);
            if (response.data.success) {
                setMessages(response.data.messages);
                
                // Mark as read
                await axios.post(`/api/messages/channels/${channelId}/mark-read`);
            }
        } catch (error) {
            console.error('Error loading channel messages:', error);
        }
    };

    // Load direct messages between users
    const loadDirectMessages = async (projId, otherUserId) => {
        try {
            const response = await axios.get(`/api/messages/projects/${projId}/direct-messages/${otherUserId}`);
            if (response.data.success) {
                setDirectMessages(response.data.messages);
                // Mark as read
                await axios.post(`/api/messages/projects/${projId}/direct-messages/${otherUserId}/mark-read`);
            }
        } catch (error) {
            console.error('Error loading direct messages:', error);
        }
    };

    // Get current time formatted
    const getCurrentTime = () => {
        return new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    };

    // Handle sending a message
    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedMessage = messageInput.trim();
        if (!trimmedMessage && !selectedFile) return;

        try {
            if (isDM && currentDmUser) {
                // Send direct message
                const response = await axios.post(
                    `/api/messages/projects/${activeProject}/direct-messages/${currentDmUser}`,
                    { text: trimmedMessage }
                );
                
                if (response.data.success) {
                    setDirectMessages(prev => [...prev, response.data.message]);
                    setMessageInput('');
                }
            } else if (currentChannelId) {
                // Send channel message with file
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
                    setMessages(prev => [...prev, response.data.message]);
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
        loadDirectMessages(activeProject, userId);
    };
    
    // Search messages
    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query.trim() || !currentChannelId || isDM) {
            setShowSearchResults(false);
            setSearchResults([]);
            return;
        }
        //for web soc transfer here and below /api routes convert them
        try {
            const response = await axios.get(
                `/api/messages/channels/${currentChannelId}/search`,
                { params: { query: query.trim() } }
            );
            if (response.data.success) {
                setSearchResults(response.data.messages);
                setShowSearchResults(true);
            }
        } catch (error) {
            console.error('Error searching messages:', error);
        }
    };
    
    // Update online status periodically
    useEffect(() => {
        if (!activeProject) return;
        
        const updateStatus = async () => {
            try {
                await axios.post(`/api/messages/projects/${activeProject}/online-status`);
            } catch (error) {
                console.error('Error updating online status:', error);
            }
        };
        
        updateStatus();
        const interval = setInterval(updateStatus, 30000); // Every 30 seconds
        
        return () => clearInterval(interval);
    }, [activeProject]);

    // Switch project
    const switchProject = (projId) => {
        setActiveProject(projId);
        setIsDM(false);
        setCurrentDmUser(null);
        setCurrentChannel(null);
        setCurrentChannelId(null);
        setMessages([]);
        setDirectMessages([]);
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
            const response = await axios.post(
                `/api/messages/projects/${activeProject}/channels`,
                { channelName: newChannelName.trim() }
            );
            
            if (response.data.success) {
                setChannels(prev => [...prev, response.data.channel]);
                setNewChannelName('');
                setShowChannelInput(false);
            } else {
                alert(response.data.error || 'Failed to create channel');
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
                                # {channel.name}
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
                                <span>{user.username}</span>
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
                            {!isDM && (
                                <>
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
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Search Results */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="search-results-panel">
                            <div className="search-results-header">
                                <h4>Search Results ({searchResults.length})</h4>
                                <button 
                                    className="close-pinned-btn"
                                    onClick={() => {
                                        setShowSearchResults(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                            {searchResults.map(msg => (
                                <div key={msg._id} className="search-result-item">
                                    <div>
                                        <span className="search-result-author">{msg.author}</span>
                                        <span className="search-result-time">{msg.time}</span>
                                    </div>
                                    <div className="search-result-text">{msg.text}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="messages-container" ref={messagesContainerRef}>
                        {getCurrentMessages().length > 0 ? (
                            getCurrentMessages().map((message, index) => (
                                <div className="message" key={message._id || index}>
                                    <div className="message-avatar">
                                        {message.author.charAt(0)}
                                    </div>
                                    <div className="message-content">
                                        <div className="message-header">
                                            <span className="message-author">{message.author}</span>
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
                            ))
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
