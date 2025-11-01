// --- MAIN USER COMPONENT ---

// --- PROJECT IMPORTS (NEWLY ADDED) ---
// --- TEMPORARY IMPORTS (Required to prevent post-login crash) ---

import { Routes, Route } from 'react-router-dom';
import Landing from './components/landing/Landing.jsx';
import Signup from './components/Auth/signup.jsx';
import Login from './components/Auth/login.jsx';
import UserHome from './components/User/UserHome.jsx';
import ProjectsList from './components/Projects/ProjectsList.jsx'; 
import JoinedProjects from './components/Projects/JoinedProjects.jsx';
import ProjectDetails from './components/Projects/ProjectDetails.jsx'; 
import CreateProject from './components/Projects/CreateProject.jsx';
import DoubtPage from './components/User/DoubtPage.jsx';
import ClearDoubts from './components/User/ClearDoubts.jsx';
import ProjectNotifications from './components/User/ProjectNotifications.jsx';

import RecruiterHome from './components/Recruiter/RecruiterHome.jsx';
import RecruiterDashboard from './components/Recruiter/RecruiterDashboard.jsx';
import RecruiterJobs from './components/Recruiter/RecruiterJobs.jsx';
import RecruiterApplications from './components/Recruiter/RecruiterApplications.jsx';
import RecruiterNotifications from './components/Recruiter/RecruiterNotifications.jsx';
import RecruiterProfile from './components/Recruiter/RecruiterProfile.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

function App() {
  return (
    <Routes>
      {/* --- PUBLIC ROUTES --- */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signupforrec" element={<Signup />} />
      
      {/* --- AUTHENTICATED TARGETS --- */}
      
      {/* User Home */}
      <Route path="/home" element={<UserHome />} /> 
      <Route path="/doubt" element={<DoubtPage />} />
      <Route path="/clear" element={<ClearDoubts />} />
      <Route path="/not" element={<ProjectNotifications />} />
      
      {/* --- PROJECT VIEWS --- */}
      {/* All Projects List */}
      <Route path="/project" element={<ProjectsList />} />
      {/* Joined Projects List */}
      <Route path="/joined-projects" element={<JoinedProjects />} />
      {/* Individual Project Details */}
      <Route path="/project/:id" element={<ProjectDetails />} />
      <Route path="/e" element={<CreateProject />} /> {/* Mapped original EJS route for direct link */}
      
      {/* RECRUITER ROUTES */}
      <Route path="/recruiter-home" element={<RecruiterHome />} />
      <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
      <Route path="/rec-job" element={<RecruiterJobs />} />
      <Route path="/rec-app" element={<RecruiterApplications />} />
      <Route path="/rec-not" element={<RecruiterNotifications />} />
      <Route path="/rec-prof" element={<RecruiterProfile />} />

      {/* ADMIN ROUTE */}
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}
export default App;