// controllers/messageController.js

const mongoose = require('mongoose');
const { Project, ProjectMember, Channel, Message, DirectMessage, User, UserReadStatus } = require('../database');
const { upload } = require('../middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');

// Get all projects for the current user (both created and joined)
const getUserProjects = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;

        // Projects created by user
        const createdProjects = await Project.find({ user_id: userId, status: 'active' })
            .select('_id title')
            .lean();

        // Projects user is a member of (approved)
        const memberProjects = await ProjectMember.find({ user_id: userId })
            .populate('project_id', '_id title status')
            .lean();

        const joinedProjects = memberProjects
            .filter(pm => pm.project_id && pm.project_id.status === 'active')
            .map(pm => ({
                _id: pm.project_id._id,
                title: pm.project_id.title
            }));

        // Combine and deduplicate
        const allProjects = [...createdProjects, ...joinedProjects];
        const uniqueProjects = Array.from(new Map(allProjects.map(p => [p._id.toString(), p])).values());

        res.json({ success: true, projects: uniqueProjects });
    } catch (error) {
        console.error('Error fetching user projects:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
};

// Get channels for a specific project
const getProjectChannels = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { projectId } = req.params;

        // Verify user is a member or creator of the project
        const project = await Project.findById(projectId).select('user_id').lean();
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const isMember = await ProjectMember.exists({ project_id: projectId, user_id: userId });
        const isCreator = project.user_id.toString() === userId.toString();

        if (!isMember && !isCreator) {
            return res.status(403).json({ success: false, error: 'Not authorized to view this project' });
        }

        const channels = await Channel.find({ project_id: projectId })
            .select('_id name created_at')
            .lean();

        res.json({ success: true, channels });
    } catch (error) {
        console.error('Error fetching project channels:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch channels' });
    }
};

// Get members of a specific project
const getProjectMembers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { projectId } = req.params;

        // Verify user is a member or creator
        const project = await Project.findById(projectId).select('user_id').lean();
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const isMember = await ProjectMember.exists({ project_id: projectId, user_id: userId });
        const isCreator = project.user_id.toString() === userId.toString();

        if (!isMember && !isCreator) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        // Get all members
        const members = await ProjectMember.find({ project_id: projectId })
            .populate('user_id', '_id name')
            .lean();

        const memberList = members.map(m => ({
            id: m.user_id._id.toString(),
            username: m.user_id.name,
            online: false // Will be true with websockets later
        }));

        // Add creator if not already in list
        const creatorInList = memberList.find(m => m.id === project.user_id.toString());
        if (!creatorInList) {
            const creator = await User.findById(project.user_id).select('_id name').lean();
            if (creator) {
                memberList.unshift({
                    id: creator._id.toString(),
                    username: creator.name,
                    online: false
                });
            }
        }

        res.json({ success: true, members: memberList });
    } catch (error) {
        console.error('Error fetching project members:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch members' });
    }
};

// Get messages for a specific channel
const getChannelMessages = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { channelId } = req.params;

        // Verify channel exists and user has access
        const channel = await Channel.findById(channelId).select('project_id').lean();
        if (!channel) {
            return res.status(404).json({ success: false, error: 'Channel not found' });
        }

        const [isMember, project] = await Promise.all([
            ProjectMember.exists({ project_id: channel.project_id, user_id: userId }),
            Project.findById(channel.project_id).select('user_id').lean()
        ]);
        const isCreator = project && project.user_id.toString() === userId.toString();

        if (!isMember && !isCreator) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const messages = await Message.find({ channel_id: channelId })
            .populate('sender_id', 'name')
            .sort({ created_at: 1 })
            .lean();

        const formattedMessages = messages.map(msg => ({
            _id: msg._id,
            author: msg.sender_id.name,
            senderId: msg.sender_id._id.toString(),
            text: msg.text,
            file_url: msg.file_url,
            file_name: msg.file_name,
            file_type: msg.file_type,
            is_pinned: msg.is_pinned || false,
            time: new Date(msg.created_at).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            })
        }));

        res.json({ success: true, messages: formattedMessages, isOwner: isCreator });
    } catch (error) {
        console.error('Error fetching channel messages:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
};

// Send a message to a channel
const sendChannelMessage = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { channelId } = req.params;
        const { text } = req.body;

        if ((!text || text.trim().length === 0) && !req.file) {
            return res.status(400).json({ success: false, error: 'Message text or file is required' });
        }

        // Verify channel exists and user has access
        const channel = await Channel.findById(channelId).select('project_id').lean();
        if (!channel) {
            return res.status(404).json({ success: false, error: 'Channel not found' });
        }

        const [isMember, project] = await Promise.all([
            ProjectMember.exists({ project_id: channel.project_id, user_id: userId }),
            Project.findById(channel.project_id).select('user_id').lean()
        ]);
        const isCreator = project && project.user_id.toString() === userId.toString();

        if (!isMember && !isCreator) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const messageData = {
            project_id: channel.project_id,
            channel_id: channelId,
            sender_id: userId
        };

        if (text && text.trim()) {
            messageData.text = text.trim();
        }

        if (req.file) {
            messageData.file_url = `/uploads/${req.file.filename}`;
            messageData.file_name = req.file.originalname;
            messageData.file_type = req.file.mimetype;
        }

        const newMessage = await Message.create(messageData);

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender_id', 'name')
            .lean();

        const formattedMessage = {
            _id: populatedMessage._id,
            author: populatedMessage.sender_id.name,
            senderId: populatedMessage.sender_id._id.toString(),
            text: populatedMessage.text,
            file_url: populatedMessage.file_url,
            file_name: populatedMessage.file_name,
            file_type: populatedMessage.file_type,
            is_pinned: populatedMessage.is_pinned || false,
            time: new Date(populatedMessage.created_at).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            })
        };

        const io = req.app?.get('io');
        if (io) {
            io.to(`channel:${channelId}`).emit('channel:newMessage', { channelId, message: formattedMessage });
            if (messageData.project_id) {
                io.to(`project:${messageData.project_id.toString()}`).emit('channel:notify', {
                    projectId: messageData.project_id.toString(),
                    channelId,
                    message: formattedMessage
                });
            }
        }

        res.json({ success: true, message: formattedMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
};

// Get direct messages between current user and another user in a project
const getDirectMessages = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { projectId, otherUserId } = req.params;

        // Verify both users are in the same project
        const project = await Project.findById(projectId).select('user_id').lean();
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const [currentUserMember, otherUserMember] = await Promise.all([
            ProjectMember.exists({ project_id: projectId, user_id: userId }),
            ProjectMember.exists({ project_id: projectId, user_id: otherUserId })
        ]);

        const isCurrentCreator = project.user_id.toString() === userId.toString();
        const isOtherCreator = project.user_id.toString() === otherUserId.toString();

        if ((!currentUserMember && !isCurrentCreator) || (!otherUserMember && !isOtherCreator)) {
            return res.status(403).json({ success: false, error: 'Both users must be in the same project' });
        }

        const messages = await DirectMessage.find({
            project_id: projectId,
            $or: [
                { sender_id: userId, receiver_id: otherUserId },
                { sender_id: otherUserId, receiver_id: userId }
            ]
        })
        .populate('sender_id', 'name')
        .sort({ created_at: 1 })
        .lean();

        const formattedMessages = messages.map(msg => ({
            _id: msg._id,
            from: msg.sender_id._id.toString(),
            author: msg.sender_id.name,
            text: msg.text,
            time: new Date(msg.created_at).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            })
        }));

        res.json({ success: true, messages: formattedMessages });
    } catch (error) {
        console.error('Error fetching direct messages:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch direct messages' });
    }
};

// Send a direct message
const sendDirectMessage = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { projectId, otherUserId } = req.params;
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Message text is required' });
        }

        // Verify both users are in the same project
        const project = await Project.findById(projectId).select('user_id').lean();
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const [currentUserMember, otherUserMember] = await Promise.all([
            ProjectMember.exists({ project_id: projectId, user_id: userId }),
            ProjectMember.exists({ project_id: projectId, user_id: otherUserId })
        ]);

        const isCurrentCreator = project.user_id.toString() === userId.toString();
        const isOtherCreator = project.user_id.toString() === otherUserId.toString();

        if ((!currentUserMember && !isCurrentCreator) || (!otherUserMember && !isOtherCreator)) {
            return res.status(403).json({ success: false, error: 'Both users must be in the same project' });
        }

        const newMessage = await DirectMessage.create({
            project_id: projectId,
            sender_id: userId,
            receiver_id: otherUserId,
            text: text.trim()
        });

        const populatedMessage = await DirectMessage.findById(newMessage._id)
            .populate('sender_id', 'name')
            .lean();

        const formattedMessage = {
            _id: populatedMessage._id,
            from: populatedMessage.sender_id._id.toString(),
            author: populatedMessage.sender_id.name,
            text: populatedMessage.text,
            time: new Date(populatedMessage.created_at).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            })
        };

        const io = req.app?.get('io');
        if (io) {
            const [a, b] = [userId.toString(), otherUserId.toString()].sort();
            io.to(`dm:${projectId}:${a}:${b}`).emit('dm:newMessage', { projectId, otherUserId, message: formattedMessage });

            io.to(`user:${otherUserId.toString()}`).emit('dm:notify', {
                projectId: projectId.toString(),
                fromUserId: userId.toString(),
                message: formattedMessage
            });
            io.to(`user:${userId.toString()}`).emit('dm:notify', {
                projectId: projectId.toString(),
                fromUserId: userId.toString(),
                message: formattedMessage
            });
        }

        res.json({ success: true, message: formattedMessage });
    } catch (error) {
        console.error('Error sending direct message:', error);
        res.status(500).json({ success: false, error: 'Failed to send direct message' });
    }
};

// Create a new channel (only project creator)
const createChannel = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { projectId } = req.params;
        const { channelName } = req.body;

        if (!channelName || channelName.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Channel name is required' });
        }

        const project = await Project.findById(projectId).select('user_id').lean();
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Only creator can add channels
        if (project.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, error: 'Only project creator can add channels' });
        }

        // Check if channel already exists
        const existingChannel = await Channel.findOne({ 
            project_id: projectId, 
            name: channelName.toLowerCase().trim() 
        }).select('_id').lean();

        if (existingChannel) {
            return res.status(400).json({ success: false, error: 'Channel already exists' });
        }

        const newChannel = await Channel.create({
            project_id: projectId,
            name: channelName.toLowerCase().trim(),
            created_by: userId
        });

        res.json({ 
            success: true, 
            channel: {
                _id: newChannel._id,
                name: newChannel.name,
                created_at: newChannel.created_at
            }
        });
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ success: false, error: 'Failed to create channel' });
    }
};

// Get unread message counts for all projects
const getUnreadCounts = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const userIdStr = userId.toString();

        // Get all user's projects
        const createdProjects = await Project.find({ user_id: userId, status: 'active' }).select('_id').lean();
        const memberProjects = await ProjectMember.find({ user_id: userId }).populate('project_id', '_id status').lean();

        const uniqueProjectIds = Array.from(new Set([
            ...createdProjects.map(p => p._id),
            ...memberProjects.filter(pm => pm.project_id && pm.project_id.status === 'active').map(pm => pm.project_id._id)
        ].map((id) => id.toString())));

        if (uniqueProjectIds.length === 0) {
            return res.json({ success: true, unreadCounts: {} });
        }

        const projectIds = uniqueProjectIds.map((id) => new mongoose.Types.ObjectId(id));

        const [channels, allProjectMembers] = await Promise.all([
            Channel.find({ project_id: { $in: projectIds } }).select('_id project_id').lean(),
            ProjectMember.find({ project_id: { $in: projectIds } }).select('project_id user_id').lean()
        ]);

        const channelIds = channels.map((channel) => channel._id);

        const [channelStatuses, dmStatuses] = await Promise.all([
            channelIds.length > 0
                ? UserReadStatus.find({
                    user_id: userId,
                    is_dm: false,
                    channel_id: { $in: channelIds }
                }).select('channel_id last_seen_at').lean()
                : [],
            UserReadStatus.find({
                user_id: userId,
                project_id: { $in: projectIds },
                is_dm: true
            }).select('project_id other_user_id last_seen_at').lean()
        ]);

        const channelLastSeenMap = new Map(
            channelStatuses
                .filter((status) => status.channel_id)
                .map((status) => [status.channel_id.toString(), status.last_seen_at || new Date(0)])
        );

        const dmLastSeenMap = new Map(
            dmStatuses
                .filter((status) => status.project_id && status.other_user_id)
                .map((status) => [`${status.project_id.toString()}::${status.other_user_id.toString()}`, status.last_seen_at || new Date(0)])
        );

        const membersByProject = new Map();
        for (const member of allProjectMembers) {
            const projectId = member.project_id?.toString();
            const memberId = member.user_id?.toString();
            if (!projectId || !memberId || memberId === userIdStr) continue;
            if (!membersByProject.has(projectId)) membersByProject.set(projectId, new Set());
            membersByProject.get(projectId).add(memberId);
        }

        const unreadCounts = Object.fromEntries(uniqueProjectIds.map((id) => [id, 0]));

        const channelCountPromises = channels.map(async (channel) => {
            const channelId = channel._id.toString();
            const projectId = channel.project_id.toString();
            const lastSeenAt = channelLastSeenMap.get(channelId) || new Date(0);
            const unreadCount = await Message.countDocuments({
                channel_id: channel._id,
                created_at: { $gt: lastSeenAt },
                sender_id: { $ne: userId }
            });
            unreadCounts[projectId] += unreadCount;
        });

        const dmCountPromises = [];
        for (const projectId of uniqueProjectIds) {
            const memberIds = Array.from(membersByProject.get(projectId) || []);
            for (const memberId of memberIds) {
                const lastSeenAt = dmLastSeenMap.get(`${projectId}::${memberId}`) || new Date(0);
                dmCountPromises.push(
                    DirectMessage.countDocuments({
                        project_id: projectId,
                        receiver_id: userId,
                        sender_id: memberId,
                        created_at: { $gt: lastSeenAt }
                    }).then((count) => {
                        unreadCounts[projectId] += count;
                    })
                );
            }
        }

        await Promise.all([...channelCountPromises, ...dmCountPromises]);

        res.json({ success: true, unreadCounts });
    } catch (error) {
        console.error('Error getting unread counts:', error);
        res.status(500).json({ success: false, error: 'Failed to get unread counts' });
    }
};

// Mark channel messages as read
const markChannelAsRead = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { channelId } = req.params;

        // Get channel to get project_id
        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ success: false, error: 'Channel not found' });
        }

        await UserReadStatus.findOneAndUpdate(
            {
                user_id: userId,
                channel_id: channelId,
                is_dm: false
            },
            {
                user_id: userId,
                channel_id: channelId,
                project_id: channel.project_id,
                is_dm: false,
                last_seen_at: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking channel as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
};

// Mark DMs as read
const markDMAsRead = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { projectId, otherUserId } = req.params;

        await UserReadStatus.findOneAndUpdate(
            {
                user_id: userId,
                project_id: projectId,
                other_user_id: otherUserId,
                is_dm: true
            },
            {
                user_id: userId,
                project_id: projectId,
                other_user_id: otherUserId,
                is_dm: true,
                last_seen_at: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking DM as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
};

// Search messages in a channel
const searchChannelMessages = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { channelId } = req.params;
        const { query } = req.query;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Search query is required' });
        }

        // Verify channel access
        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ success: false, error: 'Channel not found' });
        }

        const isMember = await ProjectMember.findOne({ 
            project_id: channel.project_id, 
            user_id: userId 
        });
        const project = await Project.findById(channel.project_id);
        const isCreator = project && project.user_id.toString() === userId.toString();

        if (!isMember && !isCreator) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        // Search messages using regex (case-insensitive)
        const messages = await Message.find({ 
            channel_id: channelId,
            text: { $regex: query, $options: 'i' }
        })
            .populate('sender_id', 'name')
            .sort({ created_at: -1 })
            .limit(50)
            .lean();

        const formattedMessages = messages.map(msg => ({
            _id: msg._id,
            author: msg.sender_id.name,
            text: msg.text,
            file_url: msg.file_url,
            file_name: msg.file_name,
            file_type: msg.file_type,
            time: new Date(msg.created_at).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            }),
            created_at: msg.created_at
        }));

        res.json({ success: true, messages: formattedMessages });
    } catch (error) {
        console.error('Error searching messages:', error);
        res.status(500).json({ success: false, error: 'Failed to search messages' });
    }
};

// Pin/Unpin a message (owner only)
const togglePinMessage = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { messageId } = req.params;

        // Get message and verify it exists
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Verify user is project owner
        const project = await Project.findById(message.project_id);
        if (!project || project.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, error: 'Only project owner can pin messages' });
        }

        // Toggle pin status
        message.is_pinned = !message.is_pinned;
        if (message.is_pinned) {
            message.pinned_by = userId;
            message.pinned_at = new Date();
        } else {
            message.pinned_by = null;
            message.pinned_at = null;
        }

        await message.save();

        res.json({ success: true, is_pinned: message.is_pinned });
    } catch (error) {
        console.error('Error toggling pin message:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle pin' });
    }
};

// Get pinned messages for a channel
const getPinnedMessages = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        const userId = req.user.id;
        const { channelId } = req.params;

        // Verify channel access
        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ success: false, error: 'Channel not found' });
        }

        const isMember = await ProjectMember.findOne({ 
            project_id: channel.project_id, 
            user_id: userId 
        });
        const project = await Project.findById(channel.project_id);
        const isCreator = project && project.user_id.toString() === userId.toString();

        if (!isMember && !isCreator) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const pinnedMessages = await Message.find({ 
            channel_id: channelId,
            is_pinned: true
        })
            .populate('sender_id', 'name')
            .populate('pinned_by', 'name')
            .sort({ pinned_at: -1 })
            .lean();

        const formattedMessages = pinnedMessages.map(msg => ({
            _id: msg._id,
            author: msg.sender_id.name,
            text: msg.text,
            file_url: msg.file_url,
            file_name: msg.file_name,
            file_type: msg.file_type,
            pinned_by: msg.pinned_by?.name,
            pinned_at: msg.pinned_at,
            time: new Date(msg.created_at).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            })
        }));

        res.json({ success: true, messages: formattedMessages, isOwner: isCreator });
    } catch (error) {
        console.error('Error getting pinned messages:', error);
        res.status(500).json({ success: false, error: 'Failed to get pinned messages' });
    }
};

module.exports = {
    getUserProjects,
    getProjectChannels,
    getProjectMembers,
    getChannelMessages,
    sendChannelMessage,
    getDirectMessages,
    sendDirectMessage,
    createChannel,
    getUnreadCounts,
    markChannelAsRead,
    markDMAsRead,
    searchChannelMessages,
    togglePinMessage,
    getPinnedMessages
};

