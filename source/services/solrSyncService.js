const { SOLR_COLLECTIONS, SOLR_SYNC_ENABLED } = require('../config/solr');
const { addOrUpdateDocuments, deleteDocumentsByIds } = require('./solrClient');
const {
    toStringId,
    isJobPosting,
    mapUserToSolrDoc,
    mapProjectToSolrDoc,
    mapJobToSolrDoc
} = require('./solrMappers');

const logPrefix = '[SolrSync]';

const safeSync = async (operation, entity, entityId, callback) => {
    if (!SOLR_SYNC_ENABLED) {
        return { synced: false, reason: 'disabled' };
    }

    try {
        await callback();
        return { synced: true };
    } catch (error) {
        console.error(`${logPrefix} ${operation} ${entity} ${entityId} failed:`, error.message);
        return { synced: false, reason: error.message };
    }
};

const syncUserUpsert = async (user) => {
    const id = toStringId(user?._id || user?.id);
    if (!id) return { synced: false, reason: 'missing-id' };

    return safeSync('upsert', 'user', id, async () => {
        await addOrUpdateDocuments({
            collection: SOLR_COLLECTIONS.users,
            docs: [mapUserToSolrDoc(user)],
            commit: true
        });
    });
};

const syncUserDelete = async (userId) => {
    const id = toStringId(userId);
    if (!id) return { synced: false, reason: 'missing-id' };

    return safeSync('delete', 'user', id, async () => {
        await deleteDocumentsByIds({
            collection: SOLR_COLLECTIONS.users,
            ids: [id],
            commit: true
        });
    });
};

const syncProjectUpsert = async (project) => {
    const id = toStringId(project?._id || project?.id);
    if (!id) return { synced: false, reason: 'missing-id' };

    return safeSync('upsert', 'project', id, async () => {
        await addOrUpdateDocuments({
            collection: SOLR_COLLECTIONS.projects,
            docs: [mapProjectToSolrDoc(project)],
            commit: true
        });
    });
};

const syncProjectDelete = async (projectId) => {
    const id = toStringId(projectId);
    if (!id) return { synced: false, reason: 'missing-id' };

    return safeSync('delete', 'project', id, async () => {
        await deleteDocumentsByIds({
            collection: SOLR_COLLECTIONS.projects,
            ids: [id],
            commit: true
        });
    });
};

const syncJobUpsert = async (job) => {
    const id = toStringId(job?._id || job?.id);
    if (!id) return { synced: false, reason: 'missing-id' };

    if (!isJobPosting(job)) {
        return syncJobDelete(id);
    }

    return safeSync('upsert', 'job', id, async () => {
        await addOrUpdateDocuments({
            collection: SOLR_COLLECTIONS.jobs,
            docs: [mapJobToSolrDoc(job)],
            commit: true
        });
    });
};

const syncJobDelete = async (jobId) => {
    const id = toStringId(jobId);
    if (!id) return { synced: false, reason: 'missing-id' };

    return safeSync('delete', 'job', id, async () => {
        await deleteDocumentsByIds({
            collection: SOLR_COLLECTIONS.jobs,
            ids: [id],
            commit: true
        });
    });
};

module.exports = {
    syncUserUpsert,
    syncUserDelete,
    syncProjectUpsert,
    syncProjectDelete,
    syncJobUpsert,
    syncJobDelete
};
