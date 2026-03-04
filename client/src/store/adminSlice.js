import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching dashboard data
export const fetchDashboardData = createAsyncThunk(
    'admin/fetchDashboardData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/admin/dashboard-data', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            const data = await response.json();
            return data.dashboardData;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for fetching students data
export const fetchStudentsData = createAsyncThunk(
    'admin/fetchStudentsData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/students', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch students data');
            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for fetching recruiters data
export const fetchRecruitersData = createAsyncThunk(
    'admin/fetchRecruitersData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/admin-rec/data', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch recruiters data');
            const data = await response.json();
            return data.recruiters;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for fetching projects data
export const fetchProjectsData = createAsyncThunk(
    'admin/fetchProjectsData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/projects', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch projects data');
            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for fetching doubts data
export const fetchDoubtsData = createAsyncThunk(
    'admin/fetchDoubtsData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/admin-doubts/data', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch doubts data');
            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for fetching messages data
export const fetchMessagesData = createAsyncThunk(
    'admin/fetchMessagesData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/admin-mess/data', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch messages data');
            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for fetching profile data
export const fetchProfileData = createAsyncThunk(
    'admin/fetchProfileData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/admin-prof/data', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch profile data');
            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for fetching platform administrators
export const fetchPlatformAdmins = createAsyncThunk(
    'admin/fetchPlatformAdmins',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/platform-admins', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch platform administrators');
            const data = await response.json();
            return data.administrators || [];
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for creating a platform administrator
export const createPlatformAdmin = createAsyncThunk(
    'admin/createPlatformAdmin',
    async ({ email, passkey, adminId }, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/platform-admins', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, passkey, adminId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create administrator');
            return data.administrator;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    // Dashboard
    dashboardData: {
        adminName: 'Admin',
        adminRole: 'Super Admin',
        period: '30 days',
        dashboardCards: []
    },
    dashboardLoading: false,
    dashboardError: null,

    // Students
    students: [],
    studentsLoading: false,
    studentsError: null,

    // Recruiters
    recruiters: [],
    recruitersLoading: false,
    recruitersError: null,

    // Projects
    projects: [],
    projectsLoading: false,
    projectsError: null,

    // Doubts
    doubts: [],
    doubtsLoading: false,
    doubtsError: null,

    // Messages
    messages: {
        conversations: [],
        stats: {
            totalConversations: 0,
            flaggedConversations: 0,
            messagesToday: 0,
            responseRate: 0
        }
    },
    messagesLoading: false,
    messagesError: null,

    // Profile
    profile: {
        fullName: '',
        email: '',
        phone: '',
        role: 'Super Admin',
        joined: '',
        lastLogin: ''
    },
    profileLoading: false,
    profileError: null,

    // Platform administrators
    platformAdmins: [],
    platformAdminsLoading: false,
    platformAdminsError: null,
    createPlatformAdminLoading: false,
    createPlatformAdminError: null
};

const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        clearErrors: (state) => {
            state.dashboardError = null;
            state.studentsError = null;
            state.recruitersError = null;
            state.projectsError = null;
            state.doubtsError = null;
            state.messagesError = null;
            state.profileError = null;
        },
        updateProfile: (state, action) => {
            state.profile = { ...state.profile, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        // Dashboard
        builder
            .addCase(fetchDashboardData.pending, (state) => {
                state.dashboardLoading = true;
                state.dashboardError = null;
            })
            .addCase(fetchDashboardData.fulfilled, (state, action) => {
                state.dashboardLoading = false;
                state.dashboardData = action.payload;
            })
            .addCase(fetchDashboardData.rejected, (state, action) => {
                state.dashboardLoading = false;
                state.dashboardError = action.payload;
            })
            // Students
            .addCase(fetchStudentsData.pending, (state) => {
                state.studentsLoading = true;
                state.studentsError = null;
            })
            .addCase(fetchStudentsData.fulfilled, (state, action) => {
                state.studentsLoading = false;
                state.students = action.payload;
            })
            .addCase(fetchStudentsData.rejected, (state, action) => {
                state.studentsLoading = false;
                state.studentsError = action.payload;
            })
            // Recruiters
            .addCase(fetchRecruitersData.pending, (state) => {
                state.recruitersLoading = true;
                state.recruitersError = null;
            })
            .addCase(fetchRecruitersData.fulfilled, (state, action) => {
                state.recruitersLoading = false;
                state.recruiters = action.payload;
            })
            .addCase(fetchRecruitersData.rejected, (state, action) => {
                state.recruitersLoading = false;
                state.recruitersError = action.payload;
            })
            // Projects
            .addCase(fetchProjectsData.pending, (state) => {
                state.projectsLoading = true;
                state.projectsError = null;
            })
            .addCase(fetchProjectsData.fulfilled, (state, action) => {
                state.projectsLoading = false;
                state.projects = action.payload;
            })
            .addCase(fetchProjectsData.rejected, (state, action) => {
                state.projectsLoading = false;
                state.projectsError = action.payload;
            })
            // Doubts
            .addCase(fetchDoubtsData.pending, (state) => {
                state.doubtsLoading = true;
                state.doubtsError = null;
            })
            .addCase(fetchDoubtsData.fulfilled, (state, action) => {
                state.doubtsLoading = false;
                state.doubts = action.payload;
            })
            .addCase(fetchDoubtsData.rejected, (state, action) => {
                state.doubtsLoading = false;
                state.doubtsError = action.payload;
            })
            // Messages
            .addCase(fetchMessagesData.pending, (state) => {
                state.messagesLoading = true;
                state.messagesError = null;
            })
            .addCase(fetchMessagesData.fulfilled, (state, action) => {
                state.messagesLoading = false;
                state.messages = action.payload;
            })
            .addCase(fetchMessagesData.rejected, (state, action) => {
                state.messagesLoading = false;
                state.messagesError = action.payload;
            })
            // Profile
            .addCase(fetchProfileData.pending, (state) => {
                state.profileLoading = true;
                state.profileError = null;
            })
            .addCase(fetchProfileData.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.profile = action.payload;
            })
            .addCase(fetchProfileData.rejected, (state, action) => {
                state.profileLoading = false;
                state.profileError = action.payload;
            })
            // Platform administrators - list
            .addCase(fetchPlatformAdmins.pending, (state) => {
                state.platformAdminsLoading = true;
                state.platformAdminsError = null;
            })
            .addCase(fetchPlatformAdmins.fulfilled, (state, action) => {
                state.platformAdminsLoading = false;
                state.platformAdmins = action.payload;
            })
            .addCase(fetchPlatformAdmins.rejected, (state, action) => {
                state.platformAdminsLoading = false;
                state.platformAdminsError = action.payload;
            })
            // Platform administrators - create
            .addCase(createPlatformAdmin.pending, (state) => {
                state.createPlatformAdminLoading = true;
                state.createPlatformAdminError = null;
            })
            .addCase(createPlatformAdmin.fulfilled, (state, action) => {
                state.createPlatformAdminLoading = false;
                if (action.payload) {
                    state.platformAdmins.unshift(action.payload);
                }
            })
            .addCase(createPlatformAdmin.rejected, (state, action) => {
                state.createPlatformAdminLoading = false;
                state.createPlatformAdminError = action.payload;
            });
    }
});

export const { clearErrors, updateProfile } = adminSlice.actions;
export default adminSlice.reducer;
