import React, { useState } from 'react';
import Navbar from '../User/NavBar.jsx';
import UserFooter from '../User/UserFooter.jsx';
import '../../styles/ContactUs.css';

const ContactUs = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            alert('Please fill all fields');
            return;
        }

        const mailtoLink = `mailto:relabteams@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
            `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
        )}`;

        // Uses default email client (Outlook/mail app) instead of opening Gmail web compose.
        window.location.href = mailtoLink;

        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSubmitted(false), 3000);
    };

    const emailClick = () => {
        window.location.href = 'mailto:relabteams@gmail.com?subject=Hello RelabTeams';
    };

    const primaryContactEmail = 'relabteams@gmail.com';

    const contactInfo = [
        {
            icon: '📧',
            label: 'Email',
            value: 'relabteams@gmail.com',
            action: emailClick
        },
        {
            icon: '📱',
            label: 'Phone',
            value: '+91 98765 43210'
        },
        {
            icon: '📍',
            label: 'Address',
            value: '123 Relab Street, Tech City, India'
        },
        {
            icon: '⏰',
            label: 'Support Hours',
            value: 'Mon - Sat, 9:00 AM to 7:00 PM'
        }
    ];

    const featureCards = [
        { icon: '🎯', title: 'Project Matching' },
        { icon: '🧠', title: 'Mentor Guidance' },
        { icon: '💼', title: 'Recruiter Access' },
        { icon: '🤝', title: 'Team Collaboration' },
        { icon: '📈', title: 'Career Growth' },
        { icon: '⚡', title: 'Fast Support' }
    ];

    const galleryImages = [
        { src: '/images/landing_images/students.jpg', alt: 'Students collaborating in a learning environment' },
        { src: '/images/landing_images/projects.jpg', alt: 'Learners working on project-based tasks' },
        { src: '/images/landing_images/recruiters.jpg', alt: 'Recruiters and students discussing opportunities' }
    ];

    return (
        <>
            <Navbar />
            <div className="contact-us-container">
                <div className="contact-content">
                    <section className="hero-section">
                        <div className="hero-grid">
                            <div className="hero-text">
                                <p className="hero-kicker">RELAB CONTACT</p>
                                <h1 className="hero-title">
                                    <span className="title-word">Let&apos;s Build Better</span>
                                    <span className="title-word">Projects and Careers</span>
                                    <span className="title-word">Together.</span>
                                </h1>
                                <p className="hero-subtitle">
                                    Ask anything about projects, collaboration, mentorship, jobs, or platform support.
                                </p>
                            </div>

                            <div className="hero-gallery">
                                {galleryImages.map((image, index) => (
                                    <div className="hero-image-card" key={index}>
                                        <img src={image.src} alt={image.alt} loading="lazy" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="contact-email-strip">
                        <p className="contact-email-label">CONTACT US</p>
                        <a href={`mailto:${primaryContactEmail}`} className="contact-email-link">
                            {primaryContactEmail}
                        </a>
                        <p className="contact-email-note">We usually respond within 24 hours.</p>
                    </section>

                    <div className="contact-main">
                        <section className="contact-info-grid">
                            <h2 className="section-title">Get In Touch</h2>
                            <div className="info-cards-container">
                                {contactInfo.map((info, index) => (
                                    <div
                                        key={index}
                                        className="info-card"
                                        onClick={info.action}
                                        style={{
                                            cursor: info.action ? 'pointer' : 'default'
                                        }}
                                    >
                                        <div className="info-icon">{info.icon}</div>
                                        <h3>{info.label}</h3>
                                        <p className={info.action ? 'clickable' : ''}>{info.value}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="form-social-container">
                            <section className="contact-form-section">
                                <h2 className="section-title">Send Us A Message</h2>
                                <form className="contact-form" onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                name="name"
                                                placeholder="Your Name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                onFocus={() => setFocusedField('name')}
                                                onBlur={() => setFocusedField(null)}
                                                className={focusedField === 'name' ? 'focused' : ''}
                                            />
                                            <div className="input-underline"></div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <div className="input-wrapper">
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="Your Email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                onFocus={() => setFocusedField('email')}
                                                onBlur={() => setFocusedField(null)}
                                                className={focusedField === 'email' ? 'focused' : ''}
                                            />
                                            <div className="input-underline"></div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                name="subject"
                                                placeholder="Subject"
                                                value={formData.subject}
                                                onChange={handleInputChange}
                                                onFocus={() => setFocusedField('subject')}
                                                onBlur={() => setFocusedField(null)}
                                                className={focusedField === 'subject' ? 'focused' : ''}
                                            />
                                            <div className="input-underline"></div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <div className="textarea-wrapper">
                                            <textarea
                                                name="message"
                                                placeholder="Your Message"
                                                value={formData.message}
                                                onChange={handleInputChange}
                                                onFocus={() => setFocusedField('message')}
                                                onBlur={() => setFocusedField(null)}
                                                rows="5"
                                                className={focusedField === 'message' ? 'focused' : ''}
                                            ></textarea>
                                            <div className="input-underline"></div>
                                        </div>
                                    </div>

                                    <button type="submit" className="submit-button">
                                        <span className="button-text">Send Message</span>
                                        <span className="button-icon">→</span>
                                    </button>

                                    {submitted && (
                                        <div className="success-message">
                                            Email client opened with your message.
                                        </div>
                                    )}
                                </form>
                            </section>

                            <section className="social-section">
                                <h2 className="section-title">How We Can Help</h2>
                                <p className="social-subtitle">From learning support to hiring, we help at every stage.</p>
                                <div className="social-links-container">
                                    {featureCards.map((item, index) => (
                                        <div className="social-link" key={index}>
                                            <span className="social-icon">{item.icon}</span>
                                            <span className="social-name">{item.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>

                    <section className="faq-section">
                        <h2 className="section-title">Frequently Asked Questions</h2>
                        <div className="faq-container">
                            {[
                                {
                                    q: 'What is RelabTeams?',
                                    a: 'RelabTeams is a collaboration platform where learners build practical projects, connect with mentors, and access career opportunities.'
                                },
                                {
                                    q: 'How quickly will you respond?',
                                    a: 'Our team typically responds within 24 hours on business days.'
                                },
                                {
                                    q: 'Do you offer technical support?',
                                    a: 'Yes. We help with project workflow, team collaboration, and platform usage support.'
                                },
                                {
                                    q: 'Can I partner with RelabTeams?',
                                    a: 'Absolutely. Reach out through our contact email and we will connect with you.'
                                }
                            ].map((faq, index) => (
                                <details key={index} className="faq-item">
                                    <summary className="faq-question">{faq.q}</summary>
                                    <p className="faq-answer">{faq.a}</p>
                                </details>
                            ))}
                        </div>
                    </section>

                </div>

                <UserFooter />
            </div>
        </>
    );
};

export default ContactUs;
