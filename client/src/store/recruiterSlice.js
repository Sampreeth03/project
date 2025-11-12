// Redux Slice for Recruiter State Management
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ============================================
// Async Thunks - API Calls
// ============================================

// Fetch Jobs
export const fetchJobs = createAsyncThunk(
    'recruiter/fetchJobs',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/rec-job', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch jobs');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Fetch Dashboard Data
export const fetchDashboard = createAsyncThunk(
    'recruiter/fetchDashboard',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/recruiter-dashboard', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch dashboard');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Fetch Applications
export const fetchApplications = createAsyncThunk(
    'recruiter/fetchApplications',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/rec-app', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch applications');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Fetch Notifications
export const fetchNotifications = createAsyncThunk(
    'recruiter/fetchNotifications',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/rec-not', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch notifications');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Create Job
export const createJob = createAsyncThunk(
    'recruiter/createJob',
    async (jobData, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/create-recruiter-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(jobData)
            });
            if (!response.ok) throw new Error('Failed to create job');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Delete Job
export const deleteJob = createAsyncThunk(
    'recruiter/deleteJob',
    async (jobId, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/delete-recruiter-job/${jobId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to delete job');
            return { jobId, ...(await response.json()) };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Toggle Job Active
export const toggleJobActive = createAsyncThunk(
    'recruiter/toggleJobActive',
    async ({ jobId, active }, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/toggle-job-active/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ active })
            });
            if (!response.ok) throw new Error('Failed to toggle job status');
            return { jobId, active };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Update Application Status
export const updateApplicationStatus = createAsyncThunk(
    'recruiter/updateApplicationStatus',
    async ({ applicationId, status }, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/update-application-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ applicationId, status })
            });
            if (!response.ok) throw new Error('Failed to update application status');
            return { applicationId, status: status.toLowerCase(), ...(await response.json()) };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Mark Notification as Read
export const markNotificationRead = createAsyncThunk(
    'recruiter/markNotificationRead',
    async (notificationId, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/mark-notification-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ notificationId })
            });
            if (!response.ok) throw new Error('Failed to mark notification as read');
            return { notificationId };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Delete Notification
export const deleteNotification = createAsyncThunk(
    'recruiter/deleteNotification',
    async (notificationId, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/delete-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ notificationId })
            });
            if (!response.ok) throw new Error('Failed to delete notification');
            return { notificationId };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Fetch User Profile for Recruiter
export const fetchUserProfile = createAsyncThunk(
    'recruiter/fetchUserProfile',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/user-profile-for-recruiter/${userId}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch user profile');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// ============================================
// Initial State
// ============================================
const initialState = {
    // Jobs State
    jobs: {
        list: [],
        totalJobs: 0,
        activeJobs: 0,
        totalParticipants: 0,
        loading: false,
        error: null
    },
    // Applications State
    applications: {
        list: [],
        loading: false,
        error: null
    },
    // Notifications State
    notifications: {
        list: [],
        loading: false,
        error: null
    },
    // Dashboard State
    dashboard: {
        totalJobs: 0,
        totalParticipants: 0,
        loading: false,
        error: null
    },
    // User Profile State
    userProfile: {
        data: null,
        loading: false,
        error: null
    }
};

// ============================================
// Recruiter Slice
// ============================================
const recruiterSlice = createSlice({
    name: 'recruiter',
    initialState,
    reducers: {
        // Clear errors
        clearJobsError: (state) => {
            state.jobs.error = null;
        },
        clearApplicationsError: (state) => {
            state.applications.error = null;
        },
        clearNotificationsError: (state) => {
            state.notifications.error = null;
        },
        clearUserProfileError: (state) => {
            state.userProfile.error = null;
        },
        clearUserProfile: (state) => {
            state.userProfile.data = null;
            state.userProfile.error = null;
        },
        // Reset state on logout
        resetRecruiterState: () => initialState
    },
    extraReducers: (builder) => {
        builder
            // ============ Fetch Jobs ============
            .addCase(fetchJobs.pending, (state) => {
                state.jobs.loading = true;
                state.jobs.error = null;
            })
            .addCase(fetchJobs.fulfilled, (state, action) => {
                state.jobs.loading = false;
                state.jobs.list = action.payload.postedJobs || [];
                state.jobs.totalJobs = action.payload.totalJobs || 0;
                state.jobs.activeJobs = action.payload.activeJobs || 0;
                state.jobs.totalParticipants = action.payload.totalParticipants || 0;
            })
            .addCase(fetchJobs.rejected, (state, action) => {
                state.jobs.loading = false;
                state.jobs.error = action.payload;
            })

            // ============ Fetch Dashboard ============
            .addCase(fetchDashboard.pending, (state) => {
                state.dashboard.loading = true;
                state.dashboard.error = null;
            })
            .addCase(fetchDashboard.fulfilled, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.totalJobs = action.payload.totalJobs || 0;
                state.dashboard.totalParticipants = action.payload.totalParticipants || 0;
            })
            .addCase(fetchDashboard.rejected, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.error = action.payload;
            })

            // ============ Fetch Applications ============
            .addCase(fetchApplications.pending, (state) => {
                state.applications.loading = true;
                state.applications.error = null;
            })
            .addCase(fetchApplications.fulfilled, (state, action) => {
                state.applications.loading = false;
                state.applications.list = action.payload.applications || [];
            })
            .addCase(fetchApplications.rejected, (state, action) => {
                state.applications.loading = false;
                state.applications.error = action.payload;
            })

            // ============ Fetch Notifications ============
            .addCase(fetchNotifications.pending, (state) => {
                state.notifications.loading = true;
                state.notifications.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.notifications.loading = false;
                state.notifications.list = action.payload.notifications || [];
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.notifications.loading = false;
                state.notifications.error = action.payload;
            })

            // ============ Create Job ============
            .addCase(createJob.pending, (state) => {
                state.jobs.loading = true;
                state.jobs.error = null;
            })
            .addCase(createJob.fulfilled, (state) => {
                state.jobs.loading = false;
                // Will refetch jobs after creation
            })
            .addCase(createJob.rejected, (state, action) => {
                state.jobs.loading = false;
                state.jobs.error = action.payload;
            })

            // ============ Delete Job ============
            .addCase(deleteJob.fulfilled, (state, action) => {
                state.jobs.list = state.jobs.list.filter(job => job._id !== action.payload.jobId);
                state.jobs.totalJobs = Math.max(0, state.jobs.totalJobs - 1);
            })
            .addCase(deleteJob.rejected, (state, action) => {
                state.jobs.error = action.payload;
            })

            // ============ Toggle Job Active ============
            .addCase(toggleJobActive.fulfilled, (state, action) => {
                const job = state.jobs.list.find(j => j._id === action.payload.jobId);
                if (job) {
                    job.active = action.payload.active;
                    // Update active count
                    state.jobs.activeJobs = state.jobs.list.filter(j => j.active).length;
                }
            })
            .addCase(toggleJobActive.rejected, (state, action) => {
                state.jobs.error = action.payload;
            })

            // ============ Update Application Status ============
            .addCase(updateApplicationStatus.fulfilled, (state, action) => {
                const app = state.applications.list.find(a => a.id === action.payload.applicationId);
                if (app) {
                    app.status = action.payload.status;
                    app.unread = false;
                }
            })
            .addCase(updateApplicationStatus.rejected, (state, action) => {
                state.applications.error = action.payload;
            })

            // ============ Mark Notification Read ============
            .addCase(markNotificationRead.fulfilled, (state, action) => {
                const notif = state.notifications.list.find(n => n._id === action.payload.notificationId);
                if (notif) {
                    notif.is_read = true;
                }
            })

            // ============ Delete Notification ============
            .addCase(deleteNotification.fulfilled, (state, action) => {
                state.notifications.list = state.notifications.list.filter(
                    n => n._id !== action.payload.notificationId
                );
            })

            // ============ Fetch User Profile ============
            .addCase(fetchUserProfile.pending, (state) => {
                state.userProfile.loading = true;
                state.userProfile.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.userProfile.loading = false;
                state.userProfile.data = action.payload;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.userProfile.loading = false;
                state.userProfile.error = action.payload;
            });
    }
});

// Export actions
export const { 
    clearJobsError, 
    clearApplicationsError, 
    clearNotificationsError,
    clearUserProfileError,
    clearUserProfile,
    resetRecruiterState 
} = recruiterSlice.actions;

// Export reducer
export default recruiterSlice.reducer;
