require('dotenv').config();

const { runSolrSetup } = require('./solrSetup');
const { runSolrIndex } = require('./solrIndex');

const runSolrBootstrap = async () => {
    console.log('[solr:bootstrap] Step 1/4: Start Solr + ensure cloud mode');
    console.log('[solr:bootstrap] Step 2/4: Create collections');
    console.log('[solr:bootstrap] Step 3/4: Apply schema');
    await runSolrSetup();

    console.log('[solr:bootstrap] Step 4/4: Index MongoDB data into Solr');
    await runSolrIndex();
};

if (require.main === module) {
    runSolrBootstrap()
        .then(() => {
            console.log('[solr:bootstrap] Completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[solr:bootstrap] Failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    runSolrBootstrap
};
