jest.mock('../../database', () => ({
  User: { find: jest.fn(), countDocuments: jest.fn() },
  Project: { find: jest.fn(), countDocuments: jest.fn() },
  JobApplication: { find: jest.fn(), countDocuments: jest.fn() },
  FriendRequest: { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }
}));

const { queryCollection } = require('../../services/solrClient');
const { searchUsers } = require('../../services/searchService');
const { User } = require('../../database');

describe('services/searchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Solr-backed results on success', async () => {
    queryCollection.mockResolvedValue({
      response: {
        numFound: 1,
        docs: [{ id: 'u1', name_t: 'Alice', email_t: 'a@example.com', role_s: 'user' }]
      }
    });

    const result = await searchUsers({ q: 'alice', page: 1, rows: 10 });

    expect(result.source).toBe('solr');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alice');
    expect(result.meta.total).toBe(1);
  });

  it('falls back to MongoDB when Solr errors', async () => {
    queryCollection.mockRejectedValue(new Error('solr down'));

    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'u2', name: 'Bob', email: 'b@example.com', role: 'user' }])
    };

    User.find.mockReturnValue(chain);
    User.countDocuments.mockResolvedValue(1);

    const result = await searchUsers({ q: 'bob', page: 1, rows: 10 });

    expect(result.source).toBe('fallback');
    expect(result.data[0].name).toBe('Bob');
    expect(result.meta.total).toBe(1);
  });
});
