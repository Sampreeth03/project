import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RecruiterNavbar from './RecruiterNavbar';
import { fetchDashboard } from '../../store/recruiterSlice';
import '../../styles/Recruiter.css';

const RecruiterDashboard = () => {
    const dispatch = useDispatch();
    
    // Redux state
    const { totalJobs, totalParticipants, loading, error } = useSelector(state => state.recruiter.dashboard);

    useEffect(() => {
        dispatch(fetchDashboard());
    }, [dispatch]);

    return (
        <div className="recruiter-dashboard-body">
            <RecruiterNavbar />

            <div className="recruiter-dashboard-container">
                <h2 className="recruiter-dashboard-title">Recruiter Dashboard</h2>
                
                {loading ? (
                    <div className="recruiter-empty-state">
                        <p>Loading dashboard data...</p>
                    </div>
                ) : error ? (
                    <div className="recruiter-empty-state">
                        <p>Error: {error}</p>
                    </div>
                ) : (
                    <div className="recruiter-stats-dashboard">
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{totalJobs}</div>
                            <div className="recruiter-stat-label">Total Jobs Posted</div>
                        </div>
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{totalParticipants}</div>
                            <div className="recruiter-stat-label">Total Participants</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecruiterDashboard;
