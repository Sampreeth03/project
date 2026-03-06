// config/constants.js

// 1. Database URI (MongoDB Atlas)
const MONGODB_URI = 'mongodb+srv://relabUser:Srih12345@cluster0.cnc1zfo.mongodb.net/page-check?retryWrites=true&w=majority&appName=Cluster0';
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