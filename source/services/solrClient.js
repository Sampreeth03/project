const axios = require('axios');
const { SOLR_BASE_URL, SOLR_TIMEOUT_MS } = require('../config/solr');

const serializeParams = (params = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;

        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (item === undefined || item === null || item === '') return;
                searchParams.append(key, String(item));
            });
            return;
        }

        searchParams.append(key, String(value));
    });

    return searchParams.toString();
};

const solrHttp = axios.create({
    baseURL: SOLR_BASE_URL,
    timeout: SOLR_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json'
    },
    paramsSerializer: {
        serialize: serializeParams
    }
});

const toErrorMessage = (error) => {
    const responseMessage = error?.response?.data?.error?.msg || error?.response?.data?.error || error?.response?.data;
    if (typeof responseMessage === 'string') return responseMessage;
    if (responseMessage) {
        try {
            return JSON.stringify(responseMessage);
        } catch (jsonErr) {
            return String(responseMessage);
        }
    }
    return error?.message || 'Unknown Solr error';
};

const queryCollection = async ({ collection, q = '*:*', start = 0, rows = 10, params = {} }) => {
    try {
        const response = await solrHttp.get(`/${collection}/select`, {
            params: {
                q,
                start,
                rows,
                wt: 'json',
                ...params
            }
        });

        return response.data;
    } catch (error) {
        const message = toErrorMessage(error);
        throw new Error(`Solr query failed for ${collection}: ${message}`);
    }
};

const addOrUpdateDocuments = async ({ collection, docs, commit = false }) => {
    if (!Array.isArray(docs) || docs.length === 0) return;

    try {
        await solrHttp.post(`/${collection}/update`, docs, {
            params: {
                commit: commit ? 'true' : 'false',
                overwrite: 'true'
            }
        });
    } catch (error) {
        const message = toErrorMessage(error);
        throw new Error(`Solr add/update failed for ${collection}: ${message}`);
    }
};

const deleteDocumentsByIds = async ({ collection, ids, commit = true }) => {
    const safeIds = (ids || []).map((id) => String(id || '').trim()).filter(Boolean);
    if (safeIds.length === 0) return;

    const payload = {
        delete: safeIds.map((id) => ({ id }))
    };

    try {
        await solrHttp.post(`/${collection}/update`, payload, {
            params: {
                commit: commit ? 'true' : 'false'
            }
        });
    } catch (error) {
        const message = toErrorMessage(error);
        throw new Error(`Solr delete by ids failed for ${collection}: ${message}`);
    }
};

const deleteByQuery = async ({ collection, query, commit = true }) => {
    const safeQuery = String(query || '').trim();
    if (!safeQuery) return;

    try {
        await solrHttp.post(
            `/${collection}/update`,
            {
                delete: {
                    query: safeQuery
                }
            },
            {
                params: {
                    commit: commit ? 'true' : 'false'
                }
            }
        );
    } catch (error) {
        const message = toErrorMessage(error);
        throw new Error(`Solr delete by query failed for ${collection}: ${message}`);
    }
};

const pingCollection = async (collection) => {
    const response = await solrHttp.get(`/${collection}/admin/ping`, {
        params: { wt: 'json' }
    });
    return response.data;
};

module.exports = {
    solrHttp,
    queryCollection,
    addOrUpdateDocuments,
    deleteDocumentsByIds,
    deleteByQuery,
    pingCollection
};
