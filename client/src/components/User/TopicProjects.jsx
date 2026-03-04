import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavBar from './NavBar.jsx';
import '../../styles/TopicProjects.css';

const TOPICS_CONFIG = {
  '/web-dev': { title: 'Web Development', topic: 'Web Development' },
  '/cyb': { title: 'Cyber Security', topic: 'Cyber Security' },
  '/dl': { title: 'Deep Learning', topic: 'Deep Learning' },
  '/robo': { title: 'Robotics', topic: 'Robotics' },
  '/ds': { title: 'Data Science', topic: 'Data Science' },
  '/blockchain': { title: 'Blockchain', topic: 'Blockchain' }
};

const ALL_TOPICS = [
  { name: 'Web Development', path: '/web-dev' },
  { name: 'Cyber Security', path: '/cyb' },
  { name: 'Deep Learning', path: '/dl' },
  { name: 'Robotics', path: '/robo' },
  { name: 'Data Science', path: '/ds' },
  { name: 'Blockchain', path: '/blockchain' }
];

const TopicProjects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const currentTopic = TOPICS_CONFIG[location.pathname];

  useEffect(() => {
    if (!currentTopic) {
      setError('Invalid topic');
      setLoading(false);
      return;
    }

    fetchProjects();
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api${location.pathname}`, {
        withCredentials: true
      });

      if (response.data.success) {
        setProjects(response.data.projects || []);
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.response?.data?.error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProject = async (projectId) => {
    try {
      const response = await axios.post(
        '/api/join-project',
        { projectId },
        { withCredentials: true }
      );

      if (response.data.success) {
        alert(response.data.message);
        // Refresh projects to update UI
        fetchProjects();
      } else {
        alert(response.data.message || 'Failed to join project');
      }
    } catch (err) {
      console.error('Error joining project:', err);
      alert('An error occurred while joining the project');
    }
  };

  const handleTopicChange = (path) => {
    setShowDropdown(false);
    navigate(path);
  };

  if (!currentTopic) {
    return (
      <div className="topic-projects-container">
        <div className="error-message">Invalid topic selected</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="topic-projects-container">
        <div className="loading">Loading projects...</div>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="topic-projects-container">
        <div className="topic-header-container">
          <h1 className="topic-title">{currentTopic.title} Projects</h1>
          <div className="topics-dropdown" ref={dropdownRef}>
            <button
              className="dropdown-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              Topics
            </button>
            {showDropdown && (
              <div className="dropdown-content">
                {ALL_TOPICS.map((topic) => (
                  <a
                    key={topic.path}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleTopicChange(topic.path);
                    }}
                  >
                    {topic.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      <span className="header-accent"></span>

      {error && <div className="error-message">{error}</div>}

      <div className="project-list">
        {projects.length === 0 ? (
          <p className="no-projects">No {currentTopic.title} projects available yet.</p>
        ) : (
          projects.map((project) => (
            <div key={project._id} className="project-card" data-project-id={project._id}>
              <h2 className="project-title">{project.title}</h2>
              <p className="project-description">{project.description}</p>
              <div className="project-meta">
                <span className="posted-by">
                  Posted by: {project.createdBy || 'Unknown'}
                </span>
                <span className="capacity">
                  Capacity:{' '}
                  <span className="filled-capacity">{project.memberCount || 0}</span>/
                  <span className="total-capacity">{project.capacity}</span>
                </span>
              </div>
              <button
                className="join-btn"
                onClick={() => handleJoinProject(project._id)}
                disabled={
                  project.hasJoined ||
                  project.hasPendingRequest ||
                  project.memberCount >= project.capacity
                }
              >
                {project.hasJoined
                  ? 'Joined'
                  : project.hasPendingRequest
                  ? 'Request Pending'
                  : 'Request to Join Project'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
};

export default TopicProjects;
