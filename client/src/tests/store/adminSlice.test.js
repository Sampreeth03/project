import reducer, {
  clearErrors,
  updateProfile,
  fetchDashboardData,
  fetchStudentsData,
  fetchPlatformAdmins,
  createPlatformAdmin
} from '../../store/adminSlice';

describe('store/adminSlice', () => {
  it('clears known error fields', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    const dirty = {
      ...initial,
      dashboardError: 'x',
      studentsError: 'x',
      recruitersError: 'x',
      projectsError: 'x',
      doubtsError: 'x',
      messagesError: 'x',
      profileError: 'x'
    };

    const next = reducer(dirty, clearErrors());
    expect(next.dashboardError).toBeNull();
    expect(next.profileError).toBeNull();
  });

  it('updates profile fields', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    const next = reducer(initial, updateProfile({ fullName: 'Admin Test' }));

    expect(next.profile.fullName).toBe('Admin Test');
  });

  it('handles dashboard pending and fulfilled actions', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    const pending = reducer(initial, { type: fetchDashboardData.pending.type });
    expect(pending.dashboardLoading).toBe(true);

    const fulfilled = reducer(pending, {
      type: fetchDashboardData.fulfilled.type,
      payload: { adminName: 'Root', dashboardCards: [{ title: 'Students' }] }
    });
    expect(fulfilled.dashboardLoading).toBe(false);
    expect(fulfilled.dashboardData.adminName).toBe('Root');
    expect(fulfilled.dashboardData.dashboardCards).toHaveLength(1);
  });

  it('handles rejected students and platform-admin flows', () => {
    const initial = reducer(undefined, { type: '@@INIT' });

    const studentsRejected = reducer(initial, {
      type: fetchStudentsData.rejected.type,
      payload: 'students failed'
    });
    expect(studentsRejected.studentsLoading).toBe(false);
    expect(studentsRejected.studentsError).toBe('students failed');

    const platformPending = reducer(initial, { type: fetchPlatformAdmins.pending.type });
    expect(platformPending.platformAdminsLoading).toBe(true);

    const platformFulfilled = reducer(platformPending, {
      type: fetchPlatformAdmins.fulfilled.type,
      payload: [{ email: 'pa@example.com' }]
    });
    expect(platformFulfilled.platformAdminsLoading).toBe(false);
    expect(platformFulfilled.platformAdmins).toEqual([{ email: 'pa@example.com' }]);

    const createRejected = reducer(initial, {
      type: createPlatformAdmin.rejected.type,
      payload: 'create failed'
    });
    expect(createRejected.createPlatformAdminLoading).toBe(false);
    expect(createRejected.createPlatformAdminError).toBe('create failed');
  });
});
