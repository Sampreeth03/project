const express = require("express");
const swaggerUi = require('swagger-ui-express');
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const SwaggerParser = require("@apidevtools/swagger-parser");

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const platformAdminRoutes = require('./routes/platformAdminRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes'); 
const projectRoutes = require('./routes/projectRoutes');
const doubtRoutes = require('./routes/doubtRoutes');
const jobRoutes = require('./routes/jobRoutes');
const messageRoutes = require('./routes/messageRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Import config and middleware
const { topics, topicNormalizationMap } = require("./config/constants"); 
const { validatePassword, getTimeAgo } = require("./services/helperService"); 
const { upload } = require("./middleware/uploadMiddleware");
const { globalLimiter, helmetConfig, corsOptions } = require("./middleware/securityMiddleware");
const { morganMiddleware } = require("./middleware/loggingMiddleware");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");
const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Task, Notification } = require("./database"); 

const app = express();
const swaggerSpecPath = path.join(__dirname, "../docs/swagger/member4-openapi.yaml");
let bundledSwaggerDocument = null;
let swaggerUiHandler = (req, res) => {
	res.status(503).json({
		success: false,
		message: 'Swagger documentation is loading. Please refresh in a moment.',
	});
};

// Security headers
app.use(helmetConfig);

// CORS configuration
app.use(cors(corsOptions));

// Logging middleware
app.use(morganMiddleware);

// Global rate limiting
app.use(globalLimiter);

// Request parsers
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Cookie parser (required for JWT httpOnly cookie auth)
app.use(cookieParser());

// Swagger UI (SmartBear) documentation route
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', (req, res, next) => swaggerUiHandler(req, res, next));

SwaggerParser.bundle(swaggerSpecPath)
	.then((swaggerDocument) => {
		bundledSwaggerDocument = swaggerDocument;
		swaggerUiHandler = swaggerUi.setup(swaggerDocument);
	})
	.catch((error) => {
		console.error('Failed to bundle OpenAPI spec for Swagger UI:', error.message);
		swaggerUiHandler = (req, res) => {
			res.status(500).json({
				success: false,
				message: 'Swagger documentation failed to load',
				error: error.message,
			});
		};
	});

// Mount API routes
app.get('/api-docs.json', (req, res) => {
	if (!bundledSwaggerDocument) {
		return res.status(503).json({
			success: false,
			message: 'Swagger documentation is loading. Please refresh in a moment.',
		});
	}
	res.json(bundledSwaggerDocument);
});

app.use('/api', authRoutes); 
app.use('/api', adminRoutes);
app.use('/api', platformAdminRoutes);
app.use('/api', recruiterRoutes); 
app.use('/api', userRoutes);
app.use('/api', projectRoutes);
app.use('/api', doubtRoutes);
app.use('/api', jobRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payment', paymentRoutes);

// 404 handler (API)
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;