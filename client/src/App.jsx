// --- MAIN USER COMPONENT ---

// --- PROJECT IMPORTS (NEWLY ADDED) ---
// --- TEMPORARY IMPORTS (Required to prevent post-login crash) ---

import { Routes, Route } from 'react-router-dom';
import Landing from './components/landing/Landing.jsx';
import Signup from './components/Auth/signup.jsx';
import Login from './components/Auth/Login.jsx';
import RecruiterSignup from './components/Recruiter/RecruiterSignup.jsx';
import ForgotPassword from './components/Auth/ForgotPassword.jsx';
import ResetPassword from './components/Auth/ResetPassword.jsx';
import UserHome from './components/User/UserHome.jsx';
import ProjectsList from './components/Projects/ProjectsList.jsx'; 
import JoinedProjects from './components/Projects/JoinedProjects.jsx';
import ProjectDetails from './components/Projects/ProjectDetails.jsx'; 
import CreateProject from './components/Projects/CreateProject.jsx';
import DoubtPage from './components/User/DoubtPage.jsx';
import ClearDoubts from './components/User/ClearDoubts.jsx';
import ProjectNotifications from './components/User/ProjectNotifications.jsx';
import Profile from './components/User/Profile.jsx';
import Dashboard from './components/User/Dashboard.jsx';
import GroupChat from './components/User/GroupChat.jsx';
import ApplyJobs from './components/User/ApplyJobs.jsx';
import JobApplications from './components/User/JobApplications.jsx';
import JobNotifications from './components/User/JobNotifications.jsx';
import TopicProjects from './components/User/TopicProjects.jsx';
import Friends from './components/User/Friends.jsx';

import RecruiterHome from './components/Recruiter/RecruiterHome.jsx';
import RecruiterDashboard from './components/Recruiter/RecruiterDashboard.jsx';
import RecruiterJobs from './components/Recruiter/RecruiterJobs.jsx';
import RecruiterApplications from './components/Recruiter/RecruiterApplications.jsx';
import RecruiterNotifications from './components/Recruiter/RecruiterNotifications.jsx';
import RecruiterProfile from './components/Recruiter/RecruiterProfile.jsx';

import AdminDashboard from './components/Admin/AdminDashboard.jsx';
import AdminStudents from './components/Admin/AdminStudents.jsx';
import AdminRecruiters from './components/Admin/AdminRecruiters.jsx';
import AdminProjects from './components/Admin/AdminProjects.jsx';
import AdminDoubts from './components/Admin/AdminDoubts.jsx';
import AdminMessages from './components/Admin/AdminMessages.jsx';
import AdminProfile from './components/Admin/AdminProfile.jsx';

function App() {
  return (
    <Routes>
      {/* --- PUBLIC ROUTES --- */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signupforrec" element={<RecruiterSignup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* --- AUTHENTICATED TARGETS --- */}
      
      {/* User Home */}
      <Route path="/home" element={<UserHome />} /> 
      <Route path="/doubt" element={<DoubtPage />} />
      <Route path="/clear" element={<ClearDoubts />} />
      <Route path="/not" element={<ProjectNotifications />} />
      
      {/* Job Routes */}
      <Route path="/apply" element={<ApplyJobs />} />
      <Route path="/my-applications" element={<JobApplications />} />
      <Route path="/job_not" element={<JobNotifications />} />
      
      {/* Profile Routes */}
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:id" element={<Profile />} />
      
      {/* --- PROJECT VIEWS --- */}
      {/* All Projects List */}
      <Route path="/project" element={<ProjectsList />} />
      {/* Joined Projects List */}
      <Route path="/joined-projects" element={<JoinedProjects />} />
      {/* Individual Project Details */}
      <Route path="/project/:id" element={<ProjectDetails />} />
      <Route path="/e" element={<CreateProject />} /> {/* Mapped original EJS route for direct link */}

      {/* Dashboard Route */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/messages" element={<GroupChat />} />
      <Route path="/group-chat/:projectId" element={<GroupChat />} />

      {/* Friends */}
      <Route path="/friends" element={<Friends />} />
      
      {/* TOPIC ROUTES */}
      <Route path="/web-dev" element={<TopicProjects />} />
      <Route path="/cyb" element={<TopicProjects />} />
      <Route path="/dl" element={<TopicProjects />} />
      <Route path="/robo" element={<TopicProjects />} />
      <Route path="/ds" element={<TopicProjects />} />
      <Route path="/blockchain" element={<TopicProjects />} />
      
      {/* RECRUITER ROUTES */}
      <Route path="/recruiter-home" element={<RecruiterHome />} />
      <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
      <Route path="/rec-job" element={<RecruiterJobs />} />
      <Route path="/rec-app" element={<RecruiterApplications />} />
      <Route path="/rec-not" element={<RecruiterNotifications />} />
      <Route path="/rec-prof" element={<RecruiterProfile />} />

      {/* ADMIN ROUTES */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/students" element={<AdminStudents />} />
      <Route path="/admin/recruiters" element={<AdminRecruiters />} />
      <Route path="/admin/projects" element={<AdminProjects />} />
      <Route path="/admin/doubts" element={<AdminDoubts />} />
      <Route path="/admin/messages" element={<AdminMessages />} />
      <Route path="/admin/profile" element={<AdminProfile />} />
    </Routes>
  );
}
export default App;