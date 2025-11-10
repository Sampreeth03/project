// services/helperService.js

const { navData } = require('../config/constants'); // We need navData here for getNavLinks

// 1. Password Validation Utility
const validatePassword = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
    return regex.test(password);
};

// 2. Time Ago Utility
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
}

// 3. Navigation Links Generator (Crucial for your navbar issue!)
function getNavLinks(user) {
    const links = [
        { href: '/dashboard', name: 'Dashboard' },
        {
            href: '#',
            name: 'Projects',
            submenu: [
                { href: '/project', name: 'My Created Projects' },
                { href: '/joined-projects', name: 'Joined Projects' }
            ]
        },
        {
            href: '#',
            name: 'Topics',
            submenu: [
                { href: '/cyb', name: 'Cyber Security' },
                { href: '/blockchain', name: 'Blockchain' },
                { href: '/ds', name: 'Data Science' },
                { href: '/dl', name: 'Deep Learning' },
                { href: '/robo', name: 'Robotics' },
                { href: '/web-dev', name: 'Web Development' }
            ]
        },
        { href: '/not', name: 'Notifications' }
    ];

    if (user.role === 'admin') {
        links.push({ href: '/admin', name: 'Admin Panel' });
    }

    if (user.role === 'recruiter') {
        links.push({ href: '/recruiter', name: 'Recruiter Dashboard' });
    }

    links.push({ href: '/logout', name: 'Logout' });

    return links;
}

module.exports = {
    validatePassword,
    getTimeAgo,
    getNavLinks
};