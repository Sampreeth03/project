import reducer, {
  clearJobsError,
  resetRecruiterState,
  fetchJobs,
  fetchNotifications,
  toggleJobActive,
  updateApplicationStatus,
  markNotificationRead,
  deleteNotification
} from '../../store/recruiterSlice';

describe('store/recruiterSlice', () => {
  it('clears jobs error', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    const dirty = { ...initial, jobs: { ...initial.jobs, error: 'boom' } };

    const next = reducer(dirty, clearJobsError());
    expect(next.jobs.error).toBeNull();
  });

  it('resets recruiter state', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    const dirty = { ...initial, jobs: { ...initial.jobs, totalJobs: 99 } };

    const next = reducer(dirty, resetRecruiterState());
    expect(next.jobs.totalJobs).toBe(0);
  });

  it('handles fetchJobs pending/fulfilled and fetchNotifications rejected', () => {
    const initial = reducer(undefined, { type: '@@INIT' });

    const pendingJobs = reducer(initial, { type: fetchJobs.pending.type });
    expect(pendingJobs.jobs.loading).toBe(true);

    const fulfilledJobs = reducer(pendingJobs, {
      type: fetchJobs.fulfilled.type,
      payload: { postedJobs: [{ _id: 'j1', active: true }], totalJobs: 1, activeJobs: 1, totalParticipants: 4 }
    });
    expect(fulfilledJobs.jobs.loading).toBe(false);
    expect(fulfilledJobs.jobs.totalJobs).toBe(1);
    expect(fulfilledJobs.jobs.list).toHaveLength(1);

    const rejectedNotifications = reducer(initial, {
      type: fetchNotifications.rejected.type,
      payload: 'notif failed'
    });
    expect(rejectedNotifications.notifications.error).toBe('notif failed');
  });

  it('updates job active state, application status, and notification flags', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    const seeded = {
      ...initial,
      jobs: {
        ...initial.jobs,
        list: [
          { _id: 'j1', active: true },
          { _id: 'j2', active: false }
        ],
        activeJobs: 1
      },
      applications: {
        ...initial.applications,
        list: [{ id: 'a1', status: 'waiting', unread: true }]
      },
      notifications: {
        ...initial.notifications,
        list: [{ _id: 'n1', is_read: false }, { _id: 'n2', is_read: false }]
      }
    };

    const toggled = reducer(seeded, {
      type: toggleJobActive.fulfilled.type,
      payload: { jobId: 'j2', active: true }
    });
    expect(toggled.jobs.list.find((j) => j._id === 'j2').active).toBe(true);
    expect(toggled.jobs.activeJobs).toBe(2);

    const updatedApplication = reducer(toggled, {
      type: updateApplicationStatus.fulfilled.type,
      payload: { applicationId: 'a1', status: 'approved' }
    });
    expect(updatedApplication.applications.list[0].status).toBe('approved');
    expect(updatedApplication.applications.list[0].unread).toBe(false);

    const marked = reducer(updatedApplication, {
      type: markNotificationRead.fulfilled.type,
      payload: { notificationId: 'n1' }
    });
    expect(marked.notifications.list.find((n) => n._id === 'n1').is_read).toBe(true);

    const deleted = reducer(marked, {
      type: deleteNotification.fulfilled.type,
      payload: { notificationId: 'n2' }
    });
    expect(deleted.notifications.list.some((n) => n._id === 'n2')).toBe(false);
  });
});
