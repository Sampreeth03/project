import React, { useState, useEffect, useRef } from 'react';
import NavBar from './NavBar.jsx';
import '../../styles/GroupChat.css';

const GroupChat = () => {
    // Sample users data
    const [users] = useState([
        { id: '1', username: 'Sampreeth', online: true },
        { id: '2', username: 'Eswar', online: true },
        { id: '3', username: 'Surya', online: false },
        { id: '4', username: 'Shiva', online: true }
    ]);

    // Current logged in user
    const currentUser = { id: '5', username: 'You' };

    // Channel messages state
    const [messages, setMessages] = useState({
        general: [
            { author: 'Sampreeth', text: 'Hey everyone! Welcome to our project!', time: '2:30 PM' },
            { author: 'Eswar', text: 'Hello! Everyone', time: '2:32 PM' },
            { author: 'Surya', text: 'Hey', time: '2:35 PM' }
        ],
        announcements: [
            { author: 'Sampreeth', text: 'Important announcement: We have a new team member joining next week!', time: '3:00 PM' }
        ],
        random: [
            { author: 'Shiva', text: 'Did anyone see that new movie that came out last weekend?', time: '4:15 PM' }
        ]
    });

    // Direct messages state
    const [directMessages, setDirectMessages] = useState({
        '1-5': [
            { from: '1', text: 'Hey, how are you doing?', time: '3:15 PM' },
            { from: '5', text: "I'm good! Just checking out this new chat app.", time: '3:16 PM' }
        ]
    });

    // UI State
    const [currentChannel, setCurrentChannel] = useState('general');
    const [isDM, setIsDM] = useState(false);
    const [currentDmUser, setCurrentDmUser] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [activeServer, setActiveServer] = useState('P1');

    // Ref for scrolling to bottom
    const messagesEndRef = useRef(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, directMessages, currentChannel, currentDmUser]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedMessage = messageInput.trim();
        if (!trimmedMessage) return;

        if (isDM && currentDmUser) {
            // Direct message
            const conversationId = [currentUser.id, currentDmUser].sort().join('-');
            setDirectMessages(prev => ({
                ...prev,
                [conversationId]: [
                    ...(prev[conversationId] || []),
                    { from: currentUser.id, text: trimmedMessage, time: getCurrentTime() }
                ]
            }));
        } else {
            // Channel message
            setMessages(prev => ({
                ...prev,
                [currentChannel]: [
                    ...prev[currentChannel],
                    { author: currentUser.username, text: trimmedMessage, time: getCurrentTime() }
                ]
            }));
        }

        setMessageInput('');
    };

    // Switch to a channel
    const switchToChannel = (channel) => {
        setCurrentChannel(channel);
        setIsDM(false);
        setCurrentDmUser(null);
    };

    // Switch to DM
    const switchToDM = (userId) => {
        setIsDM(true);
        setCurrentDmUser(userId);
    };

    // Get messages for current view
    const getCurrentMessages = () => {
        if (isDM && currentDmUser) {
            const conversationId = [currentUser.id, currentDmUser].sort().join('-');
            const dms = directMessages[conversationId] || [];
            return dms.map(dm => {
                const isCurrentUser = dm.from === currentUser.id;
                const user = isCurrentUser 
                    ? currentUser 
                    : users.find(u => u.id === dm.from);
                return {
                    author: user?.username || 'Unknown',
                    text: dm.text,
                    time: dm.time
                };
            });
        }
        return messages[currentChannel] || [];
    };

    // Get current chat name
    const getCurrentChatName = () => {
        if (isDM && currentDmUser) {
            const user = users.find(u => u.id === currentDmUser);
            return user?.username || 'Unknown';
        }
        return currentChannel;
    };

    // Get placeholder text
    const getPlaceholder = () => {
        if (isDM && currentDmUser) {
            const user = users.find(u => u.id === currentDmUser);
            return `Message @${user?.username || 'user'}`;
        }
        return `Message #${currentChannel}`;
    };

    // Channels list
    const channels = ['general', 'announcements', 'random'];

    return (
        <div className="group-chat-wrapper">
            <NavBar />

            <div className="app-container">
                {/* Server List Sidebar */}
                <div className="server-list">
                    <div 
                        className={`server-icon ${activeServer === 'P1' ? 'active' : ''}`}
                        onClick={() => setActiveServer('P1')}
                    >
                        P1
                    </div>
                    <div 
                        className={`server-icon ${activeServer === 'P2' ? 'active' : ''}`}
                        onClick={() => setActiveServer('P2')}
                    >
                        P2
                    </div>
                    <div className="server-icon">+</div>
                </div>

                {/* Channels Sidebar */}
                <div className="channels-sidebar">
                    <div className="server-header">Project 1</div>
                    
                    <div className="channels-header">
                        <span>Text Channels</span>
                        <span>+</span>
                    </div>
                    
                    <div className="channels-list">
                        {channels.map(channel => (
                            <div
                                key={channel}
                                className={`channel ${!isDM && currentChannel === channel ? 'active' : ''}`}
                                onClick={() => switchToChannel(channel)}
                            >
                                # {channel}
                            </div>
                        ))}
                    </div>

                    <div className="direct-messages-header">
                        <span>Direct Messages</span>
                    </div>
                    
                    <div className="channels-list">
                        {users.map(user => (
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
                        <span className="chat-header-icon">
                            {isDM ? '@' : '#'}
                        </span>
                        <span>{getCurrentChatName()}</span>
                    </div>

                    <div className="messages-container">
                        {getCurrentMessages().length > 0 ? (
                            getCurrentMessages().map((message, index) => (
                                <div className="message" key={index}>
                                    <div className="message-avatar">
                                        {message.author.charAt(0)}
                                    </div>
                                    <div className="message-content">
                                        <div className="message-header">
                                            <span className="message-author">{message.author}</span>
                                            <span className="message-time">{message.time}</span>
                                        </div>
                                        <div className="message-text">{message.text}</div>
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
                        <form className="message-input-form" onSubmit={handleSubmit}>
                            <div className="file-upload">
                                <label htmlFor="file-input" className="file-upload-label">
                                    <i className="fas fa-paperclip"></i>
                                </label>
                                <input type="file" id="file-input" />
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
                                disabled={!messageInput.trim()}
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Members Sidebar */}
                <div className="members-sidebar">
                    <div className="members-header">
                        Members — {users.length + 1}
                    </div>
                    <div>
                        {/* Current User */}
                        <div className="user">
                            <div className="user-avatar">
                                {currentUser.username.charAt(0)}
                            </div>
                            <span>{currentUser.username}</span>
                            <span className="user-status"></span>
                        </div>
                        {/* Other Users */}
                        {users.map(user => (
                            <div className="user" key={user.id}>
                                <div className="user-avatar">
                                    {user.username.charAt(0)}
                                </div>
                                <span>{user.username}</span>
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
