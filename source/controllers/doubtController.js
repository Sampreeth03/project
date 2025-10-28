// controllers/doubtController.js

const mongoose = require("mongoose");
const path = require('path');
// Import ALL necessary models for Doubts and Notifications
const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Task, Notification } = require("../database"); 
const { getNavLinks } = require("../services/helperService");
const { upload } = require("../middleware/uploadMiddleware"); // Needed for doubt file upload

// =========================================================================
// 1. Doubt Board View (GET /doubt)
// =========================================================================
exports.getDoubtBoard = async (req, res) => {
    const { navData } = require('../config/constants');
    const currentUserId = req.session.user.id;

    try {
        const doubts = await Doubt.find({ visible_to_all: true })
            .populate({
                path: 'replies',
                populate: { path: 'user_id', select: 'name' }
            })
            .populate('user_id', 'name')
            .sort({ timestamp: -1 })
            .lean();

        // Logic to filter private replies (only visible to doubt owner or reply author)
        const formattedDoubts = doubts.map(doubt => {
            const doubtOwnerId = doubt.user_id?._id?.toString();
            
            const visibleReplies = doubt.replies?.filter(reply => {
                const replyAuthorId = reply.user_id?._id?.toString();
                if (reply.visible_to_all !== false) return true; // Public replies
                return currentUserId === doubtOwnerId || currentUserId === replyAuthorId; // Private access
            }).map(reply => ({
                ...reply,
                author: reply.user_id?.name || reply.author || "Anonymous",
                timestamp: new Date(reply.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                isPrivate: reply.visible_to_all === false
            })) || [];

            return {
                ...doubt,
                author: doubt.user_id?.name || "Anonymous",
                file_path: doubt.file_path ? `uploads/${path.basename(doubt.file_path)}` : null,
                replies: visibleReplies,
                timestamp: new Date(doubt.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            };
        });

        res.render("doubt", {
            user: req.session.user, doubts: formattedDoubts, success: req.query.success, 
            error: req.query.error, homeUrl: navData.homeUrl, navLinks: navData.navLinks
        });
    } catch (err) {
        console.error("Error fetching doubts:", err.message);
        res.render("doubt", { user: req.session.user, doubts: [], success: null, error: "Failed to load doubts", homeUrl: navData.homeUrl, navLinks: navData.navLinks });
    }
};

// =========================================================================
// 2. Clear Doubts View (GET /clear)
// =========================================================================
exports.getClearDoubts = async (req, res) => {
    // This route has identical logic to getDoubtBoard for now.
    // It exists because of the original application structure.
    exports.getDoubtBoard(req, res);
};

// =========================================================================
// 3. Post a Doubt (POST /ask)
// =========================================================================
exports.postDoubt = async (req, res) => {
    // NOTE: Multer (upload.single("file-input")) is handled in the router.
    const { message } = req.body;
    // Store a relative path (served under /uploads) instead of an absolute server path
    const filePath = req.file ? path.join('uploads', req.file.filename).replace(/\\/g, '/') : null;
    const userId = req.session.user.id;

    if (req.session.user.role !== "user") {
        return res.json({ success: false, message: "Only users can raise doubts" });
    }

    try {
        const existingDoubt = await Doubt.findOne({ text: message, user_id: userId });
        if (existingDoubt) return res.json({ success: false, message: "Doubt already exists" });

        const doubt = await Doubt.create({
            author: req.session.user.name, text: message, file_path: filePath, 
            timestamp: new Date(), user_id: userId, visible_to_all: true
        });

        await UserMetrics.findOneAndUpdate(
            { user_id: userId },
            { $inc: { inquiriesInitiated: 1 } },
            { upsert: true }
        );

        res.json({ success: true, message: "Doubt posted successfully", doubt: { _id: doubt._id, author: doubt.author, text: doubt.text } });
    } catch (err) {
        console.error("Error posting doubt:", err.message);
        res.json({ success: false, message: "Failed to post doubt" });
    }
};

// =========================================================================
// 4. Post a Reply (POST /reply)
// =========================================================================
exports.postReply = async (req, res) => {
    const { doubtId, text, isPrivate } = req.body;
    const userId = req.session.user.id;

    try {
        const doubt = await Doubt.findById(doubtId);
        if (!doubt) return res.json({ success: false, message: "Doubt not found" });

        // Logic: doubt owner can only reply AFTER another user has replied.
        const isOwner = doubt.user_id && doubt.user_id.toString() === userId;
        if (isOwner) {
            const otherReplyExists = await Reply.exists({ doubt_id: doubtId, user_id: { $ne: doubt.user_id } });
            if (!otherReplyExists) {
                return res.json({ success: false, message: "Wait for another user to reply before you add a follow-up." });
            }
        }

        const reply = await Reply.create({
            doubt_id: doubtId, author: req.session.user.name, text, timestamp: new Date(),
            user_id: userId, visible_to_all: !isPrivate
        });
        await Doubt.findByIdAndUpdate(doubtId, { $push: { replies: reply._id } });

        if (!isOwner) {
            await UserMetrics.findOneAndUpdate(
                { user_id: userId }, { $inc: { solutions_provided: 1 } }, { upsert: true }
            );
        }
        res.json({ success: true, reply: { _id: reply._id, author: reply.author, text: reply.text } });
    } catch (err) {
        console.error("Error posting reply:", err.message);
        res.json({ success: false, message: "Failed to save reply" });
    }
};

// =========================================================================
// 5. Project Notifications View (GET /not) <-- FIXES YOUR ISSUE
// =========================================================================
exports.getProjectNotifications = async (req, res) => {
    const userId = req.session.user.id;
    const navLinks = getNavLinks(req.session.user);
    const { navData } = require('../config/constants');
    
    try {
        // Task-related notifications (assignment, review, completion)
        const taskNotifications = await Notification.find({ user_id: userId, type: { $in: ['task', 'task_assignment', 'join_request_approved', 'task_accepted', 'task_rejected'] } })
            .populate('task_id', 'title')
            .sort({ createdAt: -1 });

        // General project status notifications (creation, completion)
        const projectCreationNotifications = await Notification.find({ user_id: userId, type: { $in: ['project_creation', 'project_completion'] } })
            .sort({ createdAt: -1 });

        // Fetch join requests SENT TO THIS USER'S projects (for approval/rejection)
        const joinRequests = await JoinRequest.find({})
            .populate('user_id', 'name')
            .populate({ path: 'project_id', match: { user_id: userId }, select: 'title' }) // Filter by projects created by THIS user
            .then(results => results.filter(jr => jr.project_id && jr.status === 'pending')); // Filter for pending status

        res.render('proj_notif', {
            user: req.session.user,
            taskNotifications: taskNotifications.map(n => ({ /* map data */ id: n._id, message: n.message, type: n.type, created_at: n.createdAt, task_title: n.task_id?.title })),
            projectCreationNotifications: projectCreationNotifications.map(n => ({ /* map data */ id: n._id, message: n.message, type: n.type, created_at: n.createdAt })),
            joinRequests: joinRequests.map(jr => ({ /* map data */ id: jr._id, user_id: jr.user_id._id, user_name: jr.user_id.name, project_title: jr.project_id.title, requested_at: jr.requested_at, status: jr.status })),
            navLinks,
            homeUrl: navData.homeUrl
        });
    } catch (err) {
        console.error('Error fetching project notifications:', err.message);
        res.status(500).send('Server Error');
    }
};

// JSON provider for client-side React app
exports.getDoubtsJSON = async (req, res) => {
    const currentUserId = req.session.user.id;
    try {
        const doubts = await Doubt.find({ visible_to_all: true })
            .populate({
                path: 'replies',
                populate: { path: 'user_id', select: 'name' }
            })
            .populate('user_id', 'name')
            .sort({ timestamp: -1 })
            .lean();

        const formatted = doubts.map(doubt => {
            const doubtOwnerId = doubt.user_id?._id?.toString();
            const visibleReplies = doubt.replies?.filter(reply => {
                const replyAuthorId = reply.user_id?._id?.toString();
                if (reply.visible_to_all !== false) return true;
                return currentUserId === doubtOwnerId || currentUserId === replyAuthorId;
            }).map(reply => ({
                _id: reply._id,
                author: reply.user_id?.name || reply.author || 'Anonymous',
                text: reply.text,
                timestamp: new Date(reply.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                isPrivate: reply.visible_to_all === false
            })) || [];

            return {
                _id: doubt._id,
                author: doubt.user_id?.name || 'Anonymous',
                text: doubt.text,
                file_path: doubt.file_path ? `uploads/${path.basename(doubt.file_path)}` : null,
                timestamp: new Date(doubt.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                replies: visibleReplies
            };
        });

        return res.json({ success: true, doubts: formatted });
    } catch (err) {
        console.error('Error fetching doubts (api):', err.message);
        return res.json({ success: false, message: 'Failed to fetch doubts' });
    }
};

// =========================================================================
// 6. Project Notifications JSON API (GET /api/notifications)
// =========================================================================
exports.getProjectNotificationsJSON = async (req, res) => {
    const userId = req.session.user.id;
    
    try {
        // Task-related notifications (assignment, review, completion)
        const taskNotifications = await Notification.find({ 
            user_id: userId, 
            type: { $in: ['task', 'task_assignment', 'join_request_approved', 'task_accepted', 'task_rejected'] } 
        })
            .populate('task_id', 'title')
            .sort({ createdAt: -1 })
            .lean();

        // General project status notifications (creation, completion)
        const projectCreationNotifications = await Notification.find({ 
            user_id: userId, 
            type: { $in: ['project_creation', 'project_completion'] } 
        })
            .sort({ createdAt: -1 })
            .lean();

        // Fetch join requests SENT TO THIS USER'S projects (Team Leader - for approval/rejection)
        const joinRequestsRaw = await JoinRequest.find({})
            .populate('user_id', 'name')
            .populate({ path: 'project_id', match: { user_id: userId }, select: 'title user_id' })
            .lean();

        const joinRequests = joinRequestsRaw
            .filter(jr => jr.project_id && jr.status === 'pending')
            .map(jr => ({
                id: jr._id,
                user_id: jr.user_id._id,
                user_name: jr.user_id.name,
                project_name: jr.project_id.title,
                created_at: jr.created_at || jr.requested_at,
                status: jr.status,
                isCreator: true
            }));

        // Fetch join requests MADE BY THIS USER (Member - as applicant to other projects)
        const myJoinRequests = await JoinRequest.find({ user_id: userId, status: 'pending' })
            .populate('project_id', 'title user_id')
            .populate({ path: 'project_id', populate: { path: 'user_id', select: 'name' } })
            .lean();

        const myApplications = myJoinRequests.map(jr => ({
            id: jr._id,
            user_id: jr.project_id.user_id._id,
            user_name: jr.project_id.user_id.name,
            project_name: jr.project_id.title,
            created_at: jr.created_at || jr.requested_at,
            status: jr.status,
            isCreator: false,
            isApplicant: true
        }));

        return res.json({ 
            success: true,
            taskNotifications: taskNotifications.map(n => ({
                id: n._id,
                message: n.message,
                type: n.type,
                created_at: n.createdAt,
                task_title: n.task_id?.title,
                task_id: n.task_id?._id,
                is_read: n.is_read || false
            })),
            projectCreationNotifications: projectCreationNotifications.map(n => ({
                id: n._id,
                message: n.message,
                type: n.type,
                created_at: n.createdAt,
                is_read: n.is_read || false
            })),
            myApplications,  // For "As a Member Inbox"
            joinRequests     // For "Team Leader Inbox"
        });
    } catch (err) {
        console.error('Error fetching project notifications (API):', err.message);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};