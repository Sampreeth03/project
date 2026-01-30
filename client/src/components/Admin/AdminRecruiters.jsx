import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchRecruitersData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminRecruiters = () => {
    const dispatch = useDispatch();
    const { recruiters, recruitersLoading, recruitersError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecruiter, setSelectedRecruiter] = useState(null);
    const [recruiterJobs, setRecruiterJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [applicants, setApplicants] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [applicantsLoading, setApplicantsLoading] = useState(false);
    const [panelError, setPanelError] = useState('');
    const [cacheByJobId, setCacheByJobId] = useState({});

    useEffect(() => {
        dispatch(fetchRecruitersData());
    }, [dispatch]);

    const filteredRecruiters = useMemo(() => recruiters.filter((recruiter) =>
        recruiter.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recruiter.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recruiter.company?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [recruiters, searchQuery]);

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'R';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const parsed = new Date(dateStr);
        if (Number.isNaN(parsed.getTime())) return 'N/A';
        return parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatJobDate = (dateStr) => formatDate(dateStr);

    const closePanel = () => {
        setSelectedRecruiter(null);
        setRecruiterJobs([]);
        setSelectedJobId('');
        setApplicants([]);
        setJobsLoading(false);
        setApplicantsLoading(false);
        setPanelError('');
    };

    const loadApplicantsForJob = async (jobId) => {
        if (!jobId) return;

        if (cacheByJobId[jobId]) {
            setSelectedJobId(jobId);
            setApplicants(cacheByJobId[jobId]);
            setApplicantsLoading(false);
            return;
        }

        setApplicantsLoading(true);
        setPanelError('');
        setSelectedJobId(jobId);

        try {
            const response = await axios.get(`/api/admin/jobs/${jobId}/applicants`, { withCredentials: true });
            const list = Array.isArray(response.data?.applicants)
                ? response.data.applicants
                : Array.isArray(response.data?.data?.applicants)
                    ? response.data.data.applicants
                    : [];

            setApplicants(list);
            setCacheByJobId((prev) => ({ ...prev, [jobId]: list }));
        } catch (error) {
            setPanelError(error.response?.data?.error || error.message || 'Failed to load applicants');
            setApplicants([]);
        } finally {
            setApplicantsLoading(false);
        }
    };

    const openRecruiterPanel = async (recruiter) => {
        if (!recruiter?.id) return;

        setSelectedRecruiter(recruiter);
        setRecruiterJobs([]);
        setSelectedJobId('');
        setApplicants([]);
        setJobsLoading(true);
        setApplicantsLoading(false);
        setPanelError('');

        try {
            const response = await axios.get(`/api/admin/recruiters/${recruiter.id}/jobs`, { withCredentials: true });
            const jobs = Array.isArray(response.data?.jobs)
                ? response.data.jobs
                : Array.isArray(response.data?.data?.jobs)
                    ? response.data.data.jobs
                    : [];

            setRecruiterJobs(jobs);

            if (jobs.length > 0) {
                await loadApplicantsForJob(jobs[0].id);
            }
        } catch (error) {
            setPanelError(error.response?.data?.error || error.message || 'Failed to load recruiter jobs');
        } finally {
            setJobsLoading(false);
        }
    };

    const activeJob = recruiterJobs.find((job) => job.id === selectedJobId) || null;

    const recruiterTotals = useMemo(() => ({
        recruiters: recruiters.length,
        jobs: recruiters.reduce((sum, recruiter) => sum + Number(recruiter.jobsCount || recruiter.recruitmentCount || 0), 0),
        applicants: recruiters.reduce((sum, recruiter) => sum + Number(recruiter.totalApplicants || recruiter.recruitmentCount || 0), 0),
        recruits: recruiters.reduce((sum, recruiter) => sum + Number(recruiter.recruitsCount || recruiter.hiresCount || recruiter.recruitmentCount || 0), 0)
    }), [recruiters]);

    return (
        <div className="admin-container">
            <AdminSidebar />
            <div className="admin-main-content">
                {/* Header */}
                <div className="admin-header">
                    <div className="page-title">
                        <h2>Recruiters Management</h2>
                        <div className="breadcrumb">Dashboard &gt; Recruiters</div>
                    </div>
                    <div className="admin-controls">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search recruiters..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <i className="fas fa-search"></i>
                        </div>
                        <div className="admin-profile">
                            <div className="admin-avatar">
                                <i className="fas fa-user"></i>
                            </div>
                            <div className="admin-info">
                                <div className="admin-name">Admin</div>
                                <div className="admin-role">Super Admin</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="projects-stats" style={{ marginBottom: '24px' }}>
                    <div className="stat-card">
                        <div className="stat-icon bg-primary"><i className="fas fa-user-tie"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{recruiterTotals.recruiters}</div>
                            <div className="stat-label">Recruiters</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-success"><i className="fas fa-briefcase"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{recruiterTotals.jobs}</div>
                            <div className="stat-label">Jobs Posted</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-warning"><i className="fas fa-user-check"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{recruiterTotals.recruits}</div>
                            <div className="stat-label">Recruits</div>
                        </div>
                    </div>
                </div>

                {/* Recruiters Table */}
                <div className="admin-table-container">
                    <div className="table-header">
                        <h4 className="table-title">All Recruiters</h4>
                        <span className="table-count">{filteredRecruiters.length} recruiters</span>
                    </div>
                    <div className="table-wrapper">
                        {recruitersLoading && <div className="loading-message">Loading recruiters...</div>}
                        {recruitersError && <div className="error-message">Error: {recruitersError}. Please login as admin.</div>}
                        {!recruitersLoading && !recruitersError && (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Recruiter</th>
                                        <th>Email</th>
                                        <th>Company</th>
                                        <th>Total Applicants</th>
                                        <th>Recruits</th>
                                        <th>Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecruiters.map((recruiter) => (
                                        <tr
                                            key={recruiter.id}
                                            className="recruiter-row recruiter-row-clickable"
                                            onClick={() => openRecruiterPanel(recruiter)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-avatar bg-success">{getInitials(recruiter.name)}</div>
                                                    <div className="user-details">
                                                        <div className="user-name">{recruiter.name}</div>
                                                        <div className="user-email">{recruiter.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{recruiter.email}</td>
                                            <td>{recruiter.company || '—'}</td>
                                            <td>{recruiter.totalApplicants || recruiter.recruitmentCount || 0}</td>
                                            <td>{recruiter.recruitsCount || recruiter.hiresCount || recruiter.recruitmentCount || 0}</td>
                                            <td>{formatDate(recruiter.joinedDate)}</td>
                                        </tr>
                                    ))}
                                    {filteredRecruiters.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="no-data">No recruiters found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {selectedRecruiter && (
                    <div className="admin-modal-overlay" onClick={closePanel}>
                        <div className="admin-modal recruiter-drilldown-modal" onClick={(event) => event.stopPropagation()}>
                            <button type="button" className="admin-modal-close" onClick={closePanel}>
                                <i className="fas fa-times"></i>
                            </button>

                            <div className="admin-modal-header">
                                <div className="admin-modal-avatar">{getInitials(selectedRecruiter.name)}</div>
                                <div className="admin-modal-headline">
                                    <h3>{selectedRecruiter.name}</h3>
                                    <p>{selectedRecruiter.company || selectedRecruiter.email}</p>
                                </div>
                            </div>

                            {panelError && <div className="error-message">Error: {panelError}</div>}

                            <div className="recruiter-drilldown-layout">
                                <div className="recruiter-drilldown-column">
                                    <div className="recruiter-drilldown-title">Jobs created by recruiter</div>
                                    {jobsLoading && <div className="loading-message">Loading jobs...</div>}
                                    {!jobsLoading && recruiterJobs.length === 0 && (
                                        <div className="no-data-message">No jobs found for this recruiter.</div>
                                    )}
                                    {!jobsLoading && recruiterJobs.length > 0 && (
                                        <div className="recruiter-jobs-list">
                                            {recruiterJobs.map((job) => (
                                                <button
                                                    key={job.id}
                                                    type="button"
                                                    className={`recruiter-job-item ${selectedJobId === job.id ? 'active' : ''}`}
                                                    onMouseEnter={() => loadApplicantsForJob(job.id)}
                                                    onFocus={() => loadApplicantsForJob(job.id)}
                                                    onClick={() => loadApplicantsForJob(job.id)}
                                                >
                                                    <div className="recruiter-job-title">{job.job_title}</div>
                                                    <div className="recruiter-job-meta">
                                                        <span>{formatJobDate(job.createdAt)}</span>
                                                        <span>{job.applicantsCount || 0} applicants</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="recruiter-drilldown-column recruiter-drilldown-column--applicants">
                                    <div className="recruiter-drilldown-title">
                                        Applicants {activeJob ? `for ${activeJob.job_title}` : ''}
                                    </div>
                                    {applicantsLoading && <div className="loading-message">Loading applicants...</div>}
                                    {!applicantsLoading && !activeJob && (
                                        <div className="no-data-message">Hover or click a job to see applicants.</div>
                                    )}
                                    {!applicantsLoading && activeJob && applicants.length === 0 && (
                                        <div className="no-data-message">No applicants found for this job.</div>
                                    )}
                                    {!applicantsLoading && applicants.length > 0 && (
                                        <div className="recruiter-applicants-list">
                                            {applicants.map((applicant) => (
                                                <div key={applicant.id} className="recruiter-applicant-item">
                                                    <div className="user-info">
                                                        <div className="user-avatar bg-primary">
                                                            {getInitials(applicant.user?.name || 'U')}
                                                        </div>
                                                        <div className="user-details">
                                                            <div className="user-name">{applicant.user?.name || 'Unknown User'}</div>
                                                            <div className="user-email">{applicant.user?.email || '—'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="recruiter-applicant-meta">
                                                        <span>{formatDate(applicant.appliedAt)}</span>
                                                        <span className={`badge ${applicant.status === 'selected' ? 'badge-success' : applicant.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                                                            {applicant.status}
                                                        </span>
                                                        <span>{applicant.status === 'selected' ? formatDate(applicant.recruitedAt) : '—'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminRecruiters;
