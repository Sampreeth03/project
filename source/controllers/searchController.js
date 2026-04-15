const { searchUsers, searchProjects, searchJobs } = require('../services/searchService');

const parseQueryArgs = (req) => ({
    q: req.query.q || '',
    page: req.query.page,
    rows: req.query.rows,
    sort: req.query.sort,
    filters: req.query.filters
});

exports.getUserSearch = async (req, res, next) => {
    try {
        const payload = await searchUsers({
            ...parseQueryArgs(req),
            currentUserId: req.user?.id || null
        });

        return res.json(payload);
    } catch (error) {
        error.statusCode = 500;
        error.publicMessage = 'User search failed';
        return next(error);
    }
};

exports.getProjectSearch = async (req, res, next) => {
    try {
        const payload = await searchProjects(parseQueryArgs(req));
        return res.json(payload);
    } catch (error) {
        error.statusCode = 500;
        error.publicMessage = 'Project search failed';
        return next(error);
    }
};

exports.getJobSearch = async (req, res, next) => {
    try {
        const payload = await searchJobs({
            ...parseQueryArgs(req),
            currentUserId: req.user?.id || null
        });

        return res.json(payload);
    } catch (error) {
        error.statusCode = 500;
        error.publicMessage = 'Job search failed';
        return next(error);
    }
};
