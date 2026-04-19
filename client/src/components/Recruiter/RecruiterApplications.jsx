import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RecruiterNavbar from './RecruiterNavbar';
import UserProfileModal from './UserProfileModal';
import {
    fetchApplications, fetchJobs,
    updateApplicationStatus, clearApplicationsError, fetchDashboard
} from '../../store/recruiterSlice';

/* ─── tiny animated counter ─────────────────────────── */
function AnimatedCount({ value }) {
    const [display, setDisplay] = useState(0);
    const raf = useRef(null);
    useEffect(() => {
        const start = display;
        const end   = value;
        const dur   = 700;
        const t0    = performance.now();
        const step  = (t) => {
            const p = Math.min((t - t0) / dur, 1);
            setDisplay(Math.round(start + (end - start) * p));
            if (p < 1) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf.current);
    }, [value]); // eslint-disable-line
    return <span>{display}</span>;
}

/* ─── main component ─────────────────────────────────── */
const RecruiterApplications = () => {
    const dispatch = useDispatch();
    const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

    const { list: applications, loading: appsLoading, error } = useSelector(s => s.recruiter.applications);
    const { list: jobs, loading: jobsLoading }                = useSelector(s => s.recruiter.jobs);

    const [selectedJobTitle, setSelectedJobTitle]   = useState(null);
    const [appFilter, setAppFilter]                 = useState('all');   // all | pending | approved | rejected
    const [searchQuery, setSearchQuery]             = useState('');
    const [toast, setToast]                         = useState({ show: false, message: '', type: 'success' });
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [expandedApp, setExpandedApp]             = useState(null);

    useEffect(() => { dispatch(fetchApplications()); }, [dispatch]);
    useEffect(() => { dispatch(fetchJobs()); },         [dispatch]);

    useEffect(() => {
        if (error) { showToast(error, 'danger'); dispatch(clearApplicationsError()); }
    }, [error, dispatch]);

    /* ── group applications by jobTitle ─────────────── */
    const appsByJob = useMemo(() => {
        const map = {};
        applications.forEach(app => {
            const key = app.jobTitle || 'Unknown Position';
            if (!map[key]) map[key] = [];
            map[key].push(app);
        });
        return map;
    }, [applications]);

    /* ── build job rows (jobs list + orphan entries) ─ */
    const jobRows = useMemo(() => {
        const rows = [];
        const seenTitles = new Set();

        jobs.forEach(j => {
            const title = j.job_title;
            seenTitles.add(title);
            const apps = appsByJob[title] || [];
            rows.push({
                id: j._id,
                title,
                company: j.company_name,
                salary: j.salary_range,
                skills: j.skills,
                active: j.active,
                apps,
                total:    apps.length,
                pending:  apps.filter(a => a.status === 'pending').length,
                approved: apps.filter(a => a.status === 'approved').length,
                rejected: apps.filter(a => a.status === 'rejected').length,
            });
        });

        // applications for jobs no longer in jobs list (deleted)
        Object.keys(appsByJob).forEach(title => {
            if (!seenTitles.has(title)) {
                const apps = appsByJob[title];
                rows.push({
                    id: `orphan-${title}`,
                    title,
                    company: apps[0]?.jobTitle || '',
                    salary: '',
                    skills: '',
                    active: false,
                    isDeleted: true,
                    apps,
                    total:    apps.length,
                    pending:  apps.filter(a => a.status === 'pending').length,
                    approved: apps.filter(a => a.status === 'approved').length,
                    rejected: apps.filter(a => a.status === 'rejected').length,
                });
            }
        });
        return rows;
    }, [jobs, appsByJob]);

    /* ── selected job ─────────────────────────────── */
    const selectedJob = useMemo(
        () => jobRows.find(j => j.title === selectedJobTitle) || null,
        [jobRows, selectedJobTitle]
    );

    /* ── filtered applications inside selected job ── */
    const visibleApps = useMemo(() => {
        if (!selectedJob) return [];
        let list = [...selectedJob.apps];
        if (appFilter !== 'all') list = list.filter(a => a.status === appFilter);
        const q = searchQuery.trim().toLowerCase();
        if (q) list = list.filter(a =>
            [a.applicantName, a.jobTitle, a.status, a.content].some(f => String(f || '').toLowerCase().includes(q))
        );
        return list;
    }, [selectedJob, appFilter, searchQuery]);

    /* ── global stats ─────────────────────────────── */
    const globalStats = useMemo(() => ({
        totalJobs:    jobRows.length,
        totalApps:    applications.length,
        pending:      applications.filter(a => a.status === 'pending').length,
        approved:     applications.filter(a => a.status === 'approved').length,
        rejected:     applications.filter(a => a.status === 'rejected').length,
    }), [jobRows, applications]);

    /* ── helpers ──────────────────────────────────── */
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const handleApprove = async (applicationId, e) => {
        e.stopPropagation();
        try {
            const res = await dispatch(updateApplicationStatus({ applicationId, status: 'Approved' })).unwrap();
            if (res.success) { showToast('Candidate moved to approved.', 'success'); dispatch(fetchDashboard()); }
            else showToast(res.error || 'Failed', 'danger');
        } catch { showToast('Error approving', 'danger'); }
    };

    const handleReject = async (applicationId, e) => {
        e.stopPropagation();
        try {
            const res = await dispatch(updateApplicationStatus({ applicationId, status: 'Rejected' })).unwrap();
            if (res.success) { showToast('Candidate rejected.', 'danger'); dispatch(fetchDashboard()); }
            else showToast(res.error || 'Failed', 'danger');
        } catch { showToast('Error rejecting', 'danger'); }
    };

    const handleViewProfile = (userId, userName, e) => {
        e.stopPropagation();
        setSelectedUserProfile({ userId, userName });
    };

    const getInitials = name =>
        (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    const statusColor = s =>
        s === 'approved' ? '#00e07a' : s === 'rejected' ? '#ff3b5c' : '#0068FF';

    const statusLabel = s =>
        s === 'approved' ? 'HIRED' : s === 'rejected' ? 'DECLINED' : 'REVIEW';

    const getResumeUrl = (resumeId) => {
        const path = `/api/view-resume/${encodeURIComponent(resumeId)}`;
        return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
    };

    /* ─────────────────────────────────────────────────
       RENDER
    ───────────────────────────────────────────────── */
    return (
        <div className="ra-root">
            <RecruiterNavbar />

            {/* ── GLOBAL STAT STRIP ─────────────────── */}
            <div className="ra-stat-strip">
                <div className="ra-stat-strip-inner">
                    {[
                        { label: 'POSITIONS', val: globalStats.totalJobs,  color: '#0068FF' },
                        { label: 'APPLICANTS',val: globalStats.totalApps,  color: '#a78bfa' },
                        { label: 'IN REVIEW', val: globalStats.pending,    color: '#f59e0b' },
                        { label: 'HIRED',     val: globalStats.approved,   color: '#00e07a' },
                        { label: 'DECLINED',  val: globalStats.rejected,   color: '#ff3b5c' },
                    ].map(s => (
                        <div className="ra-stat-node" key={s.label}>
                            <div className="ra-stat-num" style={{ color: s.color }}>
                                <AnimatedCount value={s.val} />
                            </div>
                            <div className="ra-stat-lbl">{s.label}</div>
                        </div>
                    ))}
                </div>
                <div className="ra-strip-ticker">
                    {Array(3).fill(0).map((_, i) => (
                        <span key={i} className="ra-ticker-inner">
                            {jobRows.map(j => (
                                <span key={j.id} className="ra-ticker-item">
                                    <span style={{ color: '#0068FF' }}>◈</span> {j.title} &nbsp;·&nbsp; {j.total} applicants &nbsp;&nbsp;&nbsp;
                                </span>
                            ))}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── MAIN WORKSPACE ───────────────────── */}
            <div className="ra-workspace">

                {/* ── LEFT: JOB BOARD ──────────────── */}
                <aside className="ra-board">
                    <div className="ra-board-header">
                        <span className="ra-board-eyebrow">OPEN POSITIONS</span>
                        <h2 className="ra-board-title">Job Board</h2>
                        <div className="ra-board-line" />
                    </div>

                    {(jobsLoading || appsLoading) ? (
                        <div className="ra-loading-ring">
                            <div className="ra-ring" /><p>Scanning…</p>
                        </div>
                    ) : jobRows.length === 0 ? (
                        <div className="ra-board-empty">
                            <div className="ra-empty-icon">⬡</div>
                            <p>No positions posted yet</p>
                        </div>
                    ) : (
                        <div className="ra-job-list">
                            {jobRows.map((job, idx) => {
                                const isSelected = selectedJobTitle === job.title;
                                const pct = job.total > 0 ? Math.round((job.approved / job.total) * 100) : 0;
                                return (
                                    <div
                                        key={job.id}
                                        className={`ra-job-card ${isSelected ? 'ra-job-card--active' : ''}`}
                                        onClick={() => {
                                            setSelectedJobTitle(isSelected ? null : job.title);
                                            setAppFilter('all');
                                            setSearchQuery('');
                                            setExpandedApp(null);
                                        }}
                                        style={{ '--idx': idx }}
                                    >
                                        {/* accent line at top */}
                                        <div className="ra-job-accent" />

                                        <div className="ra-job-top">
                                            <div className="ra-job-index">
                                                {String(idx + 1).padStart(2, '0')}
                                            </div>
                                            {job.isDeleted ? (
                                                <span className="ra-job-status-badge ra-job-status-badge--deleted">DELETED</span>
                                            ) : job.active ? (
                                                <div className="ra-job-status-pip" style={{ background: '#00e07a' }} title="Active" />
                                            ) : (
                                                <span className="ra-job-status-badge ra-job-status-badge--inactive">INACTIVE</span>
                                            )}
                                        </div>

                                        <div className="ra-job-name">{job.title}</div>
                                        {job.company && <div className="ra-job-company">{job.company}</div>}

                                        {/* pill stats */}
                                        <div className="ra-job-pills">
                                            <span className="ra-pill ra-pill--blue">{job.total} total</span>
                                            <span className="ra-pill ra-pill--amber">{job.pending} review</span>
                                            <span className="ra-pill ra-pill--green">{job.approved} hired</span>
                                            <span className="ra-pill ra-pill--red">{job.rejected} out</span>
                                        </div>

                                        {/* corner arrow */}
                                        <div className="ra-job-arrow">→</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </aside>

                {/* ── RIGHT: APPLICATIONS FEED ───────── */}
                <main className="ra-feed">
                    {!selectedJob ? (
                        <div className="ra-idle-state">
                            <div className="ra-idle-radar">
                                <div className="ra-ir-ring ra-ir-ring--1" />
                                <div className="ra-ir-ring ra-ir-ring--2" />
                                <div className="ra-ir-ring ra-ir-ring--3" />
                                <div className="ra-ir-sweep" />
                                <div className="ra-ir-center" />
                            </div>
                            <p className="ra-idle-text">Select a position to<br/>review its candidates</p>
                        </div>
                    ) : (
                        <>
                            {/* feed header */}
                            <div className="ra-feed-header">
                                <div className="ra-feed-breadcrumb">
                                    <span className="ra-feed-bc-parent" onClick={() => setSelectedJobTitle(null)}>
                                        JOB BOARD
                                    </span>
                                    <span className="ra-feed-bc-sep">›</span>
                                    <span className="ra-feed-bc-current">{selectedJob.title}</span>
                                </div>

                                <h1 className="ra-feed-title">{selectedJob.title}</h1>
                                {selectedJob.company && (
                                    <p className="ra-feed-subtitle">
                                        {selectedJob.company}
                                        {selectedJob.salary && <span className="ra-feed-salary"> · {selectedJob.salary}</span>}
                                    </p>
                                )}

                                {/* inline stats */}
                                <div className="ra-feed-stats">
                                    {[
                                        { l: 'TOTAL',    v: selectedJob.total,    c: '#0068FF' },
                                        { l: 'IN REVIEW',v: selectedJob.pending,  c: '#f59e0b' },
                                        { l: 'HIRED',    v: selectedJob.approved, c: '#00e07a' },
                                        { l: 'DECLINED', v: selectedJob.rejected, c: '#ff3b5c' },
                                    ].map(s => (
                                        <div className="ra-feed-stat" key={s.l}>
                                            <div className="ra-feed-stat-n" style={{ color: s.c }}>
                                                <AnimatedCount value={s.v} />
                                            </div>
                                            <div className="ra-feed-stat-l">{s.l}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* filter & search */}
                                <div className="ra-feed-controls">
                                    <div className="ra-filter-pills">
                                        {['all','pending','approved','rejected'].map(f => (
                                            <button
                                                key={f}
                                                className={`ra-filter-pill ${appFilter === f ? 'ra-filter-pill--on' : ''}`}
                                                onClick={() => setAppFilter(f)}
                                            >
                                                {f === 'all' ? 'ALL' : f === 'pending' ? 'IN REVIEW' : f.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="ra-search-wrap">
                                        <span className="ra-search-icon">⌕</span>
                                        <input
                                            className="ra-search"
                                            placeholder="Search candidates…"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* application cards */}
                            <div className="ra-cards-grid">
                                {visibleApps.length === 0 ? (
                                    <div className="ra-no-apps">
                                        <div className="ra-no-apps-glyph">∅</div>
                                        <p>No candidates match this filter</p>
                                    </div>
                                ) : visibleApps.map((app, idx) => {
                                    const isOpen = expandedApp === app.id;
                                    const sc = statusColor(app.status);
                                    return (
                                        <div
                                            key={app.id}
                                            className={`ra-app-card ${isOpen ? 'ra-app-card--open' : ''}`}
                                            style={{ '--sc': sc, '--idx': idx }}
                                            onClick={() => setExpandedApp(isOpen ? null : app.id)}
                                        >
                                            {/* left status bar */}
                                            <div className="ra-app-bar" style={{ background: sc }} />

                                            <div className="ra-app-main">
                                                {/* avatar + name */}
                                                <div className="ra-app-identity">
                                                    <div className="ra-app-avatar" style={{ borderColor: sc }}>
                                                        <span>{getInitials(app.applicantName)}</span>
                                                        <div className="ra-app-avatar-ring" style={{ borderColor: sc }} />
                                                    </div>
                                                    <div className="ra-app-nameblock">
                                                        <div className="ra-app-name">{app.applicantName}</div>
                                                        <div className="ra-app-time">{app.time}</div>
                                                    </div>
                                                    <div className="ra-app-status-tag" style={{ color: sc, borderColor: sc }}>
                                                        {statusLabel(app.status)}
                                                    </div>
                                                </div>

                                                {/* content preview */}
                                                {!isOpen && (
                                                    <div className="ra-app-preview">
                                                        {(app.content || '').slice(0, 100)}{app.content?.length > 100 ? '…' : ''}
                                                    </div>
                                                )}

                                                {/* expanded section */}
                                                {isOpen && (
                                                    <div className="ra-app-detail">
                                                        <p className="ra-app-detail-text">{app.content}</p>

                                                        <div className="ra-app-actions">
                                                            <button
                                                                className="ra-act-btn ra-act-btn--profile"
                                                                onClick={e => handleViewProfile(app.applicantId, app.applicantName, e)}
                                                            >
                                                                Profile
                                                            </button>
                                                            <a
                                                                href={getResumeUrl(app.resumeId)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ra-act-btn ra-act-btn--resume"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                Resume
                                                            </a>
                                                            {app.status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        className="ra-act-btn ra-act-btn--approve"
                                                                        onClick={e => handleApprove(app.id, e)}
                                                                    >
                                                                        Hire
                                                                    </button>
                                                                    <button
                                                                        className="ra-act-btn ra-act-btn--reject"
                                                                        onClick={e => handleReject(app.id, e)}
                                                                    >
                                                                        Decline
                                                                    </button>
                                                                </>
                                                            )}
                                                            {app.status === 'approved' && (
                                                                <button
                                                                    className="ra-act-btn ra-act-btn--reject"
                                                                    onClick={e => handleReject(app.id, e)}
                                                                >
                                                                    Decline
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="ra-app-expand-hint">{isOpen ? '▲' : '▼'}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* toast */}
            <div className={`ra-toast ${toast.show ? 'ra-toast--show' : ''} ra-toast--${toast.type}`}>
                <span className="ra-toast-dot" />
                {toast.message}
            </div>

            {selectedUserProfile && (
                <UserProfileModal
                    userId={selectedUserProfile.userId}
                    userName={selectedUserProfile.userName}
                    onClose={() => setSelectedUserProfile(null)}
                />
            )}
        </div>
    );
};

export default RecruiterApplications;
