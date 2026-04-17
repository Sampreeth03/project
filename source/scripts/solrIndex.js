require('dotenv').config();

const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/constants');
const { User, Project, JobApplication } = require('../database');
const { SOLR_COLLECTIONS } = require('../config/solr');
const { mapUserToSolrDoc, mapProjectToSolrDoc, mapJobToSolrDoc, isJobPosting } = require('../services/solrMappers');
const {
    ensureSolrRunning,
    ensureCollections,
    clearCollection,
    addDocuments,
    commitCollection,
    chunk
} = require('./solrUtils');

const BATCH_SIZE = 200;

const connectMongo = async () => {
    if (mongoose.connection.readyState === 1) return;

    await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        autoIndex: false
    });
};

const indexCollection = async ({ collection, docs, mapper }) => {
    const mappedDocs = docs.map(mapper).filter((item) => item.id);
    const batches = chunk(mappedDocs, BATCH_SIZE);

    for (const batch of batches) {
        await addDocuments(collection, batch);
    }

    await commitCollection(collection);
    return mappedDocs.length;
};

const runSolrIndex = async ({ closeConnection = true } = {}) => {
    const collections = [SOLR_COLLECTIONS.users, SOLR_COLLECTIONS.projects, SOLR_COLLECTIONS.jobs];

    try {
        console.log('[solr:index] Connecting to MongoDB...');
        await connectMongo();

        console.log('[solr:index] Ensuring Solr collections are available...');
        await ensureSolrRunning();
        await ensureCollections(collections);

        console.log('[solr:index] Clearing old Solr documents...');
        for (const collection of collections) {
            await clearCollection(collection);
        }

        console.log('[solr:index] Loading MongoDB documents...');
        const [users, projects, jobs] = await Promise.all([
            User.find({}).select('name email about skills interests role onboardingCompleted thumbsUp createdAt').lean(),
            Project.find({}).select('title description topic status capacity createdAt deadline user_id').lean(),
            JobApplication.find({ $or: [{ user_id: null }, { user_id: { $exists: false } }] })
                .select('job_title company_name description skills salary_range active createdAt posted_by user_id')
                .lean()
        ]);

        const indexableJobs = jobs.filter(isJobPosting);

        console.log('[solr:index] Indexing users...');
        const userCount = await indexCollection({
            collection: SOLR_COLLECTIONS.users,
            docs: users,
            mapper: mapUserToSolrDoc
        });

        console.log('[solr:index] Indexing projects...');
        const projectCount = await indexCollection({
            collection: SOLR_COLLECTIONS.projects,
            docs: projects,
            mapper: mapProjectToSolrDoc
        });

        console.log('[solr:index] Indexing jobs...');
        const jobCount = await indexCollection({
            collection: SOLR_COLLECTIONS.jobs,
            docs: indexableJobs,
            mapper: mapJobToSolrDoc
        });

        console.log(`[solr:index] Indexed users=${userCount}, projects=${projectCount}, jobs=${jobCount}`);
    } finally {
        if (closeConnection && mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
};

if (require.main === module) {
    runSolrIndex()
        .then(() => {
            console.log('[solr:index] Completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[solr:index] Failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    runSolrIndex
};
