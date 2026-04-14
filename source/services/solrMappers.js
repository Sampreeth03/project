const toIsoDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toStringId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value._id) return String(value._id);
    return String(value);
};

const normalizeStringList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const isJobPosting = (job) => {
    return !job?.user_id;
};

const mapUserToSolrDoc = (user) => ({
    id: toStringId(user?._id || user?.id),
    name_t: user?.name || '',
    email_t: user?.email || '',
    about_t: user?.about || '',
    skills_txt: normalizeStringList(user?.skills),
    interests_txt: normalizeStringList(user?.interests),
    role_s: user?.role || 'user',
    onboardingCompleted_b: Boolean(user?.onboardingCompleted),
    thumbsUp_i: Number(user?.thumbsUp || 0),
    createdAt_dt: toIsoDate(user?.createdAt)
});

const mapProjectToSolrDoc = (project) => ({
    id: toStringId(project?._id || project?.id),
    title_t: project?.title || '',
    description_t: project?.description || '',
    topic_s: project?.topic || 'General',
    status_s: project?.status || 'active',
    capacity_i: Number(project?.capacity || 0),
    owner_id_s: project?.user_id ? toStringId(project.user_id) : '',
    createdAt_dt: toIsoDate(project?.createdAt),
    deadline_dt: toIsoDate(project?.deadline)
});

const mapJobToSolrDoc = (job) => ({
    id: toStringId(job?._id || job?.id),
    job_title_t: job?.job_title || '',
    company_name_t: job?.company_name || '',
    description_t: job?.description || '',
    skills_t: typeof job?.skills === 'string' ? job.skills : normalizeStringList(job?.skills).join(', '),
    salary_range_s: job?.salary_range || '',
    active_b: Boolean(job?.active === true || job?.active === 1),
    createdAt_dt: toIsoDate(job?.createdAt),
    posted_by_s: job?.posted_by ? toStringId(job.posted_by) : ''
});

module.exports = {
    toIsoDate,
    toStringId,
    normalizeStringList,
    isJobPosting,
    mapUserToSolrDoc,
    mapProjectToSolrDoc,
    mapJobToSolrDoc
};
