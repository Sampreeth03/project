// controllers/projectController.js

const mongoose = require("mongoose");
const { User, UserMetrics, Project, ProjectMember, JoinRequest, Task, Notification } = require("../database"); 
const { getTimeAgo } = require("../services/helperService");
const { topics, topicNormalizationMap } = require("../config/constants");

// =========================================================================
// 1. All Projects View (GET /project - Created & Available) - CONVERTED TO JSON
// =========================================================================
exports.getAllProjects = async (req, res) => {
    // Authentication handled by isAuthenticatedAPI middleware
    const userId = req.session.user.id; 

    try {
        // 1. Fetch Projects Created by User
        const createdProjects = await Project.find({ user_id: userId }).lean();
        
        // 2. Fetch Projects Available to Join (Complex Aggregation)
        const availableProjects = await Project.aggregate([
            { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
            { $lookup: { from: 'joinrequests', localField: '_id', foreignField: 'project_id', as: 'join_requests' } },
            { $addFields: {
                member_count: { $size: '$members' },
                is_member: { $in: [new mongoose.Types.ObjectId(userId), '$members.user_id'] },
                has_pending_request: { $in: [new mongoose.Types.ObjectId(userId), '$join_requests.user_id'] }
            } },
            { $match: {
                user_id: { $ne: new mongoose.Types.ObjectId(userId) },
                is_member: false,
                status: { $ne: 'completed' }
            } }
        ]);
        
        // Return JSON payload with all data (SUCCESS)
        res.json({
            success: true,
            user: { id: userId, role: req.session.user.role },
            createdProjects: createdProjects || [],
            availableProjects: availableProjects || []
        });
    } catch (err) {
        // CRITICAL FIX: Always return JSON on error
        console.error('Error fetching projects (All Projects):', err.message);
        res.status(500).json({ success: false, error: 'Server Error during fetch.' });
    }
};

// =========================================================================
// 2. Joined Projects View (GET /joined-projects) - CONVERTED TO JSON
// =========================================================================
exports.getJoinedProjects = async (req, res) => {
    const userId = req.session.user.id;

    try {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        // 1. Projects where user is an approved member but not the creator
        const projects = await Project.aggregate([
            { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
            { $match: { $expr: { $and: [
                { $in: [userObjectId, '$members.user_id'] },
                { $ne: ['$user_id', userObjectId] }
            ] } } },
            { $addFields: { member_count: { $size: '$members' } } }
        ]);

        // 2. Pending Join Requests sent by this user
        const pendingRequests = await JoinRequest.find({ user_id: userId, status: 'pending' }).populate('project_id').lean();
        
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
        const formattedProjects = projects.map(project => ({ id: project._id, title: project.title, description: project.description, member_count: project.member_count, status: 'approved', requestId: null }));
        const pendingProjects = pendingRequests.filter(req => req.project_id).map(request => ({
            id: request.project_id._id, title: request.project_id.title, description: request.project_id.description,
            member_count: 0, status: 'pending', requestId: request._id.toString()
        }));

        // Return JSON payload (SUCCESS)
        res.json({
            success: true,
            user: { id: userId, role: req.session.user.role },
            projects: [...formattedProjects, ...pendingProjects],
            tasksByProject: tasksByProject,
        });
    } catch (err) {
        // CRITICAL FIX: Always return JSON on error
        console.error('Error fetching joined projects:', err.message);
        res.status(500).json({ success: false, error: 'Server Error during fetch.' });
    }
};

// =========================================================================
// 3. Project Detail View (GET /project/:id) - CONVERTED TO JSON
// =========================================================================
exports.getProjectDetails = async (req, res) => {
    const projectId = req.params.id;
    const userId = req.session.user.id;

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
                hasPendingRequest: { $in: [new mongoose.Types.ObjectId(userId), '$join_requests.user_id'] },
                createdBy: '$creator.name'
            } },
            { $project: { members: 0, join_requests: 0, creator: 0 } }
        ]);

        if (!projects || projects.length === 0) return res.status(404).json({ success: false, error: 'Project not found' });

        const project = projects[0];
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
        res.status(500).json({ success: false, error: 'Server Error during fetch.' });
    }
};

// =========================================================================
// 4. Topic Specific Projects (GET /web-dev, /cyb, etc.) - CONVERTED TO JSON
// =========================================================================
exports.getTopicProjects = async (req, res) => {
    const userId = req.session.user.id;
    
    // NOTE: Requires parsing the topic path from the original URL
    const path = req.originalUrl.split('/api')[1];
    const topicData = topics[path];

    if (!topicData) return res.status(404).json({ success: false, error: 'Topic not found' });
    const { topic } = topicData;

    try {
        const projects = await Project.aggregate([
            { $match: { topic: { $regex: `^${topic}$`, $options: 'i' } } },
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
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// =========================================================================
// 5. Create Project View (GET /e) - CONVERTED TO JSON
// =========================================================================
exports.getCreateProjectView = async (req, res) => {
    // This endpoint now serves the list of created projects needed for the form's dashboard pane.
    const userId = req.session.user.id;
    
    try {
        const createdProjects = await Project.aggregate([
            { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
            { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
            { $addFields: { memberCount: { $size: '$members' } } },
            { $project: { id: '$_id', title: 1, description: 1, capacity: 1, memberCount: 1, topic: 1, deadline: { $dateToString: { format: '%Y-%m-%d', date: '$deadline' } } } }
        ]);

        // Return JSON payload (SUCCESS)
        res.json({ success: true, projects: createdProjects || [] });
    } catch (err) {
        // CRITICAL FIX: Always return JSON on error
        console.error('Error fetching created projects:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load projects' });
    }
};


// =========================================================================
// 6. Create Project API (POST /create-project)
// =========================================================================
exports.createProject = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { title, description, capacity, topic, deadline } = req.body;
    const userId = req.session.user.id;
    
    const userProjectCount = await Project.countDocuments({ user_id: new mongoose.Types.ObjectId(userId) });
    const paidFlag = req.body && (req.body.paid === true || req.body.paid === 'true' || req.body.paid === '1');
    if (userProjectCount >= 3 && !paidFlag) {
        return res.json({ requirePayment: true });
    }

    if (!title || !description || !capacity || !topic || !deadline) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const normalizedTopic = topicNormalizationMap[topic.toLowerCase()] || topic;

    try {
        const project = await Project.create({
            user_id: new mongoose.Types.ObjectId(userId), title, description, capacity,
            topic: normalizedTopic, deadline, status: 'active', created_at: new Date()
        });

        await ProjectMember.create({ project_id: project._id, user_id: new mongoose.Types.ObjectId(userId), joined_at: new Date() });
        await UserMetrics.findOneAndUpdate(
            { user_id: new mongoose.Types.ObjectId(userId) },
            { $inc: { active_projects: 1, total_collaborations: 1, leadership_roles: 1 } },
            { upsert: true }
        );

        await Notification.create({
            user_id: new mongoose.Types.ObjectId(userId),
            message: `Project "${title}" has been successfully created.`,
            type: 'project_creation'
        });

        res.json({ success: true, message: 'Project created successfully', projectId: project._id });
    } catch (err) {
        console.error('Error creating project:', err.message);
        res.status(500).json({ success: false, message: 'Failed to create project: ' + err.message });
    }
};

// =========================================================================
// 7. Join Project (POST /join-project)
// =========================================================================
exports.joinProject = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.body;
    const userId = req.session.user.id;

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

        const existingRequest = await JoinRequest.findOne({ project_id: projectObjectId, user_id: userObjectId });
        if (existingRequest) return res.json({ success: false, message: 'You have already requested to join this project' });

        const memberCount = await ProjectMember.countDocuments({ project_id: projectId });
        if (memberCount >= project.capacity) return res.json({ success: false, message: 'This project is full' });

        await JoinRequest.create({ project_id: projectObjectId, user_id: userObjectId, status: 'pending', requested_at: new Date() });

        await Notification.create({
            user_id: project.user_id,
            message: `User ${req.session.user.name || userId} has requested to join your project "${project.title}"`,
            type: 'join_request'
        });

        res.json({ success: true, message: 'Join request sent successfully' });
    } catch (err) {
        console.error('Error joining project:', err.message);
        res.status(500).json({ success: false, message: 'Failed to join project: ' + err.message });
    }
};

// =========================================================================
// 8. Approve Join Request (POST /approve-join-request)
// =========================================================================
exports.approveJoinRequest = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { requestId } = req.body;
    const userId = req.session.user.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(400).json({ success: false, message: 'Invalid request ID' });

    try {
        const joinRequest = await JoinRequest.findById(requestId).populate('project_id');
        if (!joinRequest) return res.status(404).json({ success: false, message: 'Join request not found' });

        const project = joinRequest.project_id;
        if (project.user_id.toString() !== userId) return res.status(403).json({ success: false, message: 'Only the creator can approve' });
        if (joinRequest.status !== 'pending') return res.json({ success: false, message: 'Request already processed' });

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
        res.status(500).json({ success: false, message: 'Failed to approve join request: ' + err.message });
    }
};

// =========================================================================
// 9. Reject Join Request (POST /reject-join-request)
// =========================================================================
exports.rejectJoinRequest = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { requestId } = req.body;
    const userId = req.session.user.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(400).json({ success: false, message: 'Invalid request ID' });

    try {
        const joinRequest = await JoinRequest.findById(requestId).populate('project_id');
        if (!joinRequest) return res.status(404).json({ success: false, message: 'Join request not found' });

        const project = joinRequest.project_id;
        if (project.user_id.toString() !== userId) return res.status(403).json({ success: false, message: 'Only the creator can reject' });
        if (joinRequest.status !== 'pending') return res.json({ success: false, message: 'Request already processed' });

        joinRequest.status = 'rejected';
        await joinRequest.save();

        res.json({ success: true, message: 'Join request rejected successfully' });
    } catch (err) {
        console.error('Error rejecting join request:', err.message);
        res.status(500).json({ success: false, message: 'Failed to reject join request: ' + err.message });
    }
};

// =========================================================================
// 10. Delete Join Request (POST /delete-join-request)
// =========================================================================
exports.deleteJoinRequest = async (req, res) => {
    const { requestId } = req.body;
    const userId = req.session.user.id;

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
        res.status(500).json({ success: false, error: 'Failed to delete request' });
    }
};

// =========================================================================
// 11. Delete Project (POST /delete-project)
// =========================================================================
exports.deleteProject = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') return res.status(403).json({ success: false, error: 'Unauthorized' });

    const { projectId } = req.body;
    const userId = req.session.user.id;

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

        const updates = members.map(member => ProjectMember.findOneAndUpdate({ user_id: member.user_id }, { $inc: { active_projects: -1, projects_participated: -1, ...(member.user_id.toString() !== userId ? { projects_as_member: -1 } : {}) } }));
        await Promise.all(updates);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting project:', err.message);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

// =========================================================================
// 12. Task Management & Project Status (POST/GET)
// =========================================================================
exports.createTask = async (req, res) => {
    const { projectId, title, description, assignedTo, dueDate } = req.body;
    const userId = req.session.user.id;
    // ... validation and security checks ...
    try {
        if (!projectId || !title || !dueDate) return res.status(400).json({ success: false, message: 'Project ID, title, and due date are required' });
        
        const project = await Project.findById(projectId);
        if (project.user_id.toString() !== userId) return res.status(403).json({ success: false, message: 'Only the project creator can create tasks' });

        // ... member verification ...

        const task = new Task({ project_id: projectId, title, description, assigned_to: assignedTo, due_date: new Date(dueDate), status: 'In Progress' });
        await task.save();
        
        // ... Notification logic ...
        
        res.json({ success: true, task: { id: task._id, title, status: task.status } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

exports.getPendingTasks = async (req, res) => {
    try {
        const projectId = req.params.id;
        const pendingTasks = await Task.countDocuments({ project_id: projectId, status: { $ne: 'Completed' } });
        res.json({ pendingTasks });
    } catch (err) {
        res.json({ pendingTasks: 0 });
    }
};

exports.extendDeadline = async (req, res) => {
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
        res.json({ success: false, message: err.message });
    }
};

exports.submitGithubLink = async (req, res) => {
    const { taskId, githubLink, projectId } = req.body;
    const userId = req.session.user.id;
    try {
        const task = await Task.findOneAndUpdate({ _id: taskId, assigned_to: userId }, { github_link: githubLink, status: 'Review' }, { new: true });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found or not assigned to you' });
        
        const project = await Project.findById(projectId).populate('user_id');
        // ... (Notification logic to project creator) ...
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

exports.reviewSubmission = async (req, res) => {
    // FIX FOR HANGING ISSUE: Ensure reliable response path
    const { taskId, projectId, action, feedback } = req.body;
    const userId = req.session.user.id;

    try {
        const project = await Project.findById(projectId);
        if (!project || project.user_id.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Only the project creator can review submissions' });
        }
        
        const task = await Task.findById(taskId).populate('assigned_to', 'name');
        if (!task || task.status !== 'Review') {
            return res.status(400).json({ success: false, message: 'Task not found or not in review status' });
        }

        const newStatus = action === 'accept' ? 'Completed' : 'Rejected';
        
        const update = {
            feedback,
            status: newStatus,
            github_link: action === 'accept' ? task.github_link : null
        };

        const updatedTask = await Task.findByIdAndUpdate(taskId, update, { new: true });

        if (action === 'accept' && task.assigned_to) {
             await UserMetrics.findOneAndUpdate(
                { user_id: task.assigned_to._id },
                { $inc: { completed_tasks: 1 } },
                { upsert: true }
            );
        }
        
        // ... (Notification logic to assigned user) ...
        
        // FINAL SUCCESS RESPONSE
        return res.json({ 
            success: true, 
            message: `Task successfully marked as ${newStatus}`,
            task: { 
                id: updatedTask._id,
                status: updatedTask.status,
                feedback: updatedTask.feedback
            }
        });

    } catch (err) {
        console.error('Error reviewing submission:', err.message);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

exports.finishProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        await Project.findByIdAndUpdate(projectId, { status: 'completed' });
        await Task.updateMany({ project_id: projectId, status: { $ne: 'Completed' } }, { status: 'Completed' });

        const projectMembers = await ProjectMember.find({ project_id: projectId }).select('user_id');
        
        const memberUpdates = projectMembers.map(async (member) => {
            await UserMetrics.findOneAndUpdate({ user_id: member.user_id }, { $inc: { active_projects: -1 } }, { new: true });
            await Notification.create({ user_id: member.user_id, message: `Project "${project.title}" has been successfully completed.`, type: 'project_completion' });
        });
        await Promise.all(memberUpdates);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};