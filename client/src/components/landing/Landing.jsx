import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Particles Init ───────────────────────────────────────────────────────────
const initializeParticles = () => {
  if (window.particlesJS) {
    window.particlesJS('particles-js', {
      particles: {
        number: { value: 160, density: { enable: true, value_area: 1000 } },
        color: { value: '#0068FF' },
        shape: { type: 'circle', stroke: { width: 0, color: '#000000' } },
        opacity: { value: 0.8, random: false },
        size: { value: 2.5, random: true },
        line_linked: { enable: true, distance: 150, color: '#0068FF', opacity: 0.3, width: 1 },
        move: { enable: true, speed: 1.5, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false },
      },
      interactivity: {
        detect_on: 'window',
        events: {
          onhover: { enable: true, mode: 'repulse' },
          onclick: { enable: true, mode: 'push' },
          resize: true,
        },
        modes: {
          repulse: { distance: 100, duration: 0.4 },
          push: { particles_nb: 4 },
        },
      },
      retina_detect: true,
    });
  }
};

// ─── useScrollReveal hook ─────────────────────────────────────────────────────
const useScrollReveal = () => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If already in viewport on mount, show immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 } // increased threshold for later reveal
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
};

// ─── Nav ──────────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 48px',
      background: scrolled ? 'rgba(10,14,28,0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(0,104,255,0.15)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'Work Sans, sans-serif',
        fontSize: '22px', fontWeight: 700,
        color: '#2931ab', // match title color
        letterSpacing: '0.5px',
      }}>RELABTeams</div>

      {/* Admin Buttons — like Figma top-right */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <button style={adminBtnStyle}>
            <span style={{ fontSize: '14px' }}>🛡</span> Admin
          </button>
        </Link>
        <Link to="/platform-admin-login" style={{ textDecoration: 'none' }}>
          <button style={adminBtnStyle}>
            <span style={{ fontSize: '14px' }}>🛡</span> Platform Admin
          </button>
        </Link>
      </div>
    </nav>
  );
};

const adminBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '8px 18px', borderRadius: '8px',
  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  fontFamily: '"Work Sans", sans-serif',
  background: 'transparent',
  border: '1px solid rgba(77,166,255,0.5)',
  color: '#4da6ff',
  transition: 'all 0.2s ease',
};

const btnStyle = (variant) => ({
  padding: '8px 20px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: '"Work Sans", sans-serif',
  transition: 'all 0.2s ease',
  ...(variant === 'outline' ? {
    background: 'transparent',
    border: '1px solid rgba(77,166,255,0.6)',
    color: '#4da6ff',
  } : {
    background: 'linear-gradient(135deg, #0068FF, #0090ff)',
    border: 'none',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(0,104,255,0.4)',
  }),
});

const dropItemStyle = {
  padding: '13px 20px',
  color: '#cce4ff',
  fontSize: '14px',
  fontFamily: '"Work Sans", sans-serif',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
const Hero = () => (
  <section style={{
    marginTop: '80px', // add gap between navbar and hero section
    minHeight: 'unset', // remove forced 100vh
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    padding: '0 24px 0 24px',
    marginBottom: '32px', // reduce gap below hero
  }}>
    <h1 style={{
      fontFamily: 'Work Sans, sans-serif',
      fontSize: 'clamp(64px, 10vw, 140px)',
      fontWeight: 400, // thinner look
      color: '#2931ab',
      margin: 0, lineHeight: 1,
      textShadow: '0 2px 8px rgba(41,49,171,0.08)', // much lighter shadow
      animation: 'heroFadeIn 1s ease forwards',
    }}>RELABTeams</h1>

    <p style={{
      fontFamily: 'Cambria, Georgia, serif',
      fontSize: 'clamp(18px, 2.5vw, 32px)',
      color: 'rgba(255,255,255,0.85)', marginTop: '16px',
      fontStyle: 'italic',
      animation: 'heroFadeIn 1s ease 0.2s both',
    }}>"Creative minds unite through collaboration"</p>

    <p style={{
      maxWidth: '600px', marginTop: '24px',
      fontSize: '18px', color: 'rgba(255,255,255,0.6)',
      lineHeight: 1.7, fontFamily: '"Work Sans", sans-serif',
      animation: 'heroFadeIn 1s ease 0.4s both',
    }}>
      A platform where students collaborate on projects, solve doubts together,
      and connect with recruiters for exciting job opportunities.
    </p>
  </section>
);

// ─── Section wrapper with slide-in animation ──────────────────────────────────
const SlideSection = ({ children, direction = 'up', delay = 0, style = {} }) => {
  const [ref, visible] = useScrollReveal();

  const transforms = {
    up: 'translateY(50px)',
    left: 'translateX(-70px)',
    right: 'translateX(70px)',
  };

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : transforms[direction],
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
};

// ─── For Students ─────────────────────────────────────────────────────────────
const ForStudents = () => {
  const features = [
    { title: 'Create or Join Projects', desc: 'Start your own project as a team leader or join exciting projects created by peers.' },
    { title: 'Collaborate & Learn', desc: 'Work with talented students, solve doubts together, and gain hands-on experience.' },
    { title: 'Build Your Portfolio', desc: 'Showcase your projects and skills to recruiters looking for talented individuals.' },
    { title: 'Apply for Jobs', desc: 'Access job openings from recruiters and apply with your resume or platform profile.' },
  ];

  return (
    <section style={sectionStyle}>
      <div style={{ ...twoColStyle }}>
        {/* Left - always visible, no scroll animation */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'slideInLeft 0.7s ease 0.1s both' }}>
          <div style={{
            width: '100%', maxWidth: '480px', aspectRatio: '4/3',
            borderRadius: '16px', overflow: 'hidden',
            border: '1px solid rgba(0,104,255,0.25)',
            boxShadow: '0 0 40px rgba(0,104,255,0.15)',
            background: 'linear-gradient(135deg, #0a0e1c 0%, #0d1830 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '80px',
          }}><div style={{
  width: '100%', maxWidth: '480px', aspectRatio: '4/3',
  borderRadius: '16px', overflow: 'hidden',
  border: '1px solid rgba(0,104,255,0.25)',
  boxShadow: '0 0 40px rgba(0,104,255,0.15)',
  background: 'linear-gradient(135deg, #0a0e1c 0%, #0d1830 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '80px',
}}>
  <img src="../../images/landing_images/students.jpg" alt="For Students" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
</div></div>
        </div>

        {/* Right - always visible, no scroll animation */}
        <div style={{ flex: 1, animation: 'slideInRight 0.7s ease 0.2s both' }}>
          <h2 style={sectionHeadStyle}>For Students</h2>
          <p style={sectionBodyStyle}>
            Join a thriving community of innovative students who are building real-world
            projects and learning together. Whether you want to lead your own project
            or contribute to existing ones, RELABTeams is your launchpad to success.
          </p>
          <div style={{ marginTop: '28px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ ...featureRowStyle, animation: `slideInRight 0.6s ease ${0.3 + i * 0.1}s both` }}>
                <span style={checkStyle}>✓</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>{f.title}</div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '32px', flexWrap: 'wrap',
            animation: 'slideInRight 0.6s ease 0.75s both' }}>
            <Link to="/signup" style={{ textDecoration: 'none' }}>
              <button style={ctaBtnStyle('solid')}>Sign Up as Student →</button>
            </Link>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button style={ctaBtnStyle('outline')}>Already have an account? Login</button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Collaborative Projects ───────────────────────────────────────────────────
const CollabProjects = () => (
  <section style={sectionStyle}>
    <div style={{ ...twoColStyle }}>
      {/* Left - content */}
      <SlideSection direction="left" style={{ flex: 1 }}>
        <h2 style={{ ...sectionHeadStyle, fontSize: 'clamp(28px, 4vw, 48px)' }}>Collaborative Projects</h2>
        <p style={sectionBodyStyle}>
          Experience real teamwork by building projects that matter. From web
          applications to innovative solutions, create something amazing with your peers.
        </p>
        <div style={{ display: 'flex', gap: '20px', marginTop: '32px', flexWrap: 'wrap' }}>
          {[
            { icon: '📁', title: 'Team Projects', desc: 'Build together in teams' },
            { icon: '💬', title: 'Doubt Solving', desc: 'Get help from peers' },
          ].map((card, i) => (
            <SlideSection key={i} direction="up" delay={0.15 + i * 0.1} style={{ flex: 1, minWidth: '160px' }}>
              <div style={miniCardStyle}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{card.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>{card.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{card.desc}</div>
              </div>
            </SlideSection>
          ))}
        </div>
      </SlideSection>

      {/* Right - photo-like panel */}
      <SlideSection direction="right" delay={0.1} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            height: '400px', // fixed height for better image fit
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(0,104,255,0.25)',
            boxShadow: '0 0 40px rgba(0,104,255,0.15)',
            background: 'linear-gradient(135deg, #0a0e1c 0%, #0d1830 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="../../images/landing_images/projects.jpg"
            alt="Collaboration Projects"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </SlideSection>
    </div>
  </section>
);

// ─── For Recruiters ───────────────────────────────────────────────────────────
const ForRecruiters = () => {
  const features = [
    { title: 'Post Job Openings', desc: 'Share your job opportunities directly with talented students on the platform.' },
    { title: 'Browse Student Profiles', desc: "View detailed profiles showcasing students' projects, skills, and contributions." },
    { title: 'Review Applications', desc: 'Access resumes and platform portfolios to find the perfect match for your openings.' },
    { title: 'Connect with Talent', desc: 'Reach out to candidates and build your team with skilled professionals.' },
  ];

  return (
    <section style={sectionStyle}>
      <div style={twoColStyle}>
        {/* Left - content */}
        <SlideSection direction="left" style={{ flex: 1 }}>
          <h2 style={{ ...sectionHeadStyle, color: '#2dd4bf' }}>For Recruiters</h2>
          <p style={sectionBodyStyle}>
            Find exceptional talent from a pool of skilled students who have proven their
            abilities through real projects. Post job openings and connect with candidates
            who are ready to make an impact.
          </p>
          <div style={{ marginTop: '28px' }}>
            {features.map((f, i) => (
              <SlideSection key={i} direction="left" delay={0.1 + i * 0.08}>
                <div style={featureRowStyle}>
                  <span style={{ ...checkStyle, color: '#2dd4bf', borderColor: '#2dd4bf' }}>✓</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>{f.title}</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                </div>
              </SlideSection>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '32px', flexWrap: 'wrap' }}>
            <Link to="/signupforrec" style={{ textDecoration: 'none' }}>
              <button style={ctaBtnStyle('teal')}>Join as Recruiter →</button>
            </Link>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button style={ctaBtnStyle('outline-teal')}>Recruiter Login</button>
            </Link>
          </div>
        </SlideSection>

        {/* Right - photo panel */}
        <SlideSection direction="right" delay={0.15} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              height: '400px', // fixed height for better image fit
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(45,212,191,0.2)',
              boxShadow: '0 0 60px rgba(45,212,191,0.1)',
              background: 'linear-gradient(160deg, #080e1a 0%, #0a1525 40%, #0c1e30 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="../../images/landing_images/recruiters.jpg"
              alt="For Recruiters"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </SlideSection>
      </div>
    </section>
  );
};

// ─── Features Grid ────────────────────────────────────────────────────────────
const FeaturesGrid = () => {
  const features = [
    { icon: '📁', title: 'Project Collaboration', desc: 'Create your own projects or join existing ones. Work together with talented students from around the world.' },
    { icon: '👥', title: 'Team Leadership', desc: 'Lead your own team as a project creator or contribute as a valuable team member. Build real-world experience.' },
    { icon: '💬', title: 'Doubt Solving', desc: 'Get help from peers and mentors. Share knowledge and solve problems together in a collaborative environment.' },
    { icon: '💼', title: 'Job Opportunities', desc: 'Recruiters post job openings directly on the platform. Find your dream job and connect with top companies.' },
    { icon: '📄', title: 'Resume & Profile', desc: 'Build your professional profile on the platform. Apply to jobs with your resume or showcase your platform portfolio.' },
    { icon: '👤', title: 'Recruiter Dashboard', desc: 'Recruiters can view student profiles, track applications, and find the perfect candidates for their openings.' },
  ];

  return (
    <section style={{ ...sectionStyle, paddingBottom: '120px' }}>
      <SlideSection direction="up">
        <h2 style={{
          textAlign: 'center', fontFamily: '"Work Sans", sans-serif',
          fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700,
          color: '#fff', marginBottom: '64px',
        }}>Everything You Need in One Platform</h2>
      </SlideSection>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px', maxWidth: '1100px', margin: '0 auto',
        padding: '0 24px',
      }}>
        {features.map((f, i) => (
          <SlideSection key={i} direction="up" delay={i * 0.07}>
            <div style={featureCardStyle}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(0,104,255,0.15)',
                border: '1px solid rgba(0,104,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', marginBottom: '16px',
              }}>{f.icon}</div>
              <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, marginBottom: '10px', fontFamily: '"Work Sans", sans-serif' }}>{f.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
            </div>
          </SlideSection>
        ))}
      </div>
    </section>
  );
};

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer style={{
    borderTop: '1px solid rgba(0,104,255,0.15)',
    padding: '60px 48px 30px',
    background: 'rgba(0,0,0,0.3)',
  }}>
    <div style={{
      display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap',
      maxWidth: '1100px', margin: '0 auto', gap: '40px',
    }}>
      {[
        { title: 'RELABTeams', links: [{ label: 'About Us', to: '/about' }, { label: 'Contact', to: '/contact' }, { label: 'Careers', to: '/careers' }] },
        { title: 'Quick Links', links: [{ label: 'Doubt Board', to: '/doubt' }, { label: 'Projects', to: '/project' }, { label: 'Jobs', to: '/apply' }] },
        { title: 'Follow Us', links: [] },
      ].map((col, i) => (
        <div key={i}>
          <h3 style={{ color: '#4da6ff', fontFamily: '"Work Sans", sans-serif', fontSize: '16px', marginBottom: '16px' }}>{col.title}</h3>
          {col.links.map((l, j) => (
            <div key={j} style={{ marginBottom: '10px' }}>
              <Link to={l.to} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}>{l.label}</Link>
            </div>
          ))}
          {col.title === 'Follow Us' && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              {['fb', 'tw', 'ig', 'li'].map(s => (
                <a key={s} href="#" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px', transition: 'color 0.2s' }}>●</a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
    <div style={{
      textAlign: 'center', marginTop: '40px', paddingTop: '20px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      color: 'rgba(255,255,255,0.35)', fontSize: '13px',
      fontFamily: '"Work Sans", sans-serif',
    }}>© 2024 RELABTeams. All Rights Reserved.</div>
  </footer>
);

// ─── Shared styles ────────────────────────────────────────────────────────────
const sectionStyle = {
  padding: '100px 24px',
  maxWidth: '1200px',
  margin: '0 auto',
};

const twoColStyle = {
  display: 'flex',
  gap: '64px',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const sectionHeadStyle = {
  fontFamily: '"Work Sans", sans-serif',
  fontSize: 'clamp(28px, 4vw, 44px)',
  fontWeight: 700, color: '#4da6ff',
  marginBottom: '20px', marginTop: 0,
};

const sectionBodyStyle = {
  fontSize: '16px', color: 'rgba(255,255,255,0.65)',
  lineHeight: 1.8, fontFamily: '"Work Sans", sans-serif',
  maxWidth: '540px',
};

const featureRowStyle = {
  display: 'flex', gap: '14px', alignItems: 'flex-start',
  marginBottom: '20px',
};

const checkStyle = {
  flexShrink: 0,
  width: '22px', height: '22px', borderRadius: '50%',
  border: '2px solid #4da6ff',
  color: '#4da6ff', fontSize: '12px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginTop: '2px',
};

const ctaBtnStyle = (variant) => {
  const map = {
    solid: { bg: 'linear-gradient(135deg, #0068FF, #0090ff)', color: '#fff', border: 'none', shadow: '0 4px 20px rgba(0,104,255,0.4)' },
    outline: { bg: 'transparent', color: '#4da6ff', border: '1px solid rgba(77,166,255,0.5)', shadow: 'none' },
    teal: { bg: 'linear-gradient(135deg, #0d9488, #14b8a6)', color: '#fff', border: 'none', shadow: '0 4px 20px rgba(20,184,166,0.35)' },
    'outline-teal': { bg: 'transparent', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.5)', shadow: 'none' },
  };
  const v = map[variant];
  return {
    padding: '12px 24px', borderRadius: '10px',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    fontFamily: '"Work Sans", sans-serif',
    background: v.bg, color: v.color, border: v.border,
    boxShadow: v.shadow, transition: 'all 0.2s ease',
  };
};

const miniCardStyle = {
  padding: '20px', borderRadius: '12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(0,104,255,0.2)',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

const featureCardStyle = {
  padding: '28px', borderRadius: '14px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(0,104,255,0.15)',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
  cursor: 'default',
};

// ─── Root Landing ─────────────────────────────────────────────────────────────
const Landing = () => {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    initializeParticles();
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080e1a', overflowX: 'hidden' }}>
      {/* Global styles injected inline */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080e1a; }
        #particles-js { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        @keyframes heroFadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-70px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(70px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        a { color: inherit; }
      `}</style>

      <div id="particles-js" />

      {/* All content above particles */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <Hero />
        <ForStudents />
        <CollabProjects />
        <ForRecruiters />
        <FeaturesGrid />
        <Footer />
      </div>

      {/* Go to top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: '28px', right: '28px', zIndex: 300,
            padding: '12px 20px', borderRadius: '8px',
            background: '#0068FF', color: '#fff', border: 'none',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            fontFamily: '"Work Sans", sans-serif',
            boxShadow: '0 4px 20px rgba(0,104,255,0.5)',
            transition: 'transform 0.2s',
          }}
        >↑ Top</button>
      )}
    </div>
  );
};

export default Landing;
