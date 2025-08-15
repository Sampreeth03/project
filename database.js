const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/page-check';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

// Define Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  verified: { type: Boolean, default: false },
  verificationFile: String
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
  posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  job_title: String,
  company_name: String,
  salary_range: String,
  description: String,
  skills: String,
  date_applied: Date,
  status: String,
  resume_path: String,
  active: Number
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  topic: { type: String, required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
});
const projectMemberSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joined_at: { type: Date, default: Date.now }
});



const joinRequestSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  requested_at: Date
}, { timestamps: true });

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
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  created_at: Date,
  is_read: Boolean
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