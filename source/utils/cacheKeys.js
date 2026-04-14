/**
 * Cache Key Strategy
 * Centralized key naming for all cached data
 * Prevents key collisions and makes invalidation easier
 */

const CACHE_KEYS = {
  // User Dashboard & Profile
  USER_DASHBOARD: (userId) => `user:${userId}:dashboard`,
  USER_PROFILE: (userId) => `user:${userId}:profile`,
  USER_METRICS: (userId) => `user:${userId}:metrics`,
  USER_STATS: (userId) => `user:${userId}:stats`,
  USER_PATTERN: (userId) => `user:${userId}:*`,

  // Projects
  PROJECTS_LIST: (filters = 'all') => `projects:list:${filters}`,
  PROJECTS_BY_TOPIC: (topic) => `projects:topic:${topic}`,
  PROJECTS_JOINED: (userId) => `projects:joined:${userId}`,
  PROJECTS_CREATED: (userId) => `projects:created:${userId}`,
  PROJECT_DETAIL: (projectId) => `project:${projectId}:detail`,
  PROJECT_MEMBERS: (projectId) => `project:${projectId}:members`,
  PROJECTS_PATTERN: () => `projects:*`,
  PROJECT_PATTERN: (projectId) => `project:${projectId}:*`,

  // Recruiter Dashboard & Data
  RECRUITER_DASHBOARD: (recruiterId) => `recruiter:${recruiterId}:dashboard`,
  RECRUITER_SUMMARY: (recruiterId) => `recruiter:${recruiterId}:summary`,
  RECRUITER_JOBS: (recruiterId) => `recruiter:${recruiterId}:jobs`,
  RECRUITER_APPLICATIONS: (recruiterId) => `recruiter:${recruiterId}:applications`,
  RECRUITER_PATTERN: (recruiterId) => `recruiter:${recruiterId}:*`,

  // Admin Dashboard & Analytics
  ADMIN_SUMMARY: (adminId) => `admin:${adminId}:summary`,
  ADMIN_METRICS: (adminId) => `admin:${adminId}:metrics`,
  ADMIN_DASHBOARD: (adminId) => `admin:${adminId}:dashboard`,
  ADMIN_USERS_STATS: (adminId) => `admin:${adminId}:users:stats`,
  ADMIN_JOBS_STATS: (adminId) => `admin:${adminId}:jobs:stats`,
  ADMIN_PATTERN: (adminId) => `admin:${adminId}:*`,

  // Jobs & Applications
  JOBS_LIST: (filters = 'all') => `jobs:list:${filters}`,
  JOB_DETAIL: (jobId) => `job:${jobId}:detail`,
  JOB_APPLICATIONS: (recruiterId) => `job:${recruiterId}:applications`,
  JOBS_PATTERN: () => `jobs:*`,

  // General Patterns for Invalidation
  ALL_USER_PATTERN: (userId) => `user:${userId}:*`,
  ALL_RECRUITER_PATTERN: (recruiterId) => `recruiter:${recruiterId}:*`,
  ALL_ADMIN_PATTERN: (adminId) => `admin:${adminId}:*`,
  ALL_PROJECT_PATTERN: () => `projects:*`,
  ALL_JOB_PATTERN: () => `jobs:*`,
};

/**
 * Cache invalidation patterns for different actions
 */
const INVALIDATION_PATTERNS = {
  // On project creation
  PROJECT_CREATED: (userId, recruiterId) => [
    CACHE_KEYS.PROJECTS_LIST(),
    CACHE_KEYS.PROJECTS_CREATED(recruiterId),
    CACHE_KEYS.RECRUITER_DASHBOARD(recruiterId),
  ],

  // On project update/join
  PROJECT_UPDATED: (projectId, userId, recruiterId) => [
    CACHE_KEYS.PROJECT_DETAIL(projectId),
    CACHE_KEYS.PROJECT_MEMBERS(projectId),
    CACHE_KEYS.PROJECTS_JOINED(userId),
    CACHE_KEYS.PROJECTS_LIST(),
    CACHE_KEYS.RECRUITER_DASHBOARD(recruiterId),
  ],

  // On project approval/rejection
  PROJECT_STATUS_CHANGED: (projectId, userId, recruiterId) => [
    CACHE_KEYS.PROJECT_DETAIL(projectId),
    CACHE_KEYS.PROJECTS_JOINED(userId),
    CACHE_KEYS.USER_DASHBOARD(userId),
    CACHE_KEYS.RECRUITER_DASHBOARD(recruiterId),
  ],

  // On project deletion
  PROJECT_DELETED: (projectId, recruiterId) => [
    CACHE_KEYS.PROJECTS_LIST(),
    CACHE_KEYS.PROJECT_DETAIL(projectId),
    CACHE_KEYS.PROJECT_MEMBERS(projectId),
    CACHE_KEYS.PROJECTS_CREATED(recruiterId),
    CACHE_KEYS.RECRUITER_DASHBOARD(recruiterId),
  ],

  // On job application
  JOB_APPLIED: (recruiterId, userId, jobId) => [
    CACHE_KEYS.RECRUITER_APPLICATIONS(recruiterId),
    CACHE_KEYS.JOB_APPLICATIONS(recruiterId),
    CACHE_KEYS.JOB_DETAIL(jobId),
    CACHE_KEYS.USER_DASHBOARD(userId),
  ],

  // On profile update
  PROFILE_UPDATED: (userId) => [
    CACHE_KEYS.USER_PROFILE(userId),
    CACHE_KEYS.USER_DASHBOARD(userId),
    CACHE_KEYS.USER_METRICS(userId),
  ],

  // Clear all user caches
  USER_LOGOUT: (userId) => [
    `user:${userId}:*`,
  ],

  // Clear all recruiter caches
  RECRUITER_LOGOUT: (recruiterId) => [
    `recruiter:${recruiterId}:*`,
  ],

  // Clear all admin caches
  ADMIN_LOGOUT: (adminId) => [
    `admin:${adminId}:*`,
  ],
};

module.exports = {
  CACHE_KEYS,
  INVALIDATION_PATTERNS,
};
