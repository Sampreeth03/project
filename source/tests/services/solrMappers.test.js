const {
  toIsoDate,
  toStringId,
  normalizeStringList,
  isJobPosting,
  mapUserToSolrDoc,
  mapProjectToSolrDoc,
  mapJobToSolrDoc
} = require('../../services/solrMappers');

describe('services/solrMappers', () => {
  it('normalizes ids and dates safely', () => {
    expect(toStringId('abc')).toBe('abc');
    expect(toStringId({ _id: 123 })).toBe('123');
    expect(toStringId(null)).toBe('');

    expect(toIsoDate('2026-01-01')).toContain('2026-01-01');
    expect(toIsoDate('bad-date')).toBeNull();
  });

  it('normalizes string list from arrays and comma-separated values', () => {
    expect(normalizeStringList([' js ', 'react', ''])).toEqual(['js', 'react']);
    expect(normalizeStringList(' node, express ,  ')).toEqual(['node', 'express']);
    expect(normalizeStringList(undefined)).toEqual([]);
  });

  it('maps user, project and job docs with defaults', () => {
    const userDoc = mapUserToSolrDoc({ _id: 'u1', name: 'A', skills: ['js'], role: 'student' });
    const projectDoc = mapProjectToSolrDoc({ _id: 'p1', title: 'Proj', user_id: { _id: 'u1' } });
    const jobDoc = mapJobToSolrDoc({ _id: 'j1', job_title: 'Dev', active: 1, skills: ['js', 'ts'] });

    expect(userDoc).toEqual(expect.objectContaining({ id: 'u1', name_t: 'A', skills_txt: ['js'] }));
    expect(projectDoc).toEqual(expect.objectContaining({ id: 'p1', owner_id_s: 'u1' }));
    expect(jobDoc).toEqual(expect.objectContaining({ id: 'j1', active_b: true, skills_t: 'js, ts' }));
  });

  it('detects job postings based on missing user_id', () => {
    expect(isJobPosting({ user_id: null })).toBe(true);
    expect(isJobPosting({ user_id: 'u1' })).toBe(false);
  });
});