// config/constants.js

// 1. Database URI (MongoDB Atlas)
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEV_MONGODB_URI = 'mongodb://127.0.0.1:27017/relabteams';
const MONGODB_URI = process.env.MONGODB_URI || (IS_PRODUCTION ? '' : DEV_MONGODB_URI);

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required when NODE_ENV=production');
}
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
    userNav,
    navData: userNav, 
    topics,
    topicNormalizationMap
};