import { Routes, Route } from 'react-router-dom';
import Landing from './components/landing/Landing.jsx'; 
import Signup from './components/Auth/Signup.jsx';
import Login from './components/Auth/Login.jsx';

// --- MAIN USER COMPONENT (Replaces user-home.ejs) ---
import UserHome from './components/User/UserHome.jsx'; 

// --- TEMPORARY IMPORTS (Required to prevent post-login crash) ---
// Note: We need to keep RecruiterHome and AdminDashboard imports because 
// your backend sends redirects to these paths depending on the user's role.
import RecruiterHome from './components/RecruiterHome.jsx'; 
import AdminDashboard from './components/AdminDashboard.jsx'; 
// ---

function App() {
  return (
    <Routes>
      {/* --- PUBLIC ROUTES --- */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signupforrec" element={<Signup />} />
      
      {/* --- AUTHENTICATED TARGETS --- */}
      
      {/* CRITICAL: UserHome now replaces the generic Home placeholder */}
      <Route path="/home" element={<UserHome />} /> 
      
      {/* These placeholders are still necessary for non-user logins */}
      <Route path="/recruiter-home" element={<RecruiterHome />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}
export default App;