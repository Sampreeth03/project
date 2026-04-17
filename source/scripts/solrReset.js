require('dotenv').config();

const { runSolrBootstrap } = require('./solrBootstrap');

const runSolrReset = async () => {
    await runSolrBootstrap();
};

if (require.main === module) {
    runSolrReset()
        .then(() => {
            console.log('[solr:reset] Completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[solr:reset] Failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    runSolrReset
};
