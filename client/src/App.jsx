import { Routes, Route } from 'react-router-dom';
import Landing from './components/landing/Landing.jsx'; 
import Signup from './components/Auth/Signup.jsx';
import Login from './components/Auth/Login.jsx';

// --- MAIN USER COMPONENT (Replaces user-home.ejs) ---
import UserHome from './components/User/UserHome.jsx'; 

// --- RECRUITER COMPONENTS (Migrated from EJS) ---
import RecruiterHome from './components/Recruiter/RecruiterHome';
import RecruiterDashboard from './components/Recruiter/RecruiterDashboard';
import RecruiterJobs from './components/Recruiter/RecruiterJobs';
import RecruiterApplications from './components/Recruiter/RecruiterApplications';
import RecruiterNotifications from './components/Recruiter/RecruiterNotifications';
import RecruiterProfile from './components/Recruiter/RecruiterProfile';

// --- ADMIN COMPONENT ---
import AdminDashboard from './components/AdminDashboard.jsx'; 

function App() {
  return (
    <Routes>
      {/* --- PUBLIC ROUTES --- */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signupforrec" element={<Signup />} />
      
      {/* --- AUTHENTICATED USER ROUTES --- */}
      <Route path="/home" element={<UserHome />} /> 
      
      {/* --- RECRUITER ROUTES (Migrated from EJS) --- */}
      <Route path="/recruiter-home" element={<RecruiterHome />} />
      <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
      <Route path="/rec-job" element={<RecruiterJobs />} />
      <Route path="/rec-app" element={<RecruiterApplications />} />
      <Route path="/rec-not" element={<RecruiterNotifications />} />
      <Route path="/rec-prof" element={<RecruiterProfile />} />
      
      {/* --- ADMIN ROUTES --- */}
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}
export default App;