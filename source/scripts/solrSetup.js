require('dotenv').config();

const { SOLR_COLLECTIONS } = require('../config/solr');
const solrSchema = require('./solrSchema');
const { ensureSolrRunning, ensureCollections, applySchema, listCollections } = require('./solrUtils');

const collections = [SOLR_COLLECTIONS.users, SOLR_COLLECTIONS.projects, SOLR_COLLECTIONS.jobs];

const schemaByCollection = {
    [SOLR_COLLECTIONS.users]: solrSchema.users,
    [SOLR_COLLECTIONS.projects]: solrSchema.projects,
    [SOLR_COLLECTIONS.jobs]: solrSchema.jobs
};

const runSolrSetup = async () => {
    console.log('[solr:setup] Ensuring Solr is running in cloud mode...');
    await ensureSolrRunning();

    console.log('[solr:setup] Ensuring collections exist...');
    await ensureCollections(collections);

    console.log('[solr:setup] Applying collection schemas...');
    for (const collection of collections) {
        await applySchema(collection, schemaByCollection[collection]);
    }

    const availableCollections = await listCollections();
    console.log('[solr:setup] Ready collections:', availableCollections.join(', '));
};

if (require.main === module) {
    runSolrSetup()
        .then(() => {
            console.log('[solr:setup] Completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[solr:setup] Failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    runSolrSetup
};
