const { Project, ProjectMember, Channel, Message, DirectMessage, User, UserReadStatus } = require('../database');

const projectRoom = (projectId) => `project:${projectId}`;
const channelRoom = (channelId) => `channel:${channelId}`;
const userRoom = (userId) => `user:${userId}`;
const dmRoom = (projectId, userAId, userBId) => {
    const [a, b] = [userAId.toString(), userBId.toString()].sort();
    return `dm:${projectId}:${a}:${b}`;
};

const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
});

const formatChannelMessage = (msg) => ({
    _id: msg._id,
    author: msg.sender_id?.name,
    senderId: msg.sender_id?._id?.toString(),
    text: msg.text,
    file_url: msg.file_url,
    file_name: msg.file_name,
    file_type: msg.file_type,
    is_pinned: msg.is_pinned || false,
    time: formatTime(msg.created_at)
});

const formatDirectMessage = (msg) => ({
    _id: msg._id,
    from: msg.sender_id?._id?.toString(),
    author: msg.sender_id?.name,
    text: msg.text,
    time: formatTime(msg.created_at)
});

const canAccessProject = async (userId, projectId) => {
    const project = await Project.findById(projectId).select('_id user_id status').lean();
    if (!project || project.status !== 'active') return { ok: false };

    const isCreator = project.user_id.toString() === userId.toString();
    if (isCreator) return { ok: true, project, isCreator: true };

    const isMember = await ProjectMember.exists({ project_id: projectId, user_id: userId });
    if (!isMember) return { ok: false };

    return { ok: true, project, isCreator: false };
};

const canAccessChannel = async (userId, channelId) => {
    const channel = await Channel.findById(channelId).select('_id project_id name').lean();
    if (!channel) return { ok: false };

    const access = await canAccessProject(userId, channel.project_id);
    if (!access.ok) return { ok: false };

    return { ok: true, channel, project: access.project, isCreator: access.isCreator };
};

const canAccessDM = async (userId, projectId, otherUserId) => {
    const project = await Project.findById(projectId).select('_id user_id status').lean();
    if (!project || project.status !== 'active') return { ok: false };

    const isCurrentCreator = project.user_id.toString() === userId.toString();
    const isOtherCreator = project.user_id.toString() === otherUserId.toString();

    const currentIsMember = isCurrentCreator || await ProjectMember.exists({ project_id: projectId, user_id: userId });
    const otherIsMember = isOtherCreator || await ProjectMember.exists({ project_id: projectId, user_id: otherUserId });

    if (!currentIsMember || !otherIsMember) return { ok: false };

    return { ok: true, project };
};

const setupChatSocket = (io) => {
    const presence = new Map();

    const getOnlineUserIdsForProject = (projectId) => {
        const projectKey = projectId.toString();
        const projectMap = presence.get(projectKey);
        if (!projectMap) return [];
        return Array.from(projectMap.keys());
    };

    const bumpPresence = (projectId, userId, delta) => {
        const projectKey = projectId.toString();
        const userKey = userId.toString();

        if (!presence.has(projectKey)) presence.set(projectKey, new Map());
        const projectMap = presence.get(projectKey);

        const nextCount = (projectMap.get(userKey) || 0) + delta;
        if (nextCount <= 0) projectMap.delete(userKey);
        else projectMap.set(userKey, nextCount);

        if (projectMap.size === 0) presence.delete(projectKey);

        const onlineUserIds = projectMap ? Array.from(projectMap.keys()) : [];
        io.to(projectRoom(projectKey)).emit('presence:update', { projectId: projectKey, onlineUserIds });
    };

    io.on('connection', (socket) => {
        const sessionUser = socket.request?.session?.user;
        if (!sessionUser?.id) {
            socket.disconnect(true);
            return;
        }

        const userId = sessionUser.id.toString();
        socket.data.userId = userId;
        socket.data.joinedProjects = new Set();

        socket.join(userRoom(userId));

        socket.on('join:project', async ({ projectId } = {}, cb) => {
            try {
                if (!projectId) return cb?.({ success: false, error: 'projectId required' });
                if (socket.data.joinedProjects.has(projectId)) return cb?.({ success: true });

                const access = await canAccessProject(userId, projectId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                socket.join(projectRoom(projectId));
                socket.data.joinedProjects.add(projectId);
                bumpPresence(projectId, userId, 1);

                cb?.({ success: true });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to join project' });
            }
        });

        socket.on('fetch:projects', async (_payload = {}, cb) => {
            try {
                const createdProjects = await Project.find({ user_id: userId, status: 'active' })
                    .select('_id title')
                    .lean();

                const memberProjects = await ProjectMember.find({ user_id: userId })
                    .populate('project_id', '_id title status')
                    .lean();

                const joinedProjects = memberProjects
                    .filter(pm => pm.project_id && pm.project_id.status === 'active')
                    .map(pm => ({
                        _id: pm.project_id._id,
                        title: pm.project_id.title
                    }));

                const allProjects = [...createdProjects, ...joinedProjects];
                const uniqueProjects = Array.from(new Map(allProjects.map(p => [p._id.toString(), p])).values());

                cb?.({ success: true, projects: uniqueProjects });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to fetch projects' });
            }
        });

        socket.on('fetch:channels', async ({ projectId } = {}, cb) => {
            try {
                if (!projectId) return cb?.({ success: false, error: 'projectId required' });
                const access = await canAccessProject(userId, projectId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                const channels = await Channel.find({ project_id: projectId })
                    .select('_id name created_at')
                    .lean();

                cb?.({ success: true, channels });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to fetch channels' });
            }
        });

        socket.on('fetch:members', async ({ projectId } = {}, cb) => {
            try {
                if (!projectId) return cb?.({ success: false, error: 'projectId required' });
                const access = await canAccessProject(userId, projectId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                const project = await Project.findById(projectId).select('_id user_id').lean();
                if (!project) return cb?.({ success: false, error: 'Project not found' });

                const members = await ProjectMember.find({ project_id: projectId })
                    .populate('user_id', '_id name')
                    .lean();

                const memberList = members
                    .filter(m => m.user_id)
                    .map(m => ({
                        id: m.user_id._id.toString(),
                        username: m.user_id.name,
                        online: false
                    }));

                const creatorId = project.user_id.toString();
                if (!memberList.find(m => m.id === creatorId)) {
                    const creator = await User.findById(project.user_id).select('_id name').lean();
                    if (creator) {
                        memberList.unshift({
                            id: creator._id.toString(),
                            username: creator.name,
                            online: false
                        });
                    }
                }

                const onlineUserIds = getOnlineUserIdsForProject(projectId);
                const onlineSet = new Set(onlineUserIds.map(String));
                const membersWithPresence = memberList.map(m => ({ ...m, online: onlineSet.has(String(m.id)) }));

                cb?.({ success: true, members: membersWithPresence, onlineUserIds });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to fetch members' });
            }
        });

        socket.on('fetch:unreadCounts', async ({ projectId } = {}, cb) => {
            try {
                if (!projectId) return cb?.({ success: false, error: 'projectId required' });
                const access = await canAccessProject(userId, projectId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                const channels = await Channel.find({ project_id: projectId }).select('_id').lean();

                const channelReadStatuses = await UserReadStatus.find({
                    user_id: userId,
                    is_dm: false,
                    channel_id: { $in: channels.map(c => c._id) }
                })
                    .select('channel_id last_seen_at')
                    .lean();

                const lastSeenByChannelId = new Map(
                    channelReadStatuses
                        .filter(s => s.channel_id)
                        .map(s => [s.channel_id.toString(), s.last_seen_at || new Date(0)])
                );

                const channelUnreadEntries = await Promise.all(
                    channels.map(async (c) => {
                        const lastSeenAt = lastSeenByChannelId.get(c._id.toString()) || new Date(0);
                        const unreadCount = await Message.countDocuments({
                            channel_id: c._id,
                            created_at: { $gt: lastSeenAt },
                            sender_id: { $ne: userId }
                        });
                        return [c._id.toString(), unreadCount];
                    })
                );

                const memberDocs = await ProjectMember.find({ project_id: projectId }).select('user_id').lean();
                const memberIds = new Set(memberDocs.map(m => m.user_id?.toString()).filter(Boolean));
                const creatorId = access.project?.user_id?.toString();
                if (creatorId) memberIds.add(creatorId);
                memberIds.delete(userId.toString());

                const otherUserIds = Array.from(memberIds);

                const dmReadStatuses = await UserReadStatus.find({
                    user_id: userId,
                    project_id: projectId,
                    is_dm: true,
                    other_user_id: { $in: otherUserIds }
                })
                    .select('other_user_id last_seen_at')
                    .lean();

                const lastSeenByOtherUserId = new Map(
                    dmReadStatuses
                        .filter(s => s.other_user_id)
                        .map(s => [s.other_user_id.toString(), s.last_seen_at || new Date(0)])
                );

                const dmUnreadEntries = await Promise.all(
                    otherUserIds.map(async (otherId) => {
                        const lastSeenAt = lastSeenByOtherUserId.get(otherId) || new Date(0);
                        const unreadCount = await DirectMessage.countDocuments({
                            project_id: projectId,
                            receiver_id: userId,
                            sender_id: otherId,
                            created_at: { $gt: lastSeenAt }
                        });
                        return [otherId, unreadCount];
                    })
                );

                cb?.({
                    success: true,
                    channelUnread: Object.fromEntries(channelUnreadEntries),
                    dmUnread: Object.fromEntries(dmUnreadEntries)
                });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to fetch unread counts' });
            }
        });

        socket.on('fetch:channelMessages', async ({ channelId } = {}, cb) => {
            try {
                if (!channelId) return cb?.({ success: false, error: 'channelId required' });

                const access = await canAccessChannel(userId, channelId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                const messages = await Message.find({ channel_id: channelId })
                    .populate('sender_id', 'name')
                    .sort({ created_at: 1 })
                    .lean();

                cb?.({ success: true, messages: messages.map(formatChannelMessage) });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to fetch messages' });
            }
        });

        socket.on('fetch:directMessages', async ({ projectId, otherUserId } = {}, cb) => {
            try {
                if (!projectId || !otherUserId) return cb?.({ success: false, error: 'projectId and otherUserId required' });

                const access = await canAccessDM(userId, projectId, otherUserId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

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

                cb?.({ success: true, messages: messages.map(formatDirectMessage) });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to fetch direct messages' });
            }
        });

        socket.on('mark:channelRead', async ({ channelId } = {}, cb) => {
            try {
                if (!channelId) return cb?.({ success: false, error: 'channelId required' });
                const access = await canAccessChannel(userId, channelId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                await UserReadStatus.findOneAndUpdate(
                    {
                        user_id: userId,
                        channel_id: channelId,
                        is_dm: false
                    },
                    {
                        user_id: userId,
                        channel_id: channelId,
                        project_id: access.channel.project_id,
                        is_dm: false,
                        last_seen_at: new Date()
                    },
                    { upsert: true, new: true }
                );

                cb?.({ success: true });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to mark as read' });
            }
        });

        socket.on('mark:dmRead', async ({ projectId, otherUserId } = {}, cb) => {
            try {
                if (!projectId || !otherUserId) return cb?.({ success: false, error: 'projectId and otherUserId required' });
                const access = await canAccessDM(userId, projectId, otherUserId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

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

                cb?.({ success: true });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to mark as read' });
            }
        });

        socket.on('search:channelMessages', async ({ channelId, query } = {}, cb) => {
            try {
                const q = (query || '').trim();
                if (!channelId || !q) return cb?.({ success: false, error: 'channelId and query required' });

                const access = await canAccessChannel(userId, channelId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                const messages = await Message.find({
                    channel_id: channelId,
                    text: { $regex: q, $options: 'i' }
                })
                    .populate('sender_id', 'name')
                    .sort({ created_at: -1 })
                    .limit(50)
                    .lean();

                const results = messages.map(msg => ({
                    _id: msg._id,
                    author: msg.sender_id?.name,
                    text: msg.text,
                    file_url: msg.file_url,
                    file_name: msg.file_name,
                    file_type: msg.file_type,
                    time: formatTime(msg.created_at),
                    created_at: msg.created_at
                }));

                cb?.({ success: true, messages: results });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to search messages' });
            }
        });

        socket.on('search:directMessages', async ({ projectId, otherUserId, query } = {}, cb) => {
            try {
                const q = (query || '').trim();
                if (!projectId || !otherUserId || !q) return cb?.({ success: false, error: 'projectId, otherUserId and query required' });

                const access = await canAccessDM(userId, projectId, otherUserId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                const messages = await DirectMessage.find({
                    project_id: projectId,
                    text: { $regex: q, $options: 'i' },
                    $or: [
                        { sender_id: userId, receiver_id: otherUserId },
                        { sender_id: otherUserId, receiver_id: userId }
                    ]
                })
                    .populate('sender_id', 'name')
                    .sort({ created_at: -1 })
                    .limit(50)
                    .lean();

                const results = messages.map(msg => ({
                    _id: msg._id,
                    from: msg.sender_id?._id?.toString(),
                    author: msg.sender_id?.name,
                    text: msg.text,
                    time: formatTime(msg.created_at),
                    created_at: msg.created_at
                }));

                cb?.({ success: true, messages: results });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to search direct messages' });
            }
        });

        socket.on('create:channel', async ({ projectId, channelName } = {}, cb) => {
            try {
                const name = (channelName || '').toLowerCase().trim();
                if (!projectId || !name) return cb?.({ success: false, error: 'projectId and channelName required' });

                const project = await Project.findById(projectId).select('_id user_id').lean();
                if (!project) return cb?.({ success: false, error: 'Project not found' });
                if (project.user_id.toString() !== userId.toString()) return cb?.({ success: false, error: 'Only project creator can add channels' });

                const existingChannel = await Channel.findOne({ project_id: projectId, name }).lean();
                if (existingChannel) return cb?.({ success: false, error: 'Channel already exists' });

                const newChannel = await Channel.create({
                    project_id: projectId,
                    name,
                    created_by: userId
                });

                const payload = {
                    _id: newChannel._id,
                    name: newChannel.name,
                    created_at: newChannel.created_at
                };

                io.to(projectRoom(projectId)).emit('project:channelCreated', { projectId, channel: payload });
                cb?.({ success: true, channel: payload });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to create channel' });
            }
        });

        socket.on('leave:project', ({ projectId } = {}, cb) => {
            if (!projectId) return cb?.({ success: false, error: 'projectId required' });
            if (!socket.data.joinedProjects.has(projectId)) return cb?.({ success: true });

            socket.leave(projectRoom(projectId));
            socket.data.joinedProjects.delete(projectId);
            bumpPresence(projectId, userId, -1);
            cb?.({ success: true });
        });

        socket.on('join:channel', async ({ channelId } = {}, cb) => {
            try {
                if (!channelId) return cb?.({ success: false, error: 'channelId required' });

                const access = await canAccessChannel(userId, channelId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                socket.join(channelRoom(channelId));
                cb?.({ success: true, projectId: access.channel.project_id?.toString() });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to join channel' });
            }
        });

        socket.on('leave:channel', ({ channelId } = {}, cb) => {
            if (!channelId) return cb?.({ success: false, error: 'channelId required' });
            socket.leave(channelRoom(channelId));
            cb?.({ success: true });
        });

        socket.on('join:dm', async ({ projectId, otherUserId } = {}, cb) => {
            try {
                if (!projectId || !otherUserId) return cb?.({ success: false, error: 'projectId and otherUserId required' });

                const access = await canAccessDM(userId, projectId, otherUserId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                socket.join(dmRoom(projectId, userId, otherUserId));
                cb?.({ success: true });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to join dm' });
            }
        });

        socket.on('leave:dm', ({ projectId, otherUserId } = {}, cb) => {
            if (!projectId || !otherUserId) return cb?.({ success: false, error: 'projectId and otherUserId required' });
            socket.leave(dmRoom(projectId, userId, otherUserId));
            cb?.({ success: true });
        });

        socket.on('send:channelMessage', async ({ channelId, text } = {}, cb) => {
            try {
                const trimmed = (text || '').trim();
                if (!channelId || !trimmed) return cb?.({ success: false, error: 'channelId and text required' });

                const access = await canAccessChannel(userId, channelId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                const newMessage = await Message.create({
                    project_id: access.channel.project_id,
                    channel_id: channelId,
                    sender_id: userId,
                    text: trimmed
                });

                const populated = await Message.findById(newMessage._id).populate('sender_id', 'name').lean();
                const formatted = formatChannelMessage(populated);

                io.to(channelRoom(channelId)).emit('channel:newMessage', { channelId, message: formatted });
                io.to(projectRoom(access.channel.project_id.toString())).emit('channel:notify', {
                    projectId: access.channel.project_id.toString(),
                    channelId,
                    message: formatted
                });
                cb?.({ success: true, message: formatted });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to send message' });
            }
        });

        socket.on('send:directMessage', async ({ projectId, otherUserId, text } = {}, cb) => {
            try {
                const trimmed = (text || '').trim();
                if (!projectId || !otherUserId || !trimmed) return cb?.({ success: false, error: 'projectId, otherUserId and text required' });

                const access = await canAccessDM(userId, projectId, otherUserId);
                if (!access.ok) return cb?.({ success: false, error: 'Not authorized' });

                const newMessage = await DirectMessage.create({
                    project_id: projectId,
                    sender_id: userId,
                    receiver_id: otherUserId,
                    text: trimmed
                });

                const populated = await DirectMessage.findById(newMessage._id).populate('sender_id', 'name').lean();
                const formatted = formatDirectMessage(populated);

                io.to(dmRoom(projectId, userId, otherUserId)).emit('dm:newMessage', { projectId, otherUserId, message: formatted });
                io.to(userRoom(otherUserId.toString())).emit('dm:notify', {
                    projectId: projectId.toString(),
                    fromUserId: userId,
                    message: formatted
                });
                io.to(userRoom(userId)).emit('dm:notify', {
                    projectId: projectId.toString(),
                    fromUserId: userId,
                    message: formatted
                });
                cb?.({ success: true, message: formatted });
            } catch (e) {
                cb?.({ success: false, error: 'Failed to send message' });
            }
        });

        socket.on('disconnect', () => {
            for (const projectId of socket.data.joinedProjects || []) {
                bumpPresence(projectId, userId, -1);
            }
        });
    });
};

module.exports = {
    setupChatSocket
};
