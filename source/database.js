const mongoose = require('mongoose');

// Define Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, unique: true, trim: true, lowercase: true },
  password: String,
  role: { type: String, default: 'user' },
  verified: { type: Boolean, default: false },
  verificationFile: String,
  // profile fields
  about: { type: String, default: '' },
  profileImageUrl: { type: String, default: null },
  resumeUrl: { type: String, default: null },
  skills: { type: [String], default: [] },
  interests: { type: [String], default: [] },
  questionsAnswered: { type: Number, default: 0 },
  thumbsUp: { type: Number, default: 0 },
  thumbsDown: { type: Number, default: 0 },
  // Onboarding tracking
  onboardingCompleted: { type: Boolean, default: false },
  // Recruiter-specific fields
  companyName: { type: String, default: '' },
  companyDocumentUrl: { type: String, default: null },
  emailVerified: { type: Boolean, default: false },
  // Recruiter verification by platform administrator
  recruiterVerified: { type: Boolean, default: false },
  recruiterVerificationMessage: { type: String, default: '' },
  assignedPlatformAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdministrator', default: null },
  // Password reset
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  // Authenticator-based 2FA (enabled only for newly created student accounts)
  authenticator2faEnabled: { type: Boolean, default: false },
  authenticator2faSecret: { type: String, default: null },
  authenticator2faRequired: { type: Boolean, default: false }
}, { timestamps: true });

// Pending Recruiter Signup Schema (for OTP verification flow)
const pendingRecruiterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }, // Already hashed
  companyName: { type: String, default: '' },
  companyDocumentUrl: { type: String, default: null },
  otpVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour
});

// Pending Student Signup Schema (for OTP verification flow)
const pendingStudentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }, // Already hashed
  about: { type: String, default: '' },
  skills: { type: [String], default: [] },
  interests: { type: [String], default: [] },
  profileImageUrl: { type: String, default: null },
  resumeUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour
});

const userMetricsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total_collaborations: { type: Number, default: 0 },
  active_projects: { type: Number, default: 0 },
  projects_created_lifetime: { type: Number, default: 0 },
  project_deadline_extensions_paid: { type: Number, default: 0 },
  completed_tasks: { type: Number, default: 0 },
  leadership_roles: { type: Number, default: 0 },
  inquiriesInitiated: { type: Number, default: 0 },
  job_applications: { type: Number, default: 0 },
  projects_as_member: { type: Number, default: 0 },
  solutions_provided: { type: Number, default: 0 }
});



// In database.js
const doubtSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  file_path: String,
  timestamp: Date,
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
  visible_to_all: { type: Boolean, default: false },
  author: { type: String, required: true } // Add this
}, { timestamps: true });

const replySchema = new mongoose.Schema({
  doubt_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt' },
  author: { type: String, required: true },
  visible_to_all: {
    type: Boolean,
    default: false
},
  text: String,
  timestamp: Date,

  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Add user_id

  
}, { timestamps: true });

const jobApplicationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job_title: { type: String, required: true },
  company_name: { type: String, required: true },
  salary_range: { type: String, required: true },
  description: { type: String, required: true },
  skills: { type: String, required: true },
  custom_questions: { type: Array, default: [] },
  custom_answers: { type: Object, default: {} },
  status: { type: String, default: 'Waiting', enum: ['Waiting', 'Pending', 'Approved', 'Rejected'] },
  resume: { data: Buffer, contentType: String }, // Updated to match the code
  // #srih1: file-system based resume path used by server.js (/apply-job, /view-resume) (ommtsn)
  resume_path: { type: String, default: null },
  // #srih1: when user applied (used in UI); server migration sets this when missing (ommtsn)
  date_applied: { type: Date, default: null },
  active: { type: Boolean, default: true }
}, { 
  timestamps: true
});

const projectSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  topic: { type: String, required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  completedAt: { type: Date }
}, { timestamps: true });



const joinRequestSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requested_at: { type: Date, default: Date.now }
});

const projectMemberSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joined_at: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: { type: String },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  due_date: { type: Date, required: true },
  status: { type: String, enum: ['In Progress', 'Review', 'Completed', 'Rejected'], default: 'In Progress' },
  github_link: { type: String },
  feedback: { type: String }
});

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  type: {
      type: String,
     enum: ['task', 'project_creation', 'project_completion', 'join_request', 'join_request_approved', 'join_request_rejected', 'other', 'task_assignment', 'task_accepted', 'task_rejected', 'job_application', 'job_created', 'job_deleted', 'job_hired', 'job_rejected', 'job_shortlisted', 'job_activated', 'job_deactivated'],
      default: 'task'
  },
  is_read: { type: Boolean, default: false }
}, { timestamps: true });

// Platform Administrator schema - for platform-level admin accounts
const platformAdministratorSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true },
  passkey: { type: String, required: true },
  adminId: { type: String, required: true, unique: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

// Indexes tuned to current query patterns (filters + sort order)
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ assignedPlatformAdminId: 1 });

pendingRecruiterSchema.index({ email: 1 });
pendingStudentSchema.index({ email: 1 });

userMetricsSchema.index({ user_id: 1 }, { unique: true });

doubtSchema.index({ visible_to_all: 1, timestamp: -1 });
doubtSchema.index({ user_id: 1, timestamp: -1 });

replySchema.index({ doubt_id: 1, timestamp: 1 });
replySchema.index({ user_id: 1 });

jobApplicationSchema.index({ posted_by: 1, user_id: 1, status: 1, createdAt: -1 });
jobApplicationSchema.index({ user_id: 1, status: 1, date_applied: -1 });
jobApplicationSchema.index({ active: 1, status: 1 });

projectSchema.index({ user_id: 1, status: 1, deadline: 1 });
projectSchema.index({ topic: 1, status: 1 });

joinRequestSchema.index({ project_id: 1, status: 1, requested_at: -1 });
joinRequestSchema.index({ user_id: 1, status: 1, requested_at: -1 });

projectMemberSchema.index({ project_id: 1, user_id: 1 });
projectMemberSchema.index({ user_id: 1, project_id: 1 });

taskSchema.index({ project_id: 1, status: 1, due_date: 1 });
taskSchema.index({ assigned_to: 1, status: 1, due_date: 1 });

notificationSchema.index({ user_id: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, type: 1, createdAt: -1 });

platformAdministratorSchema.index({ createdAt: -1 });

// Create Models
const User = mongoose.model('User', userSchema);
const UserMetrics = mongoose.model('UserMetrics', userMetricsSchema);
const Doubt = mongoose.model('Doubt', doubtSchema);
const Reply = mongoose.model('Reply', replySchema);
const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);
const Project = mongoose.model('Project', projectSchema);
const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);
const JoinRequest = mongoose.model('JoinRequest', joinRequestSchema);
const Task = mongoose.model('Task', taskSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const PlatformAdministrator = mongoose.model('PlatformAdministrator', platformAdministratorSchema);

// Friend Request Schema - simple one-way request model
const friendRequestSchema = new mongoose.Schema({
  from_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

friendRequestSchema.index({ to_user: 1, status: 1, created_at: -1 });
friendRequestSchema.index({ from_user: 1, to_user: 1, status: 1 });

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

// Project Invite Schema - owner invites a friend to join their project
const projectInviteSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  from_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

projectInviteSchema.index({ to_user: 1, status: 1, created_at: -1 });
projectInviteSchema.index({ project_id: 1, to_user: 1, status: 1 });

const ProjectInvite = mongoose.model('ProjectInvite', projectInviteSchema);

const PendingRecruiter = mongoose.model('PendingRecruiter', pendingRecruiterSchema);
const PendingStudent = mongoose.model('PendingStudent', pendingStudentSchema);

// Join Request Message Schema (for chat between applicant and project creator)
const joinRequestMessageSchema = new mongoose.Schema({
  join_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JoinRequest', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String },
  file_url: { type: String },
  file_name: { type: String },
  created_at: { type: Date, default: Date.now }
});

joinRequestMessageSchema.index({ join_request_id: 1, created_at: 1 });
joinRequestMessageSchema.index({ receiver_id: 1, created_at: -1 });

const JoinRequestMessage = mongoose.model('JoinRequestMessage', joinRequestMessageSchema);

// Channel Schema - for project chat channels
const channelSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true }, // e.g., 'general', 'announcements', 'random'
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now }
});

// Message Schema - for channel messages
const messageSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  file_url: { type: String },
  file_name: { type: String },
  file_type: { type: String },
  is_pinned: { type: Boolean, default: false },
  pinned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pinned_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});

// Direct Message Schema - for 1-on-1 DMs within a project
const directMessageSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  file_url: { type: String },
  file_name: { type: String },
  file_type: { type: String },
  created_at: { type: Date, default: Date.now }
});

// User Read Status Schema - tracks last seen message per user per channel
const userReadStatusSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  other_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For DMs
  last_seen_at: { type: Date, default: Date.now },
  is_dm: { type: Boolean, default: false }
});

channelSchema.index({ project_id: 1, name: 1 });
channelSchema.index({ project_id: 1, created_at: 1 });

messageSchema.index({ channel_id: 1, created_at: 1 });
messageSchema.index({ project_id: 1, created_at: -1 });
messageSchema.index({ sender_id: 1, created_at: -1 });

directMessageSchema.index({ project_id: 1, sender_id: 1, receiver_id: 1, created_at: 1 });
directMessageSchema.index({ project_id: 1, receiver_id: 1, sender_id: 1, created_at: 1 });

userReadStatusSchema.index({ user_id: 1, is_dm: 1, channel_id: 1 });
userReadStatusSchema.index({ user_id: 1, project_id: 1, is_dm: 1, other_user_id: 1 });

const Channel = mongoose.model('Channel', channelSchema);
const Message = mongoose.model('Message', messageSchema);
const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);
const UserReadStatus = mongoose.model('UserReadStatus', userReadStatusSchema);

// Export Models
module.exports = {
  User,
  UserMetrics,
  Doubt,
  Reply,
  JobApplication,
  Project,
  ProjectMember,
  JoinRequest,
  Task,
  Notification,
  JoinRequestMessage,
  FriendRequest,
  ProjectInvite,
  PendingRecruiter,
  PendingStudent,
  Channel,
  Message,
  DirectMessage,
  UserReadStatus,
  PlatformAdministrator
};

// ---------------------------
// JobApplication Notifications
// ---------------------------
// Notify recruiter when an applicant applies with a resume.
// Covers both create/save and findOneAndUpdate flows.

// Helper: create notification
async function createJobApplicationNotification(doc) {
  try {
    if (!doc || !doc.posted_by) return;
    // Only notify if resume buffer exists
    if (!doc.resume || !doc.resume.data) return;

    // Try to fetch applicant name (best-effort)
    let applicantName = 'a candidate';
    if (doc.user_id) {
      const applicant = await User.findById(doc.user_id).select('name').lean();
      if (applicant && applicant.name) applicantName = applicant.name;
    }

    const jobTitle = doc.job_title || 'a job';
    await Notification.create({
      user_id: doc.posted_by, // recruiter
      type: 'job_application',
      message: `New application for ${jobTitle} from ${applicantName}.`
    });
  } catch (err) {
    // Silent catch: don't block main flow on notification error
    console.error('Notification error (job application):', err.message);
  }
}

// post-save: fires on create/save
jobApplicationSchema.post('save', async function (doc, next) {
  try {
    // When creating a new application with resume
    if (doc && doc.resume && doc.resume.data) {
      await createJobApplicationNotification(doc);
    }
    next();
  } catch (e) {
    next();
  }
});

// post findOneAndUpdate: handle resume added via updates
jobApplicationSchema.post('findOneAndUpdate', async function (res, next) {
  try {
    // res is the updated document when 'new: true' is used; otherwise null.
    // To be resilient, re-fetch the doc by _id from the query.
    let doc = res;
    if (!doc) {
      const q = this.getQuery();
      if (q && q._id) {
        doc = await JobApplication.findById(q._id).lean(false);
      }
    }
    if (doc && doc.resume && doc.resume.data) {
      // Determine if resume was newly added in this update
      const prev = await JobApplication.findById(doc._id).select('resume').lean();
      // If previous doc had no resume data, treat as newly added
      const hadPrevResume = prev && prev.resume && prev.resume.data;
      if (!hadPrevResume) {
        await createJobApplicationNotification(doc);
      }
    }
    next();
  } catch (e) {
    next();
  }
});