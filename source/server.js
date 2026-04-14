// Load environment variables from .env file
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

// Imports the configured Express app and the database connection logic
const app = require("./app");

const { connectDB } = require("./config/database");

const { corsOptions } = require('./middleware/securityMiddleware');
const { setupChatSocket } = require('./sockets/chatSocket');
const { verifyToken, COOKIE_NAME } = require('./config/jwt');
const { initRedisCache } = require('./services/redisCacheService');

const PORT = Number(process.env.PORT) || 5000;

// Connect to the database
connectDB();
initRedisCache();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: corsOptions.origin,
        methods: corsOptions.methods,
        credentials: true
    }
});

// JWT-based socket authentication middleware
io.use((socket, next) => {
    try {
        const cookieHeader = socket.request.headers.cookie || '';
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`))
        const token = match?.[1];
        if (!token) return next(new Error('Authentication required'));
        const payload = verifyToken(token);
        if (!payload) return next(new Error('Invalid or expired token'));
        socket.data.user = payload;
        socket.data.userId = payload.id;
        next();
    } catch (err) {
        next(new Error('Socket authentication failed'));
    }
});

app.set('io', io);
setupChatSocket(io);

httpServer.listen(PORT, () => {
    console.log(`Express API is running on http://localhost:${PORT}`);
});