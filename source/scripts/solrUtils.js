require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const axios = require('axios');
const { SOLR_BASE_URL, SOLR_TIMEOUT_MS } = require('../config/solr');

const START_WAIT_ATTEMPTS = Number(process.env.SOLR_START_WAIT_ATTEMPTS || 60);
const START_WAIT_DELAY_MS = Number(process.env.SOLR_START_WAIT_DELAY_MS || 1000);
const REQUIRE_CLOUD = String(process.env.SOLR_REQUIRE_CLOUD || 'true').toLowerCase() !== 'false';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSolrPort = () => {
    try {
        const parsed = new URL(SOLR_BASE_URL);
        if (parsed.port) return Number(parsed.port);
        return parsed.protocol === 'https:' ? 443 : 80;
    } catch (error) {
        return 8983;
    }
};

const resolveSolrBinary = () => {
    const solrBin = (process.env.SOLR_BIN || '').trim();
    if (solrBin) {
        const looksLikePath = path.isAbsolute(solrBin) || solrBin.includes('/') || solrBin.includes('\\');
        if (looksLikePath && !fs.existsSync(solrBin)) {
            throw new Error(`SOLR_BIN path not found: ${solrBin}`);
        }
        return solrBin;
    }

    const solrHome = (process.env.SOLR_HOME || '').trim();
    if (solrHome) {
        const candidates = process.platform === 'win32'
            ? [path.join(solrHome, 'bin', 'solr.cmd'), path.join(solrHome, 'bin', 'solr')]
            : [path.join(solrHome, 'bin', 'solr'), path.join(solrHome, 'bin', 'solr.cmd')];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
    }

    return process.platform === 'win32' ? 'solr.cmd' : 'solr';
};

const runSolrCommand = (args, { allowFailure = false } = {}) => {
    const executable = resolveSolrBinary();
    const executableLower = String(executable).toLowerCase();
    const isCmdScript = process.platform === 'win32' && (executableLower.endsWith('.cmd') || executableLower.endsWith('.bat'));

    return new Promise((resolve, reject) => {
        execFile(executable, args, { windowsHide: true, shell: isCmdScript }, (error, stdout, stderr) => {
            const output = `${stdout || ''}${stderr || ''}`.trim();

            if (error && !allowFailure) {
                return reject(new Error(`solr ${args.join(' ')} failed: ${output || error.message}`));
            }

            return resolve({ ok: !error, output });
        });
    });
};

const solrHttp = axios.create({
    baseURL: SOLR_BASE_URL,
    timeout: SOLR_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json'
    }
});

const isSolrOnline = async () => {
    try {
        await solrHttp.get('/admin/info/system', { params: { wt: 'json' } });
        return true;
    } catch (error) {
        return false;
    }
};

const listCollections = async () => {
    const response = await solrHttp.get('/admin/collections', {
        params: { action: 'LIST', wt: 'json' }
    });

    return Array.isArray(response.data?.collections) ? response.data.collections : [];
};

const isCloudMode = async () => {
    try {
        await listCollections();
        return true;
    } catch (error) {
        return false;
    }
};

const waitForSolr = async () => {
    for (let attempt = 1; attempt <= START_WAIT_ATTEMPTS; attempt += 1) {
        const online = await isSolrOnline();
        if (online) return;
        await delay(START_WAIT_DELAY_MS);
    }

    throw new Error('Timed out waiting for Solr to become available');
};

const ensureSolrRunning = async () => {
    const port = String(getSolrPort());
    const online = await isSolrOnline();

    if (!online) {
        await runSolrCommand(['start', '-c', '-p', port]);
        await waitForSolr();
        return;
    }

    if (!REQUIRE_CLOUD) return;

    const cloudMode = await isCloudMode();
    if (cloudMode) return;

    await runSolrCommand(['stop', '-all'], { allowFailure: true });
    await runSolrCommand(['start', '-c', '-p', port]);
    await waitForSolr();

    const cloudAfterRestart = await isCloudMode();
    if (!cloudAfterRestart) {
        throw new Error('Solr is running but not in SolrCloud mode. Start Solr with -c.');
    }
};

const isIgnorableError = (message) => {
    const text = String(message || '').toLowerCase();
    return text.includes('already exists') || text.includes('duplicate') || text.includes('copy field source') || text.includes('exists');
};

const extractErrorMessage = (error) => {
    const data = error?.response?.data;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
        return data.errors.map((item) => item?.errorMessages || JSON.stringify(item)).join(' | ');
    }

    if (typeof data?.error?.msg === 'string') return data.error.msg;
    if (typeof data?.error === 'string') return data.error;

    if (data) {
        try {
            return JSON.stringify(data);
        } catch (jsonError) {
            return String(data);
        }
    }

    return error.message;
};

const ensureCollections = async (collections) => {
    const existing = await listCollections();

    for (const name of collections) {
        if (existing.includes(name)) continue;

        try {
            await solrHttp.get('/admin/collections', {
                params: {
                    action: 'CREATE',
                    name,
                    numShards: 1,
                    replicationFactor: 1,
                    'collection.configName': process.env.SOLR_CONFIGSET || '_default',
                    wt: 'json'
                }
            });
        } catch (error) {
            const message = extractErrorMessage(error);
            if (!isIgnorableError(message)) {
                throw new Error(`Failed to create collection ${name}: ${message}`);
            }
        }
    }
};

const applySchemaCommand = async (collection, command) => {
    try {
        const response = await solrHttp.post(`/${collection}/schema`, command);
        const errors = response.data?.errors;

        if (Array.isArray(errors) && errors.length > 0) {
            const message = errors.map((item) => JSON.stringify(item)).join(' | ');
            if (!isIgnorableError(message)) {
                throw new Error(message);
            }
        }
    } catch (error) {
        const message = extractErrorMessage(error);
        if (!isIgnorableError(message)) {
            throw new Error(`Schema command failed for ${collection}: ${message}`);
        }
    }
};

const applySchema = async (collection, schemaDefinition) => {
    for (const field of schemaDefinition.fields || []) {
        await applySchemaCommand(collection, { 'add-field': field });
    }

    for (const copyField of schemaDefinition.copyFields || []) {
        await applySchemaCommand(collection, { 'add-copy-field': copyField });
    }
};

const clearCollection = async (collection) => {
    await solrHttp.post(
        `/${collection}/update`,
        {
            delete: {
                query: '*:*'
            }
        },
        {
            params: {
                commit: 'true'
            }
        }
    );
};

const addDocuments = async (collection, docs) => {
    if (!Array.isArray(docs) || docs.length === 0) return;

    await solrHttp.post(`/${collection}/update`, docs, {
        params: {
            commit: 'false',
            overwrite: 'true'
        }
    });
};

const commitCollection = async (collection) => {
    await solrHttp.post(
        `/${collection}/update`,
        { commit: {} },
        {
            params: {
                commit: 'true'
            }
        }
    );
};

const chunk = (items, size) => {
    const batches = [];
    for (let index = 0; index < items.length; index += size) {
        batches.push(items.slice(index, index + size));
    }
    return batches;
};

module.exports = {
    ensureSolrRunning,
    ensureCollections,
    applySchema,
    clearCollection,
    addDocuments,
    commitCollection,
    chunk,
    runSolrCommand,
    listCollections,
    isCloudMode
};
