jest.mock('../../services/searchService', () => ({
  searchUsers: jest.fn(),
  searchProjects: jest.fn(),
  searchJobs: jest.fn()
}));

const { createRes } = require('../utils/httpMocks');
const searchController = require('../../controllers/searchController');
const { searchUsers, searchProjects, searchJobs } = require('../../services/searchService');

describe('controllers/searchController', () => {
  it('returns project search payload for normal query', async () => {
    const req = { query: { q: 'react' } };
    const res = createRes();
    const next = jest.fn();

    searchProjects.mockResolvedValue({ source: 'solr', data: [{ id: 'p1' }] });

    await searchController.getProjectSearch(req, res, next);

    expect(searchProjects).toHaveBeenCalledWith(expect.objectContaining({ q: 'react' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ id: 'p1' }] }));
    expect(next).not.toHaveBeenCalled();
  });

  it('handles empty query values', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = jest.fn();

    searchProjects.mockResolvedValue({ source: 'solr', data: [] });
    await searchController.getProjectSearch(req, res, next);

    expect(searchProjects).toHaveBeenCalledWith(expect.objectContaining({ q: '' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
  });

  it('forwards error with fallback metadata', async () => {
    const req = { query: {}, user: { id: 'u1' } };
    const res = createRes();
    const next = jest.fn();

    searchUsers.mockRejectedValue(new Error('boom'));

    await searchController.getUserSearch(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const forwarded = next.mock.calls[0][0];
    expect(forwarded.publicMessage).toBe('User search failed');
    expect(forwarded.statusCode).toBe(500);
  });

  it('returns job search payload for query', async () => {
    const req = { query: { q: 'node' } };
    const res = createRes();
    const next = jest.fn();

    searchJobs.mockResolvedValue({ source: 'solr', data: [{ id: 'j1' }] });

    await searchController.getJobSearch(req, res, next);

    expect(searchJobs).toHaveBeenCalledWith(expect.objectContaining({ q: 'node' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ id: 'j1' }] }));
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error with job fallback metadata', async () => {
    const req = { query: { q: 'qa' } };
    const res = createRes();
    const next = jest.fn();

    searchJobs.mockRejectedValue(new Error('job search failed'));

    await searchController.getJobSearch(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const forwarded = next.mock.calls[0][0];
    expect(forwarded.publicMessage).toBe('Job search failed');
    expect(forwarded.statusCode).toBe(500);
  });
});
