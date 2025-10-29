import React, { useState, useEffect } from 'react';
import RecruiterNavbar from './RecruiterNavbar';
import '../../styles/Recruiter.css';

const RecruiterDashboard = () => {
    const [stats, setStats] = useState({
        totalJobs: 0,
        totalParticipants: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/recruiter-dashboard', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (response.ok) {
                setStats({
                    totalJobs: data.totalJobs || 0,
                    totalParticipants: data.totalParticipants || 0
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="recruiter-dashboard-body">
            <RecruiterNavbar />

            <div className="recruiter-dashboard-container">
                <h2 className="recruiter-dashboard-title">Recruiter Dashboard</h2>
                
                {loading ? (
                    <div className="recruiter-empty-state">
                        <p>Loading dashboard data...</p>
                    </div>
                ) : (
                    <div className="recruiter-stats-dashboard">
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{stats.totalJobs}</div>
                            <div className="recruiter-stat-label">Total Jobs Posted</div>
                        </div>
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{stats.totalParticipants}</div>
                            <div className="recruiter-stat-label">Total Participants</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecruiterDashboard;
