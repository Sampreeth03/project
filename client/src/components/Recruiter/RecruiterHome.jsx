import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import RecruiterNavbar from './RecruiterNavbar';

const RecruiterHome = () => {
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [heroVisible, setHeroVisible] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const heroRef = useRef(null);

    const toggleOptions = () => setOptionsVisible(v => !v);

    useEffect(() => {
        const timer = setTimeout(() => setHeroVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleMouse);
        return () => window.removeEventListener('mousemove', handleMouse);
    }, []);

    const parallaxX = (mousePos.x / window.innerWidth - 0.5) * 18;
    const parallaxY = (mousePos.y / window.innerHeight - 0.5) * 12;

    return (
        <div className="rh-root">
            {/* Blueprint grid background */}
            <div className="rh-grid-bg" />
            {/* Cursor ghost dot */}
            <div className="rh-cursor-ghost" style={{ left: mousePos.x, top: mousePos.y }} />

            <RecruiterNavbar />

            {/* ── HERO ─────────────────────────────────────── */}
            <section ref={heroRef} className={`rh-hero ${heroVisible ? 'rh-hero--visible' : ''}`}>

                <div className="rh-hero-body">
                    {/* LEFT: big editorial text */}
                    <div className="rh-hero-left">
                        <h1 className="rh-headline">
                            <span className="rh-h-line rh-h-line--1">FIND THE</span>
                            <span className="rh-h-line rh-h-line--2">
                                <span className="rh-h-accent">BEST.</span>
                            </span>
                        </h1>

                        <p className="rh-subtext">
                            Discover, shortlist, and hire top professionals <br />
                            built for teams that don't settle for average.
                        </p>

                        <div className="rh-cta-zone">
                            <button
                                className={`rh-cta-btn ${optionsVisible ? 'rh-cta-btn--active' : ''}`}
                                onClick={toggleOptions}
                            >
                                <span className="rh-cta-label">Start Recruiting</span>
                                <span className="rh-cta-icon">{optionsVisible ? '×' : '→'}</span>
                            </button>

                            <div className={`rh-opt-panel ${optionsVisible ? 'rh-opt-panel--open' : ''}`}>
                                <Link to="/rec-app" className="rh-opt-link">
                                    <span className="rh-opt-icon">⊡</span>
                                    <span className="rh-opt-name">View Applications</span>
                                    <span className="rh-opt-arr">↗</span>
                                </Link>
                                <div className="rh-opt-rule" />
                                <Link to="/rec-job" className="rh-opt-link">
                                    <span className="rh-opt-icon">⊕</span>
                                    <span className="rh-opt-name">Post a Job</span>
                                    <span className="rh-opt-arr">↗</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Radar scanner art */}
                    <div
                        className="rh-hero-right"
                        style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}
                    >
                        <div className="rh-radar">
                            {/* outer ring label */}
                            <span className="rh-radar-label rh-radar-label--tl">SCAN</span>
                            <span className="rh-radar-label rh-radar-label--tr">ACTIVE</span>

                            {/* concentric rings */}
                            <div className="rh-radar-ring rh-radar-ring--1" />
                            <div className="rh-radar-ring rh-radar-ring--2" />
                            <div className="rh-radar-ring rh-radar-ring--3" />

                            {/* crosshair axis lines */}
                            <div className="rh-radar-axis rh-radar-axis--h" />
                            <div className="rh-radar-axis rh-radar-axis--v" />

                            {/* rotating sweep */}
                            <div className="rh-radar-sweep" />

                            {/* candidate blips */}
                            <div className="rh-blip rh-blip--1"><span className="rh-blip-ring" /></div>
                            <div className="rh-blip rh-blip--2"><span className="rh-blip-ring" /></div>
                            <div className="rh-blip rh-blip--3"><span className="rh-blip-ring" /></div>
                            <div className="rh-blip rh-blip--4"><span className="rh-blip-ring" /></div>
                            <div className="rh-blip rh-blip--5"><span className="rh-blip-ring" /></div>
                            <div className="rh-blip rh-blip--6"><span className="rh-blip-ring" /></div>

                            {/* center dot */}
                            <div className="rh-radar-center">
                                <div className="rh-radar-center-pulse" />
                            </div>

                            {/* corner brackets */}
                            <div className="rh-bracket rh-bracket--tl" />
                            <div className="rh-bracket rh-bracket--tr" />
                            <div className="rh-bracket rh-bracket--bl" />
                            <div className="rh-bracket rh-bracket--br" />
                        </div>
                    </div>
                </div>

                {/* Ticker tape */}
                <div className="rh-tape-track" aria-hidden="true">
                    <div className="rh-tape-inner">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <span key={i} className="rh-tape-segment">
                                RELAB TEAMS &nbsp;·&nbsp; POST A JOB &nbsp;·&nbsp; REVIEW RESUMES &nbsp;·&nbsp; HIRE SMARTER &nbsp;·&nbsp; TOP TALENT &nbsp;·&nbsp;
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Scroll indicator */}
            <div className="rh-scroll-hint">
                <span className="rh-scroll-hint-label">SCROLL</span>
                <div className="rh-scroll-hint-track">
                    <div className="rh-scroll-hint-dot" />
                </div>
            </div>

            {/* ── ANGLED DIVIDER ───────────────────────────── */}
            <div className="rh-diagonal-cut" />

            {/* ── FEATURES ─────────────────────────────────── */}
            <section className="rh-features-section">
                <div className="rh-feat-header">
                    <span className="rh-feat-tag">[ WHY US ]</span>
                    <h2 className="rh-feat-title">BUILT<span className="rh-feat-title-accent"> DIFFERENT.</span></h2>
                </div>

                <div className="rh-feat-list">
                    {[
                        {
                            num: '01',
                            name: 'Post Jobs, Get Talent',
                            desc: 'Create a job listing in minutes. Define the role, required skills, and salary range, then let qualified candidates come to you.',
                            tag: 'JOBS',
                        },
                        {
                            num: '02',
                            name: 'Review Every Resume',
                            desc: 'Every applicant submission lands in your dashboard. Browse resumes, evaluate answers to your custom screening questions, and shortlist the right people.',
                            tag: 'RESUMES',
                        },
                        {
                            num: '03',
                            name: 'Approve or Reject',
                            desc: 'One-click hiring decisions. Approve the candidates you want, reject the rest, applicants are notified instantly so nobody waits.',
                            tag: 'DECISIONS',
                        },
                    ].map(({ num, name, desc, tag }, i) => (
                        <div className="rh-feat-row" key={num} style={{ animationDelay: `${i * 0.12}s` }}>
                            <span className="rh-feat-num">{num}</span>
                            <div className="rh-feat-body">
                                <h3 className="rh-feat-name">{name}</h3>
                                <p className="rh-feat-desc">{desc}</p>
                            </div>
                            <div className="rh-feat-pill">{tag}</div>
                            <div className="rh-feat-line" />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FOOTER CTA ───────────────────────────────── */}
            <section className="rh-footer-cta">
                <div className="rh-ftr-inner">
                    <p className="rh-ftr-pre">[ READY TO FIND YOUR NEXT HIRE? ]</p>
                    <h3 className="rh-ftr-big">LET'S BUILD</h3>
                    <h3 className="rh-ftr-big rh-ftr-big--outline">YOUR TEAM.</h3>
                </div>
            </section>

            {/* ── RECRUITER FOOTER ─────────────────────────── */}
            <footer className="rh-site-footer">
                <div className="rh-sf-glow" />
                <div className="rh-sf-top">
                    <div className="rh-sf-brand">
                        <p className="rh-sf-logo">
                            RELAB<span className="rh-sf-logo-sm">Teams</span>
                        </p>
                        <p className="rh-sf-tagline">
                            Connecting top talent with<br />the companies that shape tomorrow.
                        </p>
                        <div className="rh-sf-badge">
                            <span className="rh-sf-badge-dot" />
                            Recruiter Platform · v2.0
                        </div>
                    </div>
                    <div className="rh-sf-cols">
                        <div className="rh-sf-col">
                            <p className="rh-sf-col-head">Platform</p>
                            <a href="/recruiter-home" className="rh-sf-link">Home</a>
                            <a href="/rec-job" className="rh-sf-link">Post a Job</a>
                            <a href="/rec-app" className="rh-sf-link">Applications</a>
                            <a href="/recruiter-dashboard" className="rh-sf-link">Dashboard</a>
                        </div>
                        <div className="rh-sf-col">
                            <p className="rh-sf-col-head">Resources</p>
                            <a href="#" className="rh-sf-link">Hiring Guide</a>
                            <a href="#" className="rh-sf-link">Best Practices</a>
                            <a href="#" className="rh-sf-link">Support</a>
                            <a href="#" className="rh-sf-link">Contact Us</a>
                        </div>
                    </div>
                </div>
                <div className="rh-sf-divider" />
                <div className="rh-sf-bottom">
                    <span className="rh-sf-copy">© 2025 RELABTeams. All rights reserved.</span>
                    <div className="rh-sf-brand-mark">
                        <span className="rh-sf-mark-bar" />
                        <span className="rh-sf-mark-text">BUILT FOR RECRUITERS</span>
                        <span className="rh-sf-mark-bar" />
                    </div>
                    <div className="rh-sf-status">
                        <span className="rh-sf-status-dot" />
                        <span>All systems operational</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default RecruiterHome;
