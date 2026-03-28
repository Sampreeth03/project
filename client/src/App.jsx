// --- MAIN USER COMPONENT ---

// --- PROJECT IMPORTS (NEWLY ADDED) ---
// --- TEMPORARY IMPORTS (Required to prevent post-login crash) ---

import { Routes, Route } from 'react-router-dom';
import Landing from './components/landing/Landing.jsx';
import ContactUs from './components/landing/ContactUs.jsx';
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
import AdminAdministrators from './components/Admin/AdminAdministrators.jsx';
import PlatformAdminLogin from './components/Auth/PlatformAdminLogin.jsx';
import RecruiterVerification from './components/PlatformAdmin/RecruiterVerification.jsx';
import PlatformAdminDashboard from './components/PlatformAdmin/PlatformAdminDashboard.jsx';
import NotAllowed from './components/Auth/NotAllowed.jsx';
import { ProtectedRoute, UserRoute, RecruiterRoute, AdminRoute } from './components/Auth/ProtectedRoute.jsx';
import ThemeToggle from './components/common/ThemeToggle.jsx';

function App() {
  return (
    <>
      <ThemeToggle />
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Landing />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signupforrec" element={<RecruiterSignup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/platform-admin-login" element={<PlatformAdminLogin />} />
        <Route path="/platform-admin" element={<PlatformAdminDashboard />} />
        <Route path="/platform-admin/recruiters" element={<RecruiterVerification />} />
        
        {/* --- AUTHENTICATED TARGETS --- */}
        
        {/* USER ROUTES (role: user only) */}
        <Route path="/home" element={<UserRoute><UserHome /></UserRoute>} />
        <Route path="/doubt" element={<UserRoute><DoubtPage /></UserRoute>} />
        <Route path="/clear" element={<UserRoute><ClearDoubts /></UserRoute>} />
        <Route path="/not" element={<UserRoute><ProjectNotifications /></UserRoute>} />
        
        {/* Job Routes */}
        <Route path="/apply" element={<UserRoute><ApplyJobs /></UserRoute>} />
        <Route path="/my-applications" element={<UserRoute><JobApplications /></UserRoute>} />
        <Route path="/job_not" element={<UserRoute><JobNotifications /></UserRoute>} />
        
        {/* Profile Routes */}
        <Route path="/profile" element={<UserRoute><Profile /></UserRoute>} />
        <Route path="/profile/:id" element={<UserRoute><Profile /></UserRoute>} />
        
        {/* --- PROJECT VIEWS --- */}
        <Route path="/project" element={<UserRoute><ProjectsList /></UserRoute>} />
        <Route path="/joined-projects" element={<UserRoute><JoinedProjects /></UserRoute>} />
        <Route path="/project/:id" element={<UserRoute><ProjectDetails /></UserRoute>} />
        <Route path="/e" element={<UserRoute><CreateProject /></UserRoute>} />

        {/* Dashboard Route */}
        <Route path="/dashboard" element={<UserRoute><Dashboard /></UserRoute>} />
        <Route path="/messages" element={<UserRoute><GroupChat /></UserRoute>} />
        <Route path="/group-chat/:projectId" element={<UserRoute><GroupChat /></UserRoute>} />

        {/* Friends */}
        <Route path="/friends" element={<UserRoute><Friends /></UserRoute>} />
        
        {/* TOPIC ROUTES */}
        <Route path="/web-dev" element={<UserRoute><TopicProjects /></UserRoute>} />
        <Route path="/cyb" element={<UserRoute><TopicProjects /></UserRoute>} />
        <Route path="/dl" element={<UserRoute><TopicProjects /></UserRoute>} />
        <Route path="/robo" element={<UserRoute><TopicProjects /></UserRoute>} />
        <Route path="/ds" element={<UserRoute><TopicProjects /></UserRoute>} />
        <Route path="/blockchain" element={<UserRoute><TopicProjects /></UserRoute>} />
        
        {/* RECRUITER ROUTES (role: recruiter only) */}
        <Route path="/recruiter-home" element={<RecruiterRoute><RecruiterHome /></RecruiterRoute>} />
        <Route path="/recruiter-dashboard" element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />
        <Route path="/rec-job" element={<RecruiterRoute><RecruiterJobs /></RecruiterRoute>} />
        <Route path="/rec-app" element={<RecruiterRoute><RecruiterApplications /></RecruiterRoute>} />
        <Route path="/rec-not" element={<RecruiterRoute><RecruiterNotifications /></RecruiterRoute>} />
        <Route path="/rec-prof" element={<RecruiterRoute><RecruiterProfile /></RecruiterRoute>} />

        {/* ADMIN ROUTES (role: admin only) */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
        <Route path="/admin/recruiters" element={<AdminRoute><AdminRecruiters /></AdminRoute>} />
        <Route path="/admin/projects" element={<AdminRoute><AdminProjects /></AdminRoute>} />
        <Route path="/admin/doubts" element={<AdminRoute><AdminDoubts /></AdminRoute>} />
        <Route path="/admin/messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
        <Route path="/admin/profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />
        <Route path="/admin/administrators" element={<AdminRoute><AdminAdministrators /></AdminRoute>} />

        {/* ACCESS DENIED — shown when a logged-in user tries a wrong-role route */}
        <Route path="/not-allowed" element={<ProtectedRoute><NotAllowed /></ProtectedRoute>} />
      </Routes>
    </>
  );
}
export default App;