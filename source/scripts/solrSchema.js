const users = {
    fields: [
        { name: 'text', type: 'text_general', indexed: true, stored: false, multiValued: true },
        { name: 'name_t', type: 'text_general', indexed: true, stored: true },
        { name: 'email_t', type: 'text_general', indexed: true, stored: true },
        { name: 'about_t', type: 'text_general', indexed: true, stored: true },
        { name: 'skills_txt', type: 'text_general', indexed: true, stored: true, multiValued: true },
        { name: 'interests_txt', type: 'text_general', indexed: true, stored: true, multiValued: true },
        { name: 'role_s', type: 'string', indexed: true, stored: true },
        { name: 'onboardingCompleted_b', type: 'boolean', indexed: true, stored: true },
        { name: 'thumbsUp_i', type: 'pint', indexed: true, stored: true },
        { name: 'createdAt_dt', type: 'pdate', indexed: true, stored: true }
    ],
    copyFields: [
        { source: 'name_t', dest: 'text' },
        { source: 'email_t', dest: 'text' },
        { source: 'about_t', dest: 'text' },
        { source: 'skills_txt', dest: 'text' }
    ]
};

const projects = {
    fields: [
        { name: 'text', type: 'text_general', indexed: true, stored: false, multiValued: true },
        { name: 'title_t', type: 'text_general', indexed: true, stored: true },
        { name: 'description_t', type: 'text_general', indexed: true, stored: true },
        { name: 'topic_s', type: 'string', indexed: true, stored: true },
        { name: 'status_s', type: 'string', indexed: true, stored: true },
        { name: 'capacity_i', type: 'pint', indexed: true, stored: true },
        { name: 'owner_id_s', type: 'string', indexed: true, stored: true },
        { name: 'createdAt_dt', type: 'pdate', indexed: true, stored: true },
        { name: 'deadline_dt', type: 'pdate', indexed: true, stored: true }
    ],
    copyFields: [
        { source: 'title_t', dest: 'text' },
        { source: 'description_t', dest: 'text' }
    ]
};

const jobs = {
    fields: [
        { name: 'text', type: 'text_general', indexed: true, stored: false, multiValued: true },
        { name: 'job_title_t', type: 'text_general', indexed: true, stored: true },
        { name: 'company_name_t', type: 'text_general', indexed: true, stored: true },
        { name: 'description_t', type: 'text_general', indexed: true, stored: true },
        { name: 'skills_t', type: 'text_general', indexed: true, stored: true },
        { name: 'salary_range_s', type: 'string', indexed: true, stored: true },
        { name: 'active_b', type: 'boolean', indexed: true, stored: true },
        { name: 'posted_by_s', type: 'string', indexed: true, stored: true },
        { name: 'createdAt_dt', type: 'pdate', indexed: true, stored: true }
    ],
    copyFields: [
        { source: 'job_title_t', dest: 'text' },
        { source: 'company_name_t', dest: 'text' },
        { source: 'description_t', dest: 'text' },
        { source: 'skills_t', dest: 'text' }
    ]
};

module.exports = {
    users,
    projects,
    jobs
};
