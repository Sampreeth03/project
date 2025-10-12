const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/page-check';

// Connect to MongoDB 
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

// Define Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, unique: true, trim: true },
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
  thumbsDown: { type: Number, default: 0 }
}, { timestamps: true });

const userMetricsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total_collaborations: { type: Number, default: 0 },
  active_projects: { type: Number, default: 0 },
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
  status: { type: String, default: 'Waiting', enum: ['Waiting', 'Approved', 'Rejected'] },
  resume: { data: Buffer, contentType: String }, // Updated to match the code
  // #srih1: file-system based resume path used by server.js (/apply-job, /view-resume) (ommtsn)
  resume_path: { type: String, default: null },
  // #srih1: when user applied (used in UI); server migration sets this when missing (ommtsn)
  date_applied: { type: Date, default: null },
  active: { type: Boolean, default: true }
}, { 
  timestamps: true,
  indexes: [
      { key: { posted_by: 1 } },
      { key: { user_id: 1 } }
  ]
});

const projectSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  topic: { type: String, required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
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
  enum: ['task', 'project_creation', 'project_completion', 'join_request', 'join_request_approved', 'other', 'task_assignment', 'task_accepted', 'task_rejected', 'job_application', 'job_created', 'job_deleted', 'job_hired', 'job_rejected'], // #srih2 add job_rejected (ommtsn)
      default: 'task'
  },
  is_read: { type: Boolean, default: false }
}, { timestamps: true });

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
  Notification
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