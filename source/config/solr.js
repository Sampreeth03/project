const normalizeBaseUrl = (value) => {
    const fallback = 'http://localhost:8983/solr';
    const raw = (value || fallback).trim();
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const toInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const SOLR_BASE_URL = normalizeBaseUrl(process.env.SOLR_BASE_URL);
const SOLR_TIMEOUT_MS = toInt(process.env.SOLR_TIMEOUT_MS, 10000);
const SOLR_SYNC_ENABLED = String(process.env.SOLR_SYNC_ENABLED || 'true').toLowerCase() !== 'false';

const SOLR_COLLECTIONS = Object.freeze({
    users: process.env.SOLR_COLLECTION_USERS || 'users',
    projects: process.env.SOLR_COLLECTION_PROJECTS || 'projects',
    jobs: process.env.SOLR_COLLECTION_JOBS || 'jobs'
});

module.exports = {
    SOLR_BASE_URL,
    SOLR_TIMEOUT_MS,
    SOLR_SYNC_ENABLED,
    SOLR_COLLECTIONS
};
