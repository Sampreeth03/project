// controllers/projectController.js

const mongoose = require("mongoose");
const { User, UserMetrics, Project, ProjectMember, JoinRequest, Task, Notification, JoinRequestMessage, Channel } = require("../database"); 
const { getTimeAgo } = require("../services/helperService");
const { topics, topicNormalizationMap } = require("../config/constants");
const { upload } = require("../middleware/uploadMiddleware");

const forwardError = (next, err, publicMessage, statusCode = 500) => {
    err.statusCode = statusCode;
    err.publicMessage = publicMessage;
    return next(err);
};

const isJoinClosedByDeadline = (project) => {
    if (!project?.deadline) return false;
    return new Date(project.deadline).getTime() <= Date.now();
};

// =========================================================================
// 1. All Projects View (GET /project - Created & Available) - CONVERTED TO JSON
// =========================================================================
exports.getAllProjects = async (req, res, next) => {
    // Authentication handled by isAuthenticatedAPI middleware
    const userId = req.user.id;
    const now = new Date();

    try {
        // 1. Fetch Projects Created by User
        const createdProjectsRaw = await Project.find({ user_id: userId }).lean();
        const createdProjects = createdProjectsRaw.map((p) => ({
            ...p,
            isExpiredByDeadline: p.status !== 'completed' && new Date(p.deadline).getTime() <= now.getTime(),
        }));
        
        // 2. Fetch Projects Available to Join (Complex Aggregation)
        const availableProjects = await Project.aggregate([
            { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
            { $lookup: { from: 'joinrequests', localField: '_id', foreignField: 'project_id', as: 'join_requests' } },
            { $addFields: {
                member_count: { $size: '$members' },
                is_member: { $in: [new mongoose.Types.ObjectId(userId), '$members.user_id'] },
                user_join_request: {
                    $filter: {
                        input: '$join_requests',
                        as: 'req',
                        cond: { $eq: ['$$req.user_id', new mongoose.Types.ObjectId(userId)] }
                    }
                }
            } },
            { $addFields: {
                has_pending_request: {
                    $gt: [{
                        $size: {
                            $filter: {
                                input: '$user_join_request',
                                as: 'req',
                                cond: { $eq: ['$$req.status', 'pending'] }
                            }
                        }
                    }, 0]
                },
                request_status: {
                    $cond: {
                        if: { $gt: [{ $size: '$user_join_request' }, 0] },
                        then: { $arrayElemAt: ['$user_join_request.status', 0] },
                        else: null
                    }
                }
            } },
            { $match: {
                user_id: { $ne: new mongoose.Types.ObjectId(userId) },
                is_member: false,
                status: { $ne: 'completed' },
                deadline: { $gt: now }
            } }
        ]);
        
        // Return JSON payload with all data (SUCCESS)
        res.json({
            success: true,
            user: { id: userId, role: req.user.role },
            createdProjects: createdProjects || [],
            availableProjects: availableProjects || []
        });
    } catch (err) {
        // CRITICAL FIX: Always return JSON on error
        console.error('Error fetching projects (All Projects):', err.message);
        return forwardError(next, err, 'Server Error during fetch.');
    }
};

// =========================================================================
// 2. Joined Projects View (GET /joined-projects) - CONVERTED TO JSON
// =========================================================================
exports.getJoinedProjects = async (req, res, next) => {
    const userId = req.user.id;
    const now = new Date();

    try {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        // 1. Projects where user is an approved member but not the creator
        const projects = await Project.aggregate([
            { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
            { $match: { $expr: { $and: [
                { $in: [userObjectId, '$members.user_id'] },
                { $ne: ['$user_id', userObjectId] },
                {
                    $or: [
                        { $eq: ['$status', 'completed'] },
                        { $gt: ['$deadline', now] }
                    ]
                }
            ] } } },
            { $addFields: { member_count: { $size: '$members' } } }
        ]);

        // 2. Pending Join Requests sent by this user
        const pendingRequestsRaw = await JoinRequest.find({ user_id: userId, status: 'pending' }).populate('project_id').lean();
        const pendingRequests = pendingRequestsRaw.filter((reqItem) => {
            const p = reqItem.project_id;
            if (!p) return false;
            if (p.status === 'completed') return false;
            return new Date(p.deadline).getTime() > now.getTime();
        });
        
        // 3. Tasks assigned to this user across these projects
        const projectIds = projects.map(project => project._id);
        const tasks = await Task.find({ project_id: { $in: projectIds }, assigned_to: userId }).lean();

        // Group tasks by project ID
        const tasksByProject = {};
        tasks.forEach(task => {
            const projectId = task.project_id.toString();
            if (!tasksByProject[projectId]) tasksByProject[projectId] = [];
            tasksByProject[projectId].push({ 
                id: task._id, title: task.title, description: task.description, 
                due_date: task.due_date, status: task.status, github_link: task.github_link, feedback: task.feedback
            });
        });

        // Format combined list for React
        const formattedProjects = projects.map(project => ({
            id: project._id,
            title: project.title,
            description: project.description,
            topic: project.topic,
            member_count: project.member_count,
            status: 'approved',
            requestId: null
        }));
        const pendingProjects = pendingRequests
            .filter(req => req.project_id)
            .map(request => ({
                id: request.project_id._id,
                title: request.project_id.title,
                description: request.project_id.description,
                topic: request.project_id.topic,
                member_count: 0,
                status: 'pending',
                requestId: request._id.toString()
            }));

        // Return JSON payload (SUCCESS)
        res.json({
            success: true,
            user: { id: userId, role: req.user.role },
            projects: [...formattedProjects, ...pendingProjects],
            tasksByProject: tasksByProject,
        });
    } catch (err) {
        // CRITICAL FIX: Always return JSON on error
        console.error('Error fetching joined projects:', err.message);
        return forwardError(next, err, 'Server Error during fetch.');
    }
};

// =========================================================================
// 3. Project Detail View (GET /project/:id) - CONVERTED TO JSON
// =========================================================================
exports.getProjectDetails = async (req, res, next) => {
    const projectId = req.params.id;
    const userId = req.user.id;

    try {
        if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ success: false, error: 'Invalid project ID' });

        // Complex aggregation to fetch project, creator, members, and request status
        const projects = await Project.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(projectId) } },
            { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'creator' } },
            { $unwind: '$creator' },
            { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
            { $lookup: { from: 'joinrequests', localField: '_id', foreignField: 'project_id', as: 'join_requests' } },
            { $addFields: { 
                id: '$_id', 
                memberCount: { $size: '$members' }, 
                hasJoined: { $in: [new mongoose.Types.ObjectId(userId), '$members.user_id'] },
                user_join_request: {
                    $filter: {
                        input: '$join_requests',
                        as: 'req',
                        cond: { $eq: ['$$req.user_id', new mongoose.Types.ObjectId(userId)] }
                    }
                },
                createdBy: '$creator.name'
            } },
            { $addFields: {
                hasPendingRequest: {
                    $gt: [{
                        $size: {
                            $filter: {
                                input: '$user_join_request',
                                as: 'req',
                                cond: { $eq: ['$$req.status', 'pending'] }
                            }
                        }
                    }, 0]
                },
                request_status: {
                    $cond: {
                        if: { $gt: [{ $size: '$user_join_request' }, 0] },
                        then: { $arrayElemAt: ['$user_join_request.status', 0] },
                        else: null
                    }
                }
            } },
            { $project: { members: 0, join_requests: 0, creator: 0, user_join_request: 0 } }
        ]);

        if (!projects || projects.length === 0) return res.status(404).json({ success: false, error: 'Project not found' });

        const project = projects[0];

        const isCreator = project.user_id.toString() === userId;
        const isExpiredByDeadline = project.status !== 'completed' && new Date(project.deadline).getTime() <= Date.now();
        if (isExpiredByDeadline && !isCreator) {
            return res.status(403).json({
                success: false,
                error: 'This project has crossed its deadline and is only visible to the creator.',
            });
        }

        const tasks = await Task.find({ project_id: projectId }).populate('assigned_to', 'name');
        const projectMembers = await ProjectMember.find({ project_id: projectId }).populate({ path: 'user_id', select: 'name email' }).lean();
        const userProjects = await Project.find({ user_id: userId }); 

        // Return JSON payload (SUCCESS)
        res.json({
            success: true,
            project, 
            tasks: tasks || [], 
            projectMembers: projectMembers || [],
            userProjects: userProjects || [] 
        });
    } catch (err) {
        // CRITICAL FIX: Always return JSON on error
        console.error('Error fetching project details:', err.message);
        return forwardError(next, err, 'Server Error during fetch.');
    }
};

// =========================================================================
// 4. Topic Specific Projects (GET /web-dev, /cyb, etc.) - CONVERTED TO JSON
// =========================================================================
exports.getTopicProjects = async (req, res, next) => {
    const userId = req.user.id;
    const now = new Date();
    
    // NOTE: Requires parsing the topic path from the original URL
    const path = req.originalUrl.split('/api')[1];
    const topicData = topics[path];

    if (!topicData) return res.status(404).json({ success: false, error: 'Topic not found' });
    const { topic } = topicData;

    try {
        const projects = await Project.aggregate([
            {
                $match: {
                    topic: { $regex: `^${topic}$`, $options: 'i' },
                    status: { $ne: 'completed' },
                    $or: [
                        { user_id: new mongoose.Types.ObjectId(userId) },
                        { deadline: { $gt: now } }
                    ]
                }
            },
            { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'creator' } },
            { $unwind: '$creator' },
            { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
            { $lookup: { from: 'joinrequests', localField: '_id', foreignField: 'project_id', as: 'join_requests' } },
            { $addFields: { 
                memberCount: { $size: '$members' },
                hasJoined: { $in: [new mongoose.Types.ObjectId(userId), '$members.user_id'] },
                hasPendingRequest: { $in: [new mongoose.Types.ObjectId(userId), '$join_requests.user_id'] },
                createdBy: '$creator.name'
            } },
            { $project: { members: 0, join_requests: 0, creator: 0 } }
        ]);

        // Return JSON payload (SUCCESS)
        res.json({ success: true, projects: projects || [], topic });
    } catch (err) {
        // CRITICAL FIX: Always return JSON on error
        console.error(`Error fetching projects for ${topic}:`, err.message);
        return forwardError(next, err, 'Server Error');
    }
};

// =========================================================================
// 5. Create Project View (GET /e) - CONVERTED TO JSON
// =========================================================================
exports.getCreateProjectView = async (req, res, next) => {
    // This endpoint now serves the list of created projects needed for the form's dashboard pane.
    const userId = req.user.id;
    const now = new Date();
    
    try {
        const createdProjects = await Project.aggregate([
            { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
            { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
            { $addFields: { memberCount: { $size: '$members' } } },
            {
                $addFields: {
                    isExpiredByDeadline: {
                        $and: [
                            { $ne: ['$status', 'completed'] },
                            { $lte: ['$deadline', now] }
                        ]
                    }
                }
            },
            {
                $project: {
                    id: '$_id',
                    title: 1,
                    description: 1,
                    capacity: 1,
                    memberCount: 1,
                    topic: 1,
                    status: 1,
                    isExpiredByDeadline: 1,
                    deadline: { $dateToString: { format: '%Y-%m-%d', date: '$deadline' } }
                }
            }
        ]);

        // Return JSON payload (SUCCESS)
        res.json({ success: true, projects: createdProjects || [] });
    } catch (err) {
        // CRITICAL FIX: Always return JSON on error
        console.error('Error fetching created projects:', err.message);
        return forwardError(next, err, 'Failed to load projects');
    }
};


// =========================================================================
// 6. Create Project API (POST /create-project)
// =========================================================================
exports.createProject = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { title, description, capacity, topic, deadline } = req.body;
    const userId = req.user.id;
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const metrics = await UserMetrics.findOne({ user_id: userObjectId }).lean();
    const fallbackCurrentProjects = await Project.countDocuments({ user_id: userObjectId });
    const createdLifetime = Math.max(metrics?.projects_created_lifetime || 0, fallbackCurrentProjects);

    if (createdLifetime >= 6) {
        // Payment required – frontend must go through /api/payment/create-order → /api/payment/verify
        return res.json({ requirePayment: true });
    }

    if (!title || !description || !capacity || !topic || !deadline) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const normalizedTopic = topicNormalizationMap[topic.toLowerCase()] || topic;

    try {
        const project = await Project.create({
            user_id: userObjectId, title, description, capacity,
            topic: normalizedTopic, deadline, status: 'active', created_at: new Date()
        });

        await ProjectMember.create({ project_id: project._id, user_id: userObjectId, joined_at: new Date() });
        
        // Create default channels for the project
        const defaultChannels = ['general', 'announcements'];
        for (const channelName of defaultChannels) {
            await Channel.create({
                project_id: project._id,
                name: channelName,
                created_by: userObjectId,
                created_at: new Date()
            });
        }
        
        await UserMetrics.findOneAndUpdate(
            { user_id: userObjectId },
            { $inc: { active_projects: 1, total_collaborations: 1, leadership_roles: 1, projects_created_lifetime: 1 } },
            { upsert: true }
        );

        await Notification.create({
            user_id: userObjectId,
            message: `Project "${title}" has been successfully created.`,
            type: 'project_creation'
        });

        res.json({ success: true, message: 'Project created successfully', projectId: project._id });
    } catch (err) {
        console.error('Error creating project:', err.message);
        return forwardError(next, err, `Failed to create project: ${err.message}`);
    }
};

// =========================================================================
// 7. Join Project (POST /join-project)
// =========================================================================
exports.joinProject = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    try {
        const projectObjectId = new mongoose.Types.ObjectId(projectId);
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        const isMember = await ProjectMember.findOne({ project_id: projectObjectId, user_id: userObjectId });
        if (isMember) return res.json({ success: false, message: 'You are already a member of this project' });

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        if (project.user_id.toString() === userId) return res.json({ success: false, message: 'You cannot join your own project' });
        if (project.status === 'completed' || isJoinClosedByDeadline(project)) {
            return res.json({ success: false, message: 'This project is no longer open for joining.' });
        }

        const existingRequest = await JoinRequest.findOne({ project_id: projectObjectId, user_id: userObjectId });
        if (existingRequest) return res.json({ success: false, message: 'You have already requested to join this project' });

        const memberCount = await ProjectMember.countDocuments({ project_id: projectId });
        if (memberCount >= project.capacity) return res.json({ success: false, message: 'This project is full' });

        await JoinRequest.create({ project_id: projectObjectId, user_id: userObjectId, status: 'pending', requested_at: new Date() });

        await Notification.create({
            user_id: project.user_id,
            message: `User ${req.user.name || userId} has requested to join your project "${project.title}"`,
            type: 'join_request'
        });

        res.json({ success: true, message: 'Join request sent successfully' });
    } catch (err) {
        console.error('Error joining project:', err.message);
        return forwardError(next, err, `Failed to join project: ${err.message}`);
    }
};

// =========================================================================
// 8. Approve Join Request (POST /approve-join-request)
// =========================================================================
exports.approveJoinRequest = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { requestId } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(400).json({ success: false, message: 'Invalid request ID' });

    try {
        const joinRequest = await JoinRequest.findById(requestId).populate('project_id');
        if (!joinRequest) return res.status(404).json({ success: false, message: 'Join request not found' });

        const project = joinRequest.project_id;
        if (project.user_id.toString() !== userId) return res.status(403).json({ success: false, message: 'Only the creator can approve' });
        if (joinRequest.status !== 'pending') return res.json({ success: false, message: 'Request already processed' });
        if (project.status === 'completed' || isJoinClosedByDeadline(project)) {
            return res.status(400).json({ success: false, message: 'Project deadline is over. New members cannot be approved.' });
        }

        const memberCount = await ProjectMember.countDocuments({ project_id: project._id });
        if (memberCount >= project.capacity) return res.json({ success: false, message: 'Project is already at full capacity' });

        joinRequest.status = 'approved';
        await joinRequest.save();

        await ProjectMember.create({ project_id: project._id, user_id: joinRequest.user_id, joined_at: new Date() });

        await UserMetrics.findOneAndUpdate(
            { user_id: joinRequest.user_id },
            { $inc: { projects_as_member: 1, active_projects: 1, total_collaborations: 1 } },
            { upsert: true }
        );

        await Notification.create({
            user_id: joinRequest.user_id,
            message: `Your request to join project "${project.title}" has been approved`,
            type: 'join_request_approved'
        });

        res.json({ success: true, message: 'Join request approved successfully' });
    } catch (err) {
        console.error('Error approving join request:', err.message);
        return forwardError(next, err, `Failed to approve join request: ${err.message}`);
    }
};

// =========================================================================
// 9. Reject Join Request (POST /reject-join-request)
// =========================================================================
exports.rejectJoinRequest = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { requestId } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(400).json({ success: false, message: 'Invalid request ID' });

    try {
        const joinRequest = await JoinRequest.findById(requestId).populate('project_id');
        if (!joinRequest) return res.status(404).json({ success: false, message: 'Join request not found' });

        const project = joinRequest.project_id;
        if (project.user_id.toString() !== userId) return res.status(403).json({ success: false, message: 'Only the creator can reject' });
        if (joinRequest.status !== 'pending') return res.json({ success: false, message: 'Request already processed' });

        joinRequest.status = 'rejected';
        await joinRequest.save();

        await Notification.create({
            user_id: joinRequest.user_id,
            message: `Your request to join project "${project.title}" has been rejected`,
            type: 'join_request_rejected'
        });

        res.json({ success: true, message: 'Join request rejected successfully' });
    } catch (err) {
        console.error('Error rejecting join request:', err.message);
        return forwardError(next, err, `Failed to reject join request: ${err.message}`);
    }
};

// =========================================================================
// 10. Delete Join Request (POST /delete-join-request)
// =========================================================================
exports.deleteJoinRequest = async (req, res, next) => {
    const { requestId } = req.body;
    const userId = req.user.id;

    try {
        const request = await JoinRequest.findOne({ _id: requestId }).populate('project_id');
        if (!request) return res.status(404).json({ success: false, error: 'Request not found' });

        const isCreator = request.project_id && request.project_id.user_id.toString() === userId;
        const isRequester = request.user_id.toString() === userId;

        if (!isCreator && !isRequester) return res.status(403).json({ success: false, error: 'Unauthorized to delete this request' });

        await JoinRequest.deleteOne({ _id: requestId });
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting join request:', err.message);
        return forwardError(next, err, 'Failed to delete request');
    }
};

// ========= Project Invite (Owner -> Friend) =========
exports.inviteFriendToProject = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { projectId, toUserId } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(toUserId)) return res.status(400).json({ success: false, message: 'Invalid ids' });

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        if (String(project.user_id) !== userId) return res.status(403).json({ success: false, message: 'Only creator can invite' });

        const ProjectInvite = require('../database').ProjectInvite;
        const existing = await ProjectInvite.findOne({ project_id: projectId, to_user: toUserId });
        if (existing && existing.status === 'pending') return res.json({ success: false, message: 'Invite already pending' });

        await ProjectInvite.create({ project_id: projectId, from_user: userId, to_user: toUserId });
        await require('../database').Notification.create({ user_id: toUserId, message: `${req.user.name} invited you to join project "${project.title}"`, type: 'join_request' });
        res.json({ success: true, message: 'Invite sent' });
    } catch (err) {
        console.error('Invite friend error:', err.message);
        return forwardError(next, err, 'Server error');
    }
};

exports.getProjectInvites = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
        const ProjectInvite = require('../database').ProjectInvite;
        const invites = await ProjectInvite.find({ to_user: req.user.id }).populate('project_id').populate('from_user', 'name').lean();
        res.json({ invites });
    } catch (err) {
        console.error('Get project invites error:', err.message);
        return forwardError(next, err, 'Server error');
    }
};

exports.respondProjectInvite = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { inviteId, action } = req.body;
    if (!['accept','reject'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });

    try {
        const ProjectInvite = require('../database').ProjectInvite;
        const invite = await ProjectInvite.findById(inviteId).populate('project_id');
        if (!invite) return res.status(404).json({ success: false, message: 'Invite not found' });
        if (String(invite.to_user) !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        invite.status = action === 'accept' ? 'accepted' : 'rejected';
        await invite.save();

        if (action === 'accept') {
            if (invite.project_id.status === 'completed' || isJoinClosedByDeadline(invite.project_id)) {
                return res.json({ success: false, message: 'Project deadline is over. Invite can no longer be accepted.' });
            }
            // Add as project member if capacity allows
            const memberCount = await ProjectMember.countDocuments({ project_id: invite.project_id._id });
            if (memberCount >= invite.project_id.capacity) {
                return res.json({ success: false, message: 'Project is full' });
            }
            await ProjectMember.create({ project_id: invite.project_id._id, user_id: req.user.id, joined_at: new Date() });
            await require('../database').Notification.create({ user_id: invite.from_user, message: `${req.user.name} accepted your project invite for "${invite.project_id.title}"`, type: 'join_request_approved' });
            await require('../database').Notification.create({ user_id: req.user.id, message: `You joined project "${invite.project_id.title}"`, type: 'project_creation' });
        } else {
            await require('../database').Notification.create({ user_id: invite.from_user, message: `${req.user.name} rejected your project invite for "${invite.project_id.title}"`, type: 'other' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Respond project invite error:', err.message);
        return forwardError(next, err, 'Server error');
    }
};

// ========= Project Invite (Owner -> Friend) =========
exports.inviteFriendToProject = async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { projectId, toUserId } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(toUserId)) return res.status(400).json({ success: false, message: 'Invalid ids' });

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        if (String(project.user_id) !== userId) return res.status(403).json({ success: false, message: 'Only creator can invite' });

        const ProjectInvite = require('../database').ProjectInvite;
        const existing = await ProjectInvite.findOne({ project_id: projectId, to_user: toUserId });
        if (existing && existing.status === 'pending') return res.json({ success: false, message: 'Invite already pending' });

        await ProjectInvite.create({ project_id: projectId, from_user: userId, to_user: toUserId });
        await require('../database').Notification.create({ user_id: toUserId, message: `${req.user.name} invited you to join project "${project.title}"`, type: 'join_request' });
        res.json({ success: true, message: 'Invite sent' });
    } catch (err) {
        console.error('Invite friend error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getProjectInvites = async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
        const ProjectInvite = require('../database').ProjectInvite;
        const invites = await ProjectInvite.find({ to_user: req.user.id }).populate('project_id').populate('from_user', 'name').lean();
        res.json({ invites });
    } catch (err) {
        console.error('Get project invites error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.respondProjectInvite = async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { inviteId, action } = req.body;
    if (!['accept','reject'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });

    try {
        const ProjectInvite = require('../database').ProjectInvite;
        const invite = await ProjectInvite.findById(inviteId).populate('project_id');
        if (!invite) return res.status(404).json({ success: false, message: 'Invite not found' });
        if (String(invite.to_user) !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        invite.status = action === 'accept' ? 'accepted' : 'rejected';
        await invite.save();

        if (action === 'accept') {
            // Add as project member if capacity allows
            const memberCount = await ProjectMember.countDocuments({ project_id: invite.project_id._id });
            if (memberCount >= invite.project_id.capacity) {
                return res.json({ success: false, message: 'Project is full' });
            }
            await ProjectMember.create({ project_id: invite.project_id._id, user_id: req.user.id, joined_at: new Date() });
            await require('../database').Notification.create({ user_id: invite.from_user, message: `${req.user.name} accepted your project invite for "${invite.project_id.title}"`, type: 'join_request_approved' });
            await require('../database').Notification.create({ user_id: req.user.id, message: `You joined project "${invite.project_id.title}"`, type: 'project_creation' });
        } else {
            await require('../database').Notification.create({ user_id: invite.from_user, message: `${req.user.name} rejected your project invite for "${invite.project_id.title}"`, type: 'other' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Respond project invite error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// =========================================================================
// 11. Delete Project (POST /delete-project)
// =========================================================================
exports.deleteProject = async (req, res, next) => {
    if (!req.user || req.user.role !== 'user') return res.status(403).json({ success: false, error: 'Unauthorized' });

    const { projectId } = req.body;
    const userId = req.user.id;

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        if (project.user_id.toString() !== userId) return res.status(403).json({ success: false, error: 'Unauthorized' });

        const members = await ProjectMember.find({ project_id: projectId });

        await Promise.all([
            Project.deleteOne({ _id: projectId }),
            ProjectMember.deleteMany({ project_id: projectId }),
            Task.deleteMany({ project_id: projectId }),
            JoinRequest.deleteMany({ project_id: projectId })
        ]);

        const updates = members.map((member) => UserMetrics.findOneAndUpdate(
            { user_id: member.user_id },
            {
                $inc: {
                    active_projects: -1,
                    ...(member.user_id.toString() !== userId ? { projects_as_member: -1 } : {})
                }
            },
            { upsert: true }
        ));
        await Promise.all(updates);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting project:', err.message);
        return forwardError(next, err, 'Database error');
    }
};

// =========================================================================
// 12. Task Management & Project Status (POST/GET)
// =========================================================================
exports.createTask = async (req, res, next) => {
    const { projectId, title, description, assignedTo, dueDate } = req.body;
    const userId = req.user.id;
    // ... validation and security checks ...
    try {
        if (!projectId || !title || !dueDate) return res.status(400).json({ success: false, message: 'Project ID, title, and due date are required' });

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
            return res.status(400).json({ success: false, message: 'Invalid due date format. Use YYYY-MM-DD' });
        }

        const parsedDueDate = new Date(`${dueDate}T00:00:00`);
        if (Number.isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid due date' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDueDate.getTime() <= today.getTime()) {
            return res.status(400).json({ success: false, message: 'Due date must be after today' });
        }
        
        const project = await Project.findById(projectId);
        if (project.user_id.toString() !== userId) return res.status(403).json({ success: false, message: 'Only the project creator can create tasks' });

        // ... member verification ...

        const task = new Task({ project_id: projectId, title, description, assigned_to: assignedTo, due_date: parsedDueDate, status: 'In Progress' });
        await task.save();
        
        // Create notification for the assigned user
        await Notification.create({
            user_id: assignedTo,
            message: `New task "${title}" has been assigned to you in project "${project.title}"`,
            type: 'task',
            task_id: task._id,
            task_title: title
        });
        
        res.json({ success: true, task: { id: task._id, title, status: task.status } });
    } catch (err) {
        return forwardError(next, err, `Server error: ${err.message}`);
    }
};

const MIN_TASKS_FOR_COMPLETION = 3;
const MIN_ASSIGNEES_FOR_COMPLETION = 2;

const toDateLabel = (d) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const getFinishEligibility = (project, tasks) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
    const nonCompletedTasks = totalTasks - completedTasks;
    const uniqueAssignees = new Set(
        tasks
            .filter((t) => t.assigned_to)
            .map((t) => String(t.assigned_to))
    );
    const assignedMemberCount = uniqueAssignees.size;

    const startDate = project.createdAt || project.created_at;
    const deadlineDate = project.deadline;
    let halfwayDate = null;
    let isHalfwayReached = true;

    if (startDate && deadlineDate) {
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(deadlineDate).getTime();
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
            halfwayDate = new Date(startMs + (endMs - startMs) / 2);
            isHalfwayReached = Date.now() >= halfwayDate.getTime();
        } else {
            isHalfwayReached = false;
        }
    } else {
        isHalfwayReached = false;
    }

    const reasons = [];

    if (totalTasks === 0) {
        reasons.push('Add tasks before finishing the project.');
    }
    if (totalTasks < MIN_TASKS_FOR_COMPLETION) {
        reasons.push(`Project needs at least ${MIN_TASKS_FOR_COMPLETION} tasks to be completed.`);
    }
    if (completedTasks < MIN_TASKS_FOR_COMPLETION) {
        reasons.push(`At least ${MIN_TASKS_FOR_COMPLETION} completed tasks are required before finishing.`);
    }
    if (nonCompletedTasks > 0) {
        reasons.push('All tasks must be in Completed status before finishing the project.');
    }
    if (assignedMemberCount < MIN_ASSIGNEES_FOR_COMPLETION) {
        reasons.push(`At least ${MIN_ASSIGNEES_FOR_COMPLETION} different members must be assigned tasks.`);
    }
    if (!isHalfwayReached) {
        if (halfwayDate) {
            reasons.push(`Project can be finished only after halfway point: ${toDateLabel(halfwayDate)}.`);
        } else {
            reasons.push('Project timeline is invalid for completion check. Please verify created date and deadline.');
        }
    }

    return {
        eligible: reasons.length === 0,
        rules: {
            minTasksRequired: MIN_TASKS_FOR_COMPLETION,
            minAssigneesRequired: MIN_ASSIGNEES_FOR_COMPLETION,
            totalTasks,
            completedTasks,
            nonCompletedTasks,
            assignedMemberCount,
            isHalfwayReached,
            halfwayDate,
            deadline: deadlineDate || null,
        },
        reasons,
    };
};

exports.getPendingTasks = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findById(projectId).select('createdAt deadline').lean();
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const tasks = await Task.find({ project_id: projectId }).select('status assigned_to').lean();
        const eligibility = getFinishEligibility(project, tasks);

        // Exclude both Completed and Rejected tasks from pending count
        const pendingTasks = tasks.filter((t) => t.status !== 'Completed').length;
        res.json({
            success: true,
            pendingTasks,
            finishEligibility: eligibility,
        });
    } catch (err) {
        return forwardError(next, err, 'Server error');
    }
};

exports.extendDeadline = async (req, res, next) => {
    try {
        const { taskTitle, projectId, newDueDate } = req.body;
        const task = await Task.findOne({ title: taskTitle, project_id: projectId });
        if (task) {
            task.due_date = new Date(newDueDate);
            await task.save();
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Task not found' });
        }
    } catch (err) {
        return forwardError(next, err, err.message);
    }
};

exports.submitGithubLink = async (req, res, next) => {
    const { taskId, githubLink, projectId } = req.body;
    const userId = req.user.id;
    try {
        const task = await Task.findOneAndUpdate({ _id: taskId, assigned_to: userId }, { github_link: githubLink, status: 'Review' }, { new: true });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found or not assigned to you' });
        
        const project = await Project.findById(projectId).populate('user_id');
        // ... (Notification logic to project creator) ...
        res.json({ success: true });
    } catch (err) {
        return forwardError(next, err, `Server error: ${err.message}`);
    }
};

exports.reviewSubmission = async (req, res, next) => {
    // FIX FOR HANGING ISSUE: Ensure reliable response path
    const { taskId, projectId, action, feedback } = req.body;
    const userId = req.user.id;

    try {
        const project = await Project.findById(projectId);
        if (!project || project.user_id.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Only the project creator can review submissions' });
        }
        
        const task = await Task.findById(taskId).populate('assigned_to', 'name');
        if (!task || task.status !== 'Review') {
            return res.status(400).json({ success: false, message: 'Task not found or not in review status' });
        }

        const newStatus = action === 'accept' ? 'Completed' : 'In Progress';
        
        const update = {
            feedback,
            status: newStatus,
            github_link: action === 'reject' ? null : task.github_link
        };

        const updatedTask = await Task.findByIdAndUpdate(taskId, update, { new: true });

        if (action === 'accept' && task.assigned_to) {
             await UserMetrics.findOneAndUpdate(
                { user_id: task.assigned_to._id },
                { $inc: { completed_tasks: 1 } },
                { upsert: true }
            );
            
            // Notification for accepted task
            await Notification.create({
                user_id: task.assigned_to._id,
                message: `Your task "${task.title}" has been accepted! Feedback: ${feedback}`,
                type: 'task_accepted',
                task_id: taskId
            });
        } else if (action === 'reject' && task.assigned_to) {
            // Notification for rejected task - user can resubmit
            await Notification.create({
                user_id: task.assigned_to._id,
                message: `Your task "${task.title}" needs revision. Feedback: ${feedback}. Please update and resubmit.`,
                type: 'task_rejected',
                task_id: taskId
            });
        }
        
        // FINAL SUCCESS RESPONSE
        return res.json({ 
            success: true, 
            message: action === 'accept' ? 'Task accepted successfully' : 'Task sent back for revision',
            task: { 
                id: updatedTask._id,
                status: updatedTask.status,
                feedback: updatedTask.feedback
            }
        });

    } catch (err) {
        console.error('Error reviewing submission:', err.message);
        return forwardError(next, err, `Server error: ${err.message}`);
    }
};

exports.finishProject = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        
        // Check if user is the project creator
        if (project.user_id.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Only project creator can finish the project' });
        }
        
        // Check if project is already completed
        if (project.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Project is already completed' });
        }

        const tasks = await Task.find({ project_id: projectId }).select('status assigned_to').lean();
        const eligibility = getFinishEligibility(project, tasks);
        if (!eligibility.eligible) {
            return res.status(400).json({
                success: false,
                message: eligibility.reasons[0] || 'Project is not eligible for completion yet.',
                finishEligibility: eligibility,
            });
        }

        // Update project status and set completion timestamp
        await Project.findByIdAndUpdate(projectId, { 
            status: 'completed',
            completedAt: new Date()
        });

        // Get all project members and update their metrics
        const projectMembers = await ProjectMember.find({ project_id: projectId }).select('user_id');
        
        const memberUpdates = projectMembers.map(async (member) => {
            await UserMetrics.findOneAndUpdate(
                { user_id: member.user_id }, 
                { $inc: { active_projects: -1 } }, 
                { new: true, upsert: true }
            );
            
            await Notification.create({ 
                user_id: member.user_id, 
                message: `Project "${project.title}" has been successfully completed.`, 
                type: 'project_completion' 
            });
        });
        
        await Promise.all(memberUpdates);

        console.log(`[Finish Project] Project ${projectId} completed by user ${userId}`);
        res.json({ success: true, message: 'Project completed successfully' });
    } catch (err) {
        console.error('[Finish Project] Error:', err);
        return forwardError(next, err, err.message);
    }
};

// =========================================================================
// Get Task Project (GET /get-task-project/:taskId)
// =========================================================================
exports.getTaskProject = async (req, res, next) => {
    try {
        const taskId = req.params.taskId;
        const task = await Task.findById(taskId).select('project_id');
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        return res.json({ success: true, projectId: task.project_id });
    } catch (err) {
        console.error('Error getting task project:', err.message);
        return forwardError(next, err, 'Server error');
    }
};

// =========================================================================
// Get Join Request Messages (GET /join-request-messages/:requestId)
// =========================================================================
exports.getJoinRequestMessages = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { requestId } = req.params;
    const userId = req.user.id;

    try {
        const joinRequest = await JoinRequest.findById(requestId).populate('project_id').populate('user_id', 'name');
        if (!joinRequest) return res.status(404).json({ success: false, message: 'Join request not found' });

        // Verify user is either the applicant or the project creator
        const isApplicant = joinRequest.user_id._id.toString() === userId;
        const isCreator = joinRequest.project_id.user_id.toString() === userId;
        
        if (!isApplicant && !isCreator) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const messages = await JoinRequestMessage.find({ join_request_id: requestId })
            .populate('sender_id', 'name')
            .sort({ created_at: 1 })
            .lean();

        return res.json({ 
            success: true, 
            messages,
            joinRequest: {
                id: joinRequest._id,
                applicantName: joinRequest.user_id.name,
                projectName: joinRequest.project_id.title,
                status: joinRequest.status
            }
        });
    } catch (err) {
        console.error('Error fetching messages:', err.message);
        return forwardError(next, err, 'Server error');
    }
};

// =========================================================================
// Send Join Request Message (POST /send-join-request-message)
// =========================================================================
exports.sendJoinRequestMessage = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { requestId, message } = req.body;
    const userId = req.user.id;

    try {
        const joinRequest = await JoinRequest.findById(requestId).populate('project_id');
        if (!joinRequest) return res.status(404).json({ success: false, message: 'Join request not found' });

        // Determine sender and receiver
        const isApplicant = joinRequest.user_id.toString() === userId;
        const receiverId = isApplicant ? joinRequest.project_id.user_id : joinRequest.user_id;

        const newMessage = await JoinRequestMessage.create({
            join_request_id: requestId,
            sender_id: userId,
            receiver_id: receiverId,
            message,
            created_at: new Date()
        });

        const populatedMessage = await JoinRequestMessage.findById(newMessage._id).populate('sender_id', 'name');

        return res.json({ success: true, message: populatedMessage });
    } catch (err) {
        console.error('Error sending message:', err.message);
        return forwardError(next, err, 'Server error');
    }
};

// =========================================================================
// Upload Join Request File (POST /upload-join-request-file)
// =========================================================================
exports.uploadJoinRequestFile = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('File upload error:', err);
            return res.status(400).json({ success: false, message: 'File upload failed' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { requestId } = req.body;
        const userId = req.user.id;

        try {
            const joinRequest = await JoinRequest.findById(requestId).populate('project_id');
            if (!joinRequest) return res.status(404).json({ success: false, message: 'Join request not found' });

            const isApplicant = joinRequest.user_id.toString() === userId;
            const receiverId = isApplicant ? joinRequest.project_id.user_id : joinRequest.user_id;

            const newMessage = await JoinRequestMessage.create({
                join_request_id: requestId,
                sender_id: userId,
                receiver_id: receiverId,
                file_url: `/uploads/${req.file.filename}`,
                file_name: req.file.originalname,
                message: `Shared file: ${req.file.originalname}`,
                created_at: new Date()
            });

            const populatedMessage = await JoinRequestMessage.findById(newMessage._id).populate('sender_id', 'name');

            return res.json({ success: true, message: populatedMessage });
        } catch (error) {
            console.error('Error saving file message:', error.message);
            return forwardError(next, error, 'Server error');
        }
    });
};