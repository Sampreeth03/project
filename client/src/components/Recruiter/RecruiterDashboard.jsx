import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RecruiterNavbar from './RecruiterNavbar';
import { fetchDashboard } from '../../store/recruiterSlice';
import '../../styles/Recruiter.css';

const RecruiterDashboard = () => {
    const dispatch = useDispatch();
    
    // Redux state
    const { 
        totalJobs, 
        totalParticipants, 
        approvedApplications,
        pendingApplications,
        rejectedApplications,
        hiringSuccessRate,
        topMostAppliedJob,
        loading, 
        error 
    } = useSelector(state => state.recruiter.dashboard);

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
                            <div className="recruiter-stat-label">Total Applications</div>
                        </div>
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{approvedApplications}</div>
                            <div className="recruiter-stat-label">Approved Applications</div>
                        </div>
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{pendingApplications}</div>
                            <div className="recruiter-stat-label">Pending Applications</div>
                        </div>
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{rejectedApplications}</div>
                            <div className="recruiter-stat-label">Rejected Applications</div>
                        </div>
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{hiringSuccessRate}%</div>
                            <div className="recruiter-stat-label">Hiring Success Rate</div>
                        </div>
                        <div className="recruiter-stat-card">
                            <div className="recruiter-stat-value">{topMostAppliedJob.applicationCount}</div>
                            <div className="recruiter-stat-label">Top Most Applied Job</div>
                            <div className="recruiter-stat-sublabel">{topMostAppliedJob.jobTitle}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecruiterDashboard;
