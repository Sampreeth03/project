// Load environment variables from .env file
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

// Imports the configured Express app and the database connection logic
const { app, sessionMiddleware } = require("./app");

const { connectDB } = require("./config/database");

const { corsOptions } = require('./middleware/securityMiddleware');
const { setupChatSocket } = require('./sockets/chatSocket');

const PORT = 5000;

// Connect to the database
connectDB();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: corsOptions.origin,
        methods: corsOptions.methods,
        credentials: true
    }
});

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

app.set('io', io);
setupChatSocket(io);

httpServer.listen(PORT, () => {
    console.log(`Express API is running on http://localhost:${PORT}`);
});