const mongoose = require('mongoose');
const { User, Project, JobApplication, FriendRequest } = require('../database');
const { SOLR_COLLECTIONS } = require('../config/solr');
const { queryCollection } = require('./solrClient');
const { toStringId, normalizeStringList } = require('./solrMappers');

const SEARCH_ROWS = Object.freeze({
    users: 20,
    projects: 12,
    jobs: 10
});

const parsePositiveInt = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const parseFilters = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;

    try {
        return JSON.parse(value);
    } catch (error) {
        return {};
    }
};

const toBoolean = (value, fallback = undefined) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return fallback;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeSolr = (value) => String(value).replace(/([+\-!(){}\[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1');

const buildTextQuery = (query) => {
    const safeQuery = String(query || '').trim();
    if (!safeQuery) return '*:*';

    const terms = safeQuery
        .split(/\s+/)
        .map((term) => escapeSolr(term))
        .filter(Boolean);

    if (terms.length === 0) return '*:*';
    return terms.map((term) => `${term}~1`).join(' ');
};

const buildMeta = ({ page, rows, total }) => {
    const totalPages = total > 0 ? Math.ceil(total / rows) : 0;

    return {
        page,
        rows,
        total,
        totalPages,
        hasNext: totalPages > 0 && page < totalPages,
        hasPrev: totalPages > 0 && page > 1
    };
};

const buildEmptyFallback = ({ page, rows, error }) => ({
    source: 'fallback',
    data: [],
    meta: buildMeta({ page, rows, total: 0 }),
    error
});

const getSolrTotal = (payload) => Number(payload?.response?.numFound || 0);

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toSortValue = (sort, map, query) => {
    if (sort && map[sort]) return map[sort];
    if (String(query || '').trim()) return map.relevance;
    return map.createdAt_desc || map.relevance;
};

const toUserResponse = (doc) => ({
    _id: toStringId(doc.id || doc._id),
    name: doc.name_t || doc.name || '',
    email: doc.email_t || doc.email || '',
    about: doc.about_t || doc.about || '',
    skills: normalizeStringList(doc.skills_txt || doc.skills),
    interests: normalizeStringList(doc.interests_txt || doc.interests),
    role: doc.role_s || doc.role || 'user',
    onboardingCompleted: Boolean(doc.onboardingCompleted_b ?? doc.onboardingCompleted),
    thumbsUp: Number(doc.thumbsUp_i ?? doc.thumbsUp ?? 0),
    createdAt: doc.createdAt_dt || doc.createdAt || null,
    requestStatus: doc.requestStatus || 'none'
});

const toProjectResponse = (doc) => ({
    id: toStringId(doc.id || doc._id),
    _id: toStringId(doc.id || doc._id),
    title: doc.title_t || doc.title || '',
    description: doc.description_t || doc.description || '',
    topic: doc.topic_s || doc.topic || 'General',
    status: doc.status_s || doc.status || 'active',
    capacity: Number(doc.capacity_i ?? doc.capacity ?? 0),
    createdAt: doc.createdAt_dt || doc.createdAt || null,
    deadline: doc.deadline_dt || doc.deadline || null,
    user_id: doc.owner_id_s || (doc.user_id ? toStringId(doc.user_id) : null)
});

const toJobResponse = (doc) => ({
    id: toStringId(doc.id || doc._id),
    _id: toStringId(doc.id || doc._id),
    job_title: doc.job_title_t || doc.job_title || '',
    company_name: doc.company_name_t || doc.company_name || '',
    description: doc.description_t || doc.description || '',
    skills: doc.skills_t || doc.skills || '',
    salary_range: doc.salary_range_s || doc.salary_range || '',
    active: Boolean(doc.active_b ?? doc.active),
    createdAt: doc.createdAt_dt || doc.createdAt || null,
    posted_by: doc.posted_by_s || (doc.posted_by ? toStringId(doc.posted_by) : null),
    custom_questions: Array.isArray(doc.custom_questions) ? doc.custom_questions : [],
    hasApplied: Boolean(doc.hasApplied)
});

const attachUserRequestStatus = async (currentUserId, users) => {
    if (!currentUserId || users.length === 0) return users;

    const userIds = users
        .map((user) => user?._id)
        .filter((id) => isObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    if (userIds.length === 0) {
        return users.map((user) => ({ ...user, requestStatus: 'none' }));
    }

    const relationships = await FriendRequest.find({
        $or: [
            { from_user: currentUserId, to_user: { $in: userIds } },
            { from_user: { $in: userIds }, to_user: currentUserId }
        ]
    }).lean();

    const statusByUserId = new Map();
    relationships.forEach((item) => {
        const from = String(item.from_user);
        const to = String(item.to_user);
        const status = item.status;

        if (status === 'accepted') {
            statusByUserId.set(from, 'friends');
            statusByUserId.set(to, 'friends');
            return;
        }

        if (from === String(currentUserId)) {
            statusByUserId.set(to, 'pending_sent');
        } else if (to === String(currentUserId)) {
            statusByUserId.set(from, 'pending_received');
        }
    });

    return users.map((user) => ({
        ...user,
        requestStatus: statusByUserId.get(String(user._id)) || 'none'
    }));
};

const toApplicationKey = (jobTitle, companyName) => `${String(jobTitle || '').trim()}||${String(companyName || '').trim()}`;

const buildAppliedSet = async (currentUserId) => {
    if (!currentUserId || !isObjectId(currentUserId)) return new Set();

    const applications = await JobApplication.find({ user_id: currentUserId })
        .select('job_title company_name')
        .lean();

    return new Set(applications.map((item) => toApplicationKey(item.job_title, item.company_name)));
};

const enrichJobs = async (jobs, currentUserId) => {
    if (!Array.isArray(jobs) || jobs.length === 0) return [];

    const ids = jobs
        .map((job) => job.id || job._id)
        .filter((id) => isObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const [jobDetails, appliedSet] = await Promise.all([
        ids.length
            ? JobApplication.find({ _id: { $in: ids } }).select('_id custom_questions').lean()
            : Promise.resolve([]),
        buildAppliedSet(currentUserId)
    ]);

    const customQuestionsById = new Map(
        jobDetails.map((item) => [String(item._id), Array.isArray(item.custom_questions) ? item.custom_questions : []])
    );

    return jobs.map((job) => {
        const id = String(job.id || job._id);
        return {
            ...job,
            custom_questions: customQuestionsById.get(id) || [],
            hasApplied: appliedSet.has(toApplicationKey(job.job_title, job.company_name))
        };
    });
};

const applyAppliedFilter = (jobs, appliedFilter) => {
    if (appliedFilter === 'applied') return jobs.filter((job) => job.hasApplied);
    if (appliedFilter === 'notapplied') return jobs.filter((job) => !job.hasApplied);
    return jobs;
};

const paginateList = (items, page, rows) => {
    const start = (page - 1) * rows;
    return items.slice(start, start + rows);
};

const userSortMap = Object.freeze({
    relevance: 'score desc,createdAt_dt desc',
    createdAt_desc: 'createdAt_dt desc',
    createdAt_asc: 'createdAt_dt asc',
    thumbsUp_desc: 'thumbsUp_i desc'
});

const projectSortMap = Object.freeze({
    relevance: 'score desc,createdAt_dt desc',
    createdAt_desc: 'createdAt_dt desc',
    createdAt_asc: 'createdAt_dt asc',
    deadline_asc: 'deadline_dt asc'
});

const jobSortMap = Object.freeze({
    relevance: 'score desc,createdAt_dt desc',
    createdAt_desc: 'createdAt_dt desc',
    createdAt_asc: 'createdAt_dt asc',
    title_asc: 'job_title_t asc'
});

const searchUsers = async ({ q = '', page = 1, rows = SEARCH_ROWS.users, sort, filters = {}, currentUserId = null }) => {
    const safePage = parsePositiveInt(page, 1);
    const safeRows = parsePositiveInt(rows, SEARCH_ROWS.users);
    const parsedFilters = parseFilters(filters);
    const solrSort = toSortValue(sort, userSortMap, q);

    const fq = [];
    if (parsedFilters.role) fq.push(`role_s:${escapeSolr(parsedFilters.role)}`);
    const onboardingCompleted = toBoolean(parsedFilters.onboardingCompleted, undefined);
    if (onboardingCompleted !== undefined) fq.push(`onboardingCompleted_b:${onboardingCompleted}`);

    try {
        const solrPayload = await queryCollection({
            collection: SOLR_COLLECTIONS.users,
            q: buildTextQuery(q),
            start: (safePage - 1) * safeRows,
            rows: safeRows,
            params: {
                defType: 'edismax',
                qf: 'name_t^3 skills_txt^2 about_t email_t',
                pf: 'name_t^4',
                ps: 2,
                qop: 'AND',
                fq,
                sort: solrSort,
                fl: 'id,name_t,email_t,about_t,skills_txt,interests_txt,role_s,onboardingCompleted_b,thumbsUp_i,createdAt_dt,score'
            }
        });

        const docs = (solrPayload?.response?.docs || []).map(toUserResponse);
        const data = await attachUserRequestStatus(currentUserId, docs);
        const total = getSolrTotal(solrPayload);

        return {
            source: 'solr',
            data,
            meta: buildMeta({ page: safePage, rows: safeRows, total })
        };
    } catch (solrError) {
        try {
            const mongoQuery = {};
            const clauses = [];

            if (String(q || '').trim()) {
                const regex = new RegExp(escapeRegex(q.trim()), 'i');
                clauses.push({
                    $or: [
                        { name: regex },
                        { email: regex },
                        { about: regex },
                        { skills: regex },
                        { interests: regex }
                    ]
                });
            }

            if (parsedFilters.role) clauses.push({ role: parsedFilters.role });
            if (onboardingCompleted !== undefined) clauses.push({ onboardingCompleted });

            if (clauses.length === 1) Object.assign(mongoQuery, clauses[0]);
            if (clauses.length > 1) mongoQuery.$and = clauses;

            const mongoSort = (() => {
                if (solrSort.includes('thumbsUp')) return { thumbsUp: -1, createdAt: -1 };
                if (solrSort.includes('createdAt_dt asc')) return { createdAt: 1 };
                return { createdAt: -1 };
            })();

            const [records, total] = await Promise.all([
                User.find(mongoQuery)
                    .select('name email about skills interests role onboardingCompleted thumbsUp createdAt')
                    .sort(mongoSort)
                    .skip((safePage - 1) * safeRows)
                    .limit(safeRows)
                    .lean(),
                User.countDocuments(mongoQuery)
            ]);

            const normalized = records.map((item) => toUserResponse(item));
            const data = await attachUserRequestStatus(currentUserId, normalized);

            return {
                source: 'fallback',
                data,
                meta: buildMeta({ page: safePage, rows: safeRows, total }),
                error: solrError.message
            };
        } catch (mongoError) {
            return buildEmptyFallback({ page: safePage, rows: safeRows, error: mongoError.message });
        }
    }
};

const searchProjects = async ({ q = '', page = 1, rows = SEARCH_ROWS.projects, sort, filters = {} }) => {
    const safePage = parsePositiveInt(page, 1);
    const safeRows = parsePositiveInt(rows, SEARCH_ROWS.projects);
    const parsedFilters = parseFilters(filters);
    const solrSort = toSortValue(sort, projectSortMap, q);

    const fq = [];
    const status = String(parsedFilters.status || '').toLowerCase();

    if (status === 'active') {
        fq.push('-status_s:completed');
        fq.push('deadline_dt:{NOW TO *]');
    } else if (status === 'expired') {
        fq.push('-status_s:completed');
        fq.push('deadline_dt:[* TO NOW]');
    } else if (status === 'completed') {
        fq.push('status_s:completed');
    } else if (status) {
        fq.push(`status_s:${escapeSolr(status)}`);
    }

    if (parsedFilters.topic) fq.push(`topic_s:"${escapeSolr(parsedFilters.topic)}"`);
    if (parsedFilters.ownerId) fq.push(`owner_id_s:${escapeSolr(parsedFilters.ownerId)}`);
    if (parsedFilters.excludeOwnerId) fq.push(`-owner_id_s:${escapeSolr(parsedFilters.excludeOwnerId)}`);

    if (toBoolean(parsedFilters.excludeExpired, false)) {
        fq.push('(status_s:completed OR deadline_dt:{NOW TO *])');
    }

    if (toBoolean(parsedFilters.onlyOpenToJoin, false)) {
        fq.push('-status_s:completed');
        fq.push('deadline_dt:{NOW TO *]');
    }

    try {
        const solrPayload = await queryCollection({
            collection: SOLR_COLLECTIONS.projects,
            q: buildTextQuery(q),
            start: (safePage - 1) * safeRows,
            rows: safeRows,
            params: {
                defType: 'edismax',
                qf: 'title_t^4 description_t^2',
                pf: 'title_t^5',
                ps: 2,
                qop: 'AND',
                fq,
                sort: solrSort,
                fl: 'id,title_t,description_t,topic_s,status_s,capacity_i,createdAt_dt,deadline_dt,owner_id_s,score'
            }
        });

        const data = (solrPayload?.response?.docs || []).map(toProjectResponse);
        const total = getSolrTotal(solrPayload);

        return {
            source: 'solr',
            data,
            meta: buildMeta({ page: safePage, rows: safeRows, total })
        };
    } catch (solrError) {
        try {
            const now = new Date();
            const clauses = [];

            if (String(q || '').trim()) {
                const regex = new RegExp(escapeRegex(q.trim()), 'i');
                clauses.push({
                    $or: [
                        { title: regex },
                        { description: regex },
                        { topic: regex }
                    ]
                });
            }

            if (status === 'active') {
                clauses.push({ status: { $ne: 'completed' } });
                clauses.push({ deadline: { $gt: now } });
            } else if (status === 'expired') {
                clauses.push({ status: { $ne: 'completed' } });
                clauses.push({ deadline: { $lt: now } });
            } else if (status === 'completed') {
                clauses.push({ status: 'completed' });
            } else if (status) {
                clauses.push({ status });
            }

            if (parsedFilters.topic) {
                clauses.push({ topic: new RegExp(`^${escapeRegex(parsedFilters.topic)}$`, 'i') });
            }

            if (parsedFilters.ownerId && isObjectId(parsedFilters.ownerId)) {
                clauses.push({ user_id: new mongoose.Types.ObjectId(parsedFilters.ownerId) });
            }

            if (parsedFilters.excludeOwnerId && isObjectId(parsedFilters.excludeOwnerId)) {
                clauses.push({ user_id: { $ne: new mongoose.Types.ObjectId(parsedFilters.excludeOwnerId) } });
            }

            if (toBoolean(parsedFilters.excludeExpired, false)) {
                clauses.push({
                    $or: [
                        { status: 'completed' },
                        { deadline: { $gt: now } }
                    ]
                });
            }

            if (toBoolean(parsedFilters.onlyOpenToJoin, false)) {
                clauses.push({ status: { $ne: 'completed' } });
                clauses.push({ deadline: { $gt: now } });
            }

            const mongoQuery = clauses.length > 1 ? { $and: clauses } : (clauses[0] || {});

            const mongoSort = (() => {
                if (solrSort.includes('createdAt_dt asc')) return { createdAt: 1 };
                if (solrSort.includes('deadline_dt asc')) return { deadline: 1 };
                return { createdAt: -1 };
            })();

            const [records, total] = await Promise.all([
                Project.find(mongoQuery)
                    .select('title description topic status capacity createdAt deadline user_id')
                    .sort(mongoSort)
                    .skip((safePage - 1) * safeRows)
                    .limit(safeRows)
                    .lean(),
                Project.countDocuments(mongoQuery)
            ]);

            const data = records.map((item) => toProjectResponse(item));

            return {
                source: 'fallback',
                data,
                meta: buildMeta({ page: safePage, rows: safeRows, total }),
                error: solrError.message
            };
        } catch (mongoError) {
            return buildEmptyFallback({ page: safePage, rows: safeRows, error: mongoError.message });
        }
    }
};

const searchJobs = async ({ q = '', page = 1, rows = SEARCH_ROWS.jobs, sort, filters = {}, currentUserId = null }) => {
    const safePage = parsePositiveInt(page, 1);
    const safeRows = parsePositiveInt(rows, SEARCH_ROWS.jobs);
    const parsedFilters = parseFilters(filters);
    const solrSort = toSortValue(sort, jobSortMap, q);
    const activeFilter = toBoolean(parsedFilters.active, undefined);
    const appliedFilter = String(parsedFilters.applied || '').toLowerCase();
    const requiresAppliedFiltering = appliedFilter === 'applied' || appliedFilter === 'notapplied';

    const fq = [];
    if (activeFilter !== undefined) fq.push(`active_b:${activeFilter}`);
    if (parsedFilters.postedBy) fq.push(`posted_by_s:${escapeSolr(parsedFilters.postedBy)}`);

    try {
        if (requiresAppliedFiltering) {
            const scanLimit = parsePositiveInt(process.env.SEARCH_JOBS_FILTER_SCAN_LIMIT, 2000);
            const solrPayload = await queryCollection({
                collection: SOLR_COLLECTIONS.jobs,
                q: buildTextQuery(q),
                start: 0,
                rows: scanLimit,
                params: {
                    defType: 'edismax',
                    qf: 'job_title_t^4 company_name_t^2 skills_t^2',
                    pf: 'job_title_t^5',
                    ps: 2,
                    qop: 'AND',
                    fq,
                    sort: solrSort,
                    fl: 'id,job_title_t,company_name_t,description_t,skills_t,salary_range_s,active_b,createdAt_dt,posted_by_s,score'
                }
            });

            const totalFromSolr = getSolrTotal(solrPayload);
            if (totalFromSolr > scanLimit) {
                throw new Error(`Solr scan limit reached (${scanLimit}/${totalFromSolr}).`);
            }

            const docs = (solrPayload?.response?.docs || []).map(toJobResponse);
            const enriched = await enrichJobs(docs, currentUserId);
            const filtered = applyAppliedFilter(enriched, appliedFilter);
            const total = filtered.length;

            return {
                source: 'solr',
                data: paginateList(filtered, safePage, safeRows),
                meta: buildMeta({ page: safePage, rows: safeRows, total })
            };
        }

        const solrPayload = await queryCollection({
            collection: SOLR_COLLECTIONS.jobs,
            q: buildTextQuery(q),
            start: (safePage - 1) * safeRows,
            rows: safeRows,
            params: {
                defType: 'edismax',
                qf: 'job_title_t^4 company_name_t^2 skills_t^2',
                pf: 'job_title_t^5',
                ps: 2,
                qop: 'AND',
                fq,
                sort: solrSort,
                fl: 'id,job_title_t,company_name_t,description_t,skills_t,salary_range_s,active_b,createdAt_dt,posted_by_s,score'
            }
        });

        const docs = (solrPayload?.response?.docs || []).map(toJobResponse);
        const data = await enrichJobs(docs, currentUserId);
        const total = getSolrTotal(solrPayload);

        return {
            source: 'solr',
            data,
            meta: buildMeta({ page: safePage, rows: safeRows, total })
        };
    } catch (solrError) {
        try {
            const clauses = [
                { $or: [{ user_id: null }, { user_id: { $exists: false } }] }
            ];

            if (String(q || '').trim()) {
                const regex = new RegExp(escapeRegex(q.trim()), 'i');
                clauses.push({
                    $or: [
                        { job_title: regex },
                        { company_name: regex },
                        { description: regex },
                        { skills: regex }
                    ]
                });
            }

            if (activeFilter !== undefined) {
                clauses.push({ active: activeFilter });
            }

            if (parsedFilters.postedBy && isObjectId(parsedFilters.postedBy)) {
                clauses.push({ posted_by: new mongoose.Types.ObjectId(parsedFilters.postedBy) });
            }

            const mongoQuery = clauses.length > 1 ? { $and: clauses } : clauses[0];

            const mongoSort = (() => {
                if (solrSort.includes('createdAt_dt asc')) return { createdAt: 1 };
                if (solrSort.includes('job_title_t asc')) return { job_title: 1 };
                return { createdAt: -1 };
            })();

            const toMongoJob = (item) => toJobResponse({
                ...item,
                custom_questions: Array.isArray(item.custom_questions) ? item.custom_questions : []
            });

            if (requiresAppliedFiltering) {
                const allRecords = await JobApplication.find(mongoQuery)
                    .select('_id job_title company_name description skills salary_range active createdAt posted_by custom_questions')
                    .sort(mongoSort)
                    .lean();

                const normalized = allRecords.map(toMongoJob);
                const enriched = await enrichJobs(normalized, currentUserId);
                const filtered = applyAppliedFilter(enriched, appliedFilter);
                const total = filtered.length;

                return {
                    source: 'fallback',
                    data: paginateList(filtered, safePage, safeRows),
                    meta: buildMeta({ page: safePage, rows: safeRows, total }),
                    error: solrError.message
                };
            }

            const [records, total] = await Promise.all([
                JobApplication.find(mongoQuery)
                    .select('_id job_title company_name description skills salary_range active createdAt posted_by custom_questions')
                    .sort(mongoSort)
                    .skip((safePage - 1) * safeRows)
                    .limit(safeRows)
                    .lean(),
                JobApplication.countDocuments(mongoQuery)
            ]);

            const normalized = records.map(toMongoJob);
            const data = await enrichJobs(normalized, currentUserId);

            return {
                source: 'fallback',
                data,
                meta: buildMeta({ page: safePage, rows: safeRows, total }),
                error: solrError.message
            };
        } catch (mongoError) {
            return buildEmptyFallback({ page: safePage, rows: safeRows, error: mongoError.message });
        }
    }
};

module.exports = {
    searchUsers,
    searchProjects,
    searchJobs
};
