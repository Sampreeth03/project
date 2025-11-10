// config/constants.js

// 1. Database URI
const MONGODB_URI = 'mongodb://localhost:27017/page-check';

// 2. Navigation Data (navData and userNav)
const navData = {
    homeUrl: "/home",
    navLinks: [
        { name: "Home", href: "/home" },
        { name: "Clear Doubts", href: "/clear" },
        {
            name: "Projects",
            href: "#",
            submenu: [
                { name: "Projects", href: "/project" },
                {name: "Joined Projects",href:"/joined-projects"},
                { name: "Interact", href: "/messages" }
            ]
        },
        {
            name: "Notifications",
            href: "/not",
            submenu: [
                { name: "Project Notifications", href: "/not" },
                { name: "Job Notifications", href: "/job_not" }
            ]
        },
        {
            name: "Jobs",
            href: "/apply",
            submenu: [
                { name: "Apply for Jobs", href: "/apply" },
                { name: "Your Applications", href: "/job" }
            ]
        },
        {
            name: "You",
            href: "/dashboard",
            submenu: [
                { name: "Dashboard", href: "/dashboard" },
                { name: "Profile", href: "/profile" }
            ]
        },
        { name: "FAQ", href: "/FAQ" }
    ]
};

const userNav = {
    homeUrl: "/home",
    navLinks: [
        { name: "Home", href: "/home" },
        { name: "Projects", href: "/project" },
        { name: "Doubts", href: "/doubt" },
        { name: "Jobs", href: "/apply" },
        {
            name: "Profile",
            href: "/profile",
            submenu: [
                { name: "Profile", href: "/profile" },
                { name: "Dashboard", href: "/dashboard" }
            ]
        }
    ]
};

// 3. Topic Maps
const topics = {
    '/blockchain': { file: 'blockchain', topic: 'Blockchain' },
    '/cyb': { file: 'cyber-security', topic: 'Cyber Security' },
    '/ds': { file: 'data-science', topic: 'Data Science' },
    '/dl': { file: 'deep-learning', topic: 'Deep Learning' },
    '/web-dev': { file: 'web-dev', topic: 'Web Development' },
    '/robo': { file: 'robotics', topic: 'Robotics' }
};

const topicNormalizationMap = {
    'blockchain': 'Blockchain',
    'cyber-security': 'Cyber Security',
    'data-science': 'Data Science',
    'deep-learning': 'Deep Learning',
    'web-dev': 'Web Development',
    'robotics': 'Robotics',
    'deep learning': 'Deep Learning',
    'data science': 'Data Science',
    'web development': 'Web Development',
    'cyber security': 'Cyber Security'
};

module.exports = {
    MONGODB_URI,
    navData,
    userNav,
    topics,
    topicNormalizationMap
};