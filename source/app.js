const express = require("express");
const swaggerUi = require("swagger-ui-express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const platformAdminRoutes = require("./routes/platformAdminRoutes");
const recruiterRoutes = require("./routes/recruiterRoutes");
const projectRoutes = require("./routes/projectRoutes");
const doubtRoutes = require("./routes/doubtRoutes");
const jobRoutes = require("./routes/jobRoutes");
const messageRoutes = require("./routes/messageRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const searchRoutes = require("./routes/searchRoutes");

// Import config and middleware
const { topics, topicNormalizationMap } = require("./config/constants");
const { validatePassword, getTimeAgo } = require("./services/helperService");
const { upload } = require("./middleware/uploadMiddleware");
const {
	globalLimiter,
	helmetConfig,
	corsOptions,
} = require("./middleware/securityMiddleware");
const { morganMiddleware } = require("./middleware/loggingMiddleware");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");
const {
	User,
	UserMetrics,
	Doubt,
	Reply,
	JobApplication,
	Project,
	ProjectMember,
	JoinRequest,
	Task,
	Notification,
} = require("./database");
const { swaggerSpec } = require("./config/swagger");

const app = express();

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

const swaggerRoot = path.resolve(__dirname, "docs", "swagger");
const member1OpenApiFile = path.join(swaggerRoot, "member1-openapi.yaml");
const member1OpenApiBundleFile = path.join(swaggerRoot, "member1-openapi.bundle.yaml");
const member5OpenApiFile = path.resolve(__dirname, "docs", "openapi.yaml");
const member2OpenApiBundleFile = path.join(swaggerRoot, "member2-openapi.bundle.yaml");
const member3OpenApiBundleFile = path.join(swaggerRoot, "member3-openapi.bundle.yaml");
const member4OpenApiFile = path.join(swaggerRoot, "member4-openapi.yaml");
const member4OpenApiBundleFile = path.join(swaggerRoot, "member4-openapi.bundle.yaml");

app.get("/api/docs/member1-openapi.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member1OpenApiFile);
});

app.get("/api/docs/member1-openapi.bundle.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member1OpenApiBundleFile);
});

app.get("/api/docs/member2-openapi.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member2OpenApiBundleFile);
});

app.get("/api/docs/member2-openapi.bundle.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member2OpenApiBundleFile);
});

app.get("/api/docs/member3-openapi.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member3OpenApiBundleFile);
});

app.get("/api/docs/member3-openapi.bundle.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member3OpenApiBundleFile);
});

app.get("/api/docs/member4-openapi.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member4OpenApiFile);
});

app.get("/api/docs/member4-openapi.bundle.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member4OpenApiBundleFile);
});

app.get("/api/docs/member5-openapi.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member5OpenApiFile);
});

app.get("/api/docs/member5-openapi.bundle.yaml", (req, res) => {
	res.set("Cache-Control", "no-store");
	res.sendFile(member5OpenApiFile);
});

app.get("/api/docs-home", (req, res) => {
	res.type("html").send(`<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>RELABTeams API Docs Home</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #0b1118; color: #e9f0f7; }
		main { max-width: 920px; margin: 48px auto; padding: 0 20px; }
		h1 { margin: 0 0 10px; font-size: 30px; }
		p { color: #b8c7d7; margin: 0 0 24px; }
		.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
		a.card { display: block; padding: 18px; border: 1px solid #243246; border-radius: 12px; text-decoration: none; color: #e9f0f7; background: #101923; }
		a.card:hover { border-color: #3a84d8; background: #132133; }
		.hint { margin-top: 18px; color: #90a9c2; }
	</style>
</head>
<body>
	<main>
		<h1>RELABTeams API Docs</h1>
		<p>Select a member-specific API spec from below.</p>
		<div class="cards">
			<a class="card" href="/api/docs?urls.primaryName=Member%201%20User%20APIs">
				<strong>Member 1 User APIs</strong>
				<div>User home, dashboard, profile, and friends endpoints.</div>
			</a>
			<a class="card" href="/api/docs?urls.primaryName=Member%202%20Project%20APIs">
				<strong>Member 2 Project APIs</strong>
				<div>Projects, tasks, doubts, topic and join-request flows.</div>
			</a>
			<a class="card" href="/api/docs?urls.primaryName=Member%203%20Job%20and%20Recruiter%20APIs">
				<strong>Member 3 Job and Recruiter APIs</strong>
				<div>Recruiter dashboard, jobs, applications, notifications.</div>
			</a>
			<a class="card" href="/api/docs?urls.primaryName=Member%204%20Admin%2C%20Auth%20and%20Doubt%20APIs">
				<strong>Member 4 Admin, Auth and Doubt APIs</strong>
				<div>Admin dashboard, authentication, and doubt APIs for Member 4.</div>
			</a>
			<a class="card" href="/api/docs?urls.primaryName=Member%205%20Platform%20Admin%20APIs">
				<strong>Member 5 Platform Admin APIs</strong>
				<div>Platform admin authentication and recruiter verification APIs.</div>
			</a>
		</div>
		<div class="hint">Use the top search filter in Swagger to quickly find endpoints.</div>
	</main>
</body>
</html>`);
});

app.use("/api/docs/paths", express.static(path.join(swaggerRoot, "paths")));
app.use("/api/docs/components", express.static(path.join(swaggerRoot, "components")));

app.use(
	"/api/docs",
	swaggerUi.serve,
	swaggerUi.setup(null, {
		explorer: true,
		customSiteTitle: "RELABTeams API Docs Home",
		swaggerOptions: {
			filter: true,
			withCredentials: true,
			persistAuthorization: true,
			urls: [
				{ url: "/api/docs/member1-openapi.bundle.yaml?v=20260402", name: "Member 1 User APIs" },
				{ url: "/api/docs/member2-openapi.bundle.yaml?v=20260402", name: "Member 2 Project APIs" },
				{ url: "/api/docs/member3-openapi.bundle.yaml?v=20260402", name: "Member 3 Job and Recruiter APIs" },
				{ url: "/api/docs/member4-openapi.bundle.yaml?v=20260402", name: "Member 4 Admin, Auth and Doubt APIs" },
				{ url: "/api/docs/member5-openapi.bundle.yaml?v=20260402", name: "Member 5 Platform Admin APIs" },
			],
			"urls.primaryName": "Member 1 User APIs",
		},
	})
);

app.get("/api-docs", (req, res) => res.redirect("/api/docs"));
app.get("/api-docs/", (req, res) => res.redirect("/api/docs"));
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

// Mount API routes
app.use("/api", authRoutes);
app.use("/api", adminRoutes);
app.use("/api", platformAdminRoutes);
app.use("/api", recruiterRoutes);
app.use("/api", userRoutes);
app.use("/api", projectRoutes);
app.use("/api", doubtRoutes);
app.use("/api", jobRoutes);
app.use("/api", searchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payment", paymentRoutes);

// 404 handler (API)
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
