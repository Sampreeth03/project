// config/database.js

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Import all models (we will assume they are in ./models/index for now)
// For this step, we keep the original way of importing models
const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Notification } = require("../database"); // Adjust path later if models move

const { MONGODB_URI } = require('./constants'); // Import MONGODB_URI

// --- Data Setup Functions (Extracted) ---

async function setupDefaultProjects() {
    try {
        const srihesh = await User.findOne({ name: 'Srihesh' });
        const priya = await User.findOne({ name: 'Priya' });

        if (!srihesh || !priya) {
            console.warn('Skipping default projects setup: Default users (Srihesh or Priya) not found.');
            return;
        }

        const defaultProjects = [
            {
                title: 'RelabTeams',
                description: 'RelabTeam is a shared immutable ledger that facilitates the process of recording transactions and tracking assets across a business network',
                capacity: 5,
                user_id: srihesh._id,
                status: 'active',
                topic: 'Web Development',
                deadline: new Date('2023-12-31'),
                created_at: new Date()
            }
        ];

        for (const projectData of defaultProjects) {
            const existingProject = await Project.findOne({ title: projectData.title, user_id: projectData.user_id });
            if (!existingProject) {
                const project = await Project.create(projectData);
                console.log(`Created default project: ${project.title} for user ${project.user_id}`);

                await ProjectMember.create({
                    project_id: project._id,
                    user_id: project.user_id,
                    joined_at: new Date()
                });
                console.log(`Added creator as member for project: ${project.title}`);

                await UserMetrics.findOneAndUpdate(
                    { user_id: project.user_id },
                    { $inc: { active_projects: 1, leadership_roles: 1, total_collaborations: 1 } },
                    { upsert: true }
                );
                console.log(`Updated UserMetrics for user ${project.user_id}`);
            } else {
                console.log(`Project ${projectData.title} already exists, skipping creation`);
            }
        }
    } catch (err) {
        console.error('Error setting up default projects:', err.message);
    }
}

async function updateReplies() {
    try {
        // Assume connection is already established or handled by the caller
        console.log('Running reply migration...');
        const replies = await Reply.find({ user_id: { $exists: false } }).populate("doubt_id");
        for (const reply of replies) {
            if (reply.doubt_id && reply.doubt_id.user_id) {
                await Reply.updateOne(
                    { _id: reply._id },
                    { $set: { user_id: reply.doubt_id.user_id } }
                );
                console.log(`Updated reply ${reply._id} with user_id`);
            }
        }
        console.log("Replies updated with user_id field");
    } catch (err) {
        console.error("Error updating replies:", err.message);
    }
}


async function setupDefaultUsers() {
    const saltRounds = 10;
    try {
        const defaultUsers = [
            {
                name: 'Srihesh',
                email: 'srihesh@gm.co',
                password: await bcrypt.hash('Srih@12345', saltRounds),
                role: 'user',
                verified: true,
            },
            {
                name: 'Priya',
                email: 'priya@gm.co',
                password: await bcrypt.hash('Srih@12345', saltRounds),
                role: 'user',
                verified: true,
            },
            {
                name: 'Shiva',
                email: 'shiva@gm.co',
                password: await bcrypt.hash('Srih@12345', saltRounds),
                role: 'recruiter',
                verified: true,
            },
            {
                name: 'Arjun',
                email: 'arjun@gm.co',
                password: await bcrypt.hash('Srih@12345', saltRounds),
                role: 'admin',
                verified: true,
            },
        ];

        for (const userData of defaultUsers) {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                const user = await User.create(userData);
                console.log(`Created default ${userData.role}: ${userData.email}`);
                if (userData.role !== 'admin') {
                    await UserMetrics.create({ user_id: user._id });
                    console.log(`Created UserMetrics for ${userData.email}`);
                }
            } else {
                console.log(`User ${userData.email} already exists, skipping creation`);
            }
        }
    } catch (err) {
        console.error('Error setting up default users:', err.message);
    }
}

async function updateDoubts() {
    try {
        const doubts = await Doubt.find({ author: { $exists: false } }).populate("user_id");
        for (const doubt of doubts) {
            if (doubt.user_id) {
                await Doubt.updateOne(
                    { _id: doubt._id },
                    { $set: { author: doubt.user_id.name } }
                );
                console.log(`Updated doubt ${doubt._id} with author: ${doubt.user_id.name}`);
            } else {
                console.log(`Doubt ${doubt._id} has no user_id, skipping`);
            }
        }
        console.log("Doubts updated with author field");
    } catch (err) {
        console.error("Error updating doubts:", err.message);
    }
}

async function migrateJobApplications() {
    try {
        const applications = await JobApplication.find({ date_applied: { $exists: false } });
        for (const app of applications) {
            app.date_applied = app.createdAt || new Date(); 
            await app.save();
        }
        console.log('Job application date_applied migration completed');
    } catch (err) {
        console.error('Job application date_applied migration failed:', err.message);
    }
}


// --- Main Connection Function ---

function connectDB() {
    mongoose.connect(MONGODB_URI)
        .then(async () => {
            console.log('Connected to MongoDB');
            
            // Run setup/migrations that require a connection
            await updateReplies();
            await setupDefaultUsers();
            await setupDefaultProjects();
            await updateDoubts();
            await migrateJobApplications();

        })
        .catch(err => {
            console.error('Error connecting to MongoDB:', err.message);
            process.exit(1);
        });
}

module.exports = { connectDB };