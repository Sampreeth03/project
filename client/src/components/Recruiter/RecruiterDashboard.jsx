import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RecruiterNavbar from './RecruiterNavbar';
import { fetchDashboard, fetchDashboardTrends } from '../../store/recruiterSlice';
import { LineChart, DualLineChart, StackedBarChart } from '../User/TrendCharts.jsx';
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
        trends,
        trendsLoading,
        loading, 
        error 
    } = useSelector(state => state.recruiter.dashboard);

    useEffect(() => {
        dispatch(fetchDashboard());
        dispatch(fetchDashboardTrends());
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
                    <>
                        {/* ── Stat Cards ── */}
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
                            <div className="recruiter-stat-card recruiter-stat-card-wide">
                                <div className="recruiter-stat-value">{topMostAppliedJob.applicationCount}</div>
                                <div className="recruiter-stat-label">Top Most Applied Job</div>
                                <div className="recruiter-stat-sublabel">{topMostAppliedJob.jobTitle}</div>
                            </div>
                        </div>

                        {/* ── Trend Charts ── */}
                        <div className="rd-trends-section">
                            {/* 1. Application Inflow */}
                            <div className="rd-trend-card">
                                <div className="rd-trend-header">
                                    <h3 className="rd-trend-title">Application Inflow</h3>
                                    <span className="rd-trend-sub">Applications received per week</span>
                                </div>
                                <LineChart data={trends?.applicationInflow} valueKey="count" color="#0068FF" id="rAI" />
                            </div>

                            {/* 2. Hiring Pipeline */}
                            <div className="rd-trend-card">
                                <div className="rd-trend-header">
                                    <h3 className="rd-trend-title">Hiring Pipeline</h3>
                                    <div className="rd-legend">
                                        <span className="rd-lg-item"><span className="rd-lg-dot" style={{ background: '#f59e0b' }} />Pending</span>
                                        <span className="rd-lg-item"><span className="rd-lg-dot" style={{ background: '#10b981' }} />Approved</span>
                                        <span className="rd-lg-item"><span className="rd-lg-dot" style={{ background: '#ef4444' }} />Rejected</span>
                                    </div>
                                </div>
                                <StackedBarChart
                                    data={trends?.hiringPipeline}
                                    keys={['pending', 'approved', 'rejected']}
                                    colors={['#f59e0b', '#10b981', '#ef4444']}
                                    labels={['Pending', 'Approved', 'Rejected']}
                                />
                            </div>

                            {/* 3. Job Posting Activity */}
                            <div className="rd-trend-card">
                                <div className="rd-trend-header">
                                    <h3 className="rd-trend-title">Job Posting Activity</h3>
                                    <span className="rd-trend-sub">Jobs created per week</span>
                                </div>
                                <LineChart data={trends?.jobPostingActivity} valueKey="count" color="#00C4FF" id="rJP" />
                            </div>

                            {/* 4. Hiring Success Rate */}
                            <div className="rd-trend-card">
                                <div className="rd-trend-header">
                                    <h3 className="rd-trend-title">Hiring Success Rate</h3>
                                    <span className="rd-trend-sub">Cumulative approval % over time</span>
                                </div>
                                <LineChart data={trends?.successRateTrend} valueKey="rate" color="#10b981" id="rSR" />
                            </div>

                            {/* 5. Top Jobs Comparison */}
                            <div className="rd-trend-card rd-trend-card-wide">
                                <div className="rd-trend-header">
                                    <h3 className="rd-trend-title">Top Jobs — Application Breakdown</h3>
                                    <div className="rd-legend">
                                        <span className="rd-lg-item"><span className="rd-lg-dot" style={{ background: '#f59e0b' }} />Pending</span>
                                        <span className="rd-lg-item"><span className="rd-lg-dot" style={{ background: '#10b981' }} />Approved</span>
                                        <span className="rd-lg-item"><span className="rd-lg-dot" style={{ background: '#ef4444' }} />Rejected</span>
                                    </div>
                                </div>
                                {trends?.topJobs?.length > 0 ? (
                                    <div className="rd-horiz-bars">
                                        {trends.topJobs.map((job, i) => {
                                            const maxTotal = Math.max(...trends.topJobs.map(j => j.total), 1);
                                            const pct = (job.total / maxTotal) * 100;
                                            const pPending = job.total > 0 ? (job.pending / job.total) * 100 : 0;
                                            const pApproved = job.total > 0 ? (job.approved / job.total) * 100 : 0;
                                            const pRejected = job.total > 0 ? (job.rejected / job.total) * 100 : 0;
                                            return (
                                                <div className="rd-hbar-row" key={i}>
                                                    <span className="rd-hbar-label" title={job.title}>{job.title.length > 22 ? job.title.slice(0, 20) + '...' : job.title}</span>
                                                    <div className="rd-hbar-track">
                                                        <div className="rd-hbar-fill rd-hbar-pending" style={{ width: `${pPending * pct / 100}%` }} title={`Pending: ${job.pending}`} />
                                                        <div className="rd-hbar-fill rd-hbar-approved" style={{ width: `${pApproved * pct / 100}%` }} title={`Approved: ${job.approved}`} />
                                                        <div className="rd-hbar-fill rd-hbar-rejected" style={{ width: `${pRejected * pct / 100}%` }} title={`Rejected: ${job.rejected}`} />
                                                    </div>
                                                    <span className="rd-hbar-count">{job.total}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rd-no-data">No job data yet</div>
                                )}
                            </div>


                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RecruiterDashboard;
