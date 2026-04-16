const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const {
  User,
  Project,
  Notification,
  JobApplication,
  Doubt,
  JoinRequest,
  ProjectMember,
} = require('../database');

function walkPlan(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);

  if (Array.isArray(node)) {
    node.forEach((child) => walkPlan(child, visit));
    return;
  }

  Object.keys(node).forEach((key) => {
    walkPlan(node[key], visit);
  });
}

function summarizeExplain(explain) {
  const stageSet = new Set();
  const indexSet = new Set();

  walkPlan(explain?.queryPlanner?.winningPlan, (node) => {
    if (typeof node.stage === 'string') stageSet.add(node.stage);
    if (typeof node.indexName === 'string') indexSet.add(node.indexName);
  });

  walkPlan(explain?.executionStats?.executionStages, (node) => {
    if (typeof node.stage === 'string') stageSet.add(node.stage);
    if (typeof node.indexName === 'string') indexSet.add(node.indexName);
  });

  const stages = Array.from(stageSet);
  const indexes = Array.from(indexSet);

  let scanType = 'UNKNOWN';
  if (stages.includes('COLLSCAN') && !stages.includes('IXSCAN')) {
    scanType = 'COLLSCAN';
  } else if (stages.includes('IXSCAN')) {
    scanType = 'IXSCAN';
  }

  return {
    scanType,
    stages,
    indexes,
    nReturned: explain?.executionStats?.nReturned ?? null,
    totalDocsExamined: explain?.executionStats?.totalDocsExamined ?? null,
    totalKeysExamined: explain?.executionStats?.totalKeysExamined ?? null,
    executionTimeMillis: explain?.executionStats?.executionTimeMillis ?? null,
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# MongoDB Query Plan Evidence');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push('');
  lines.push('| Query | API Mapping | Scan Type | Docs Examined | Keys Examined | Returned | Time (ms) | Indexes |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | --- |');

  report.results.forEach((item) => {
    lines.push(`| ${item.name} | ${item.apiMapping} | ${item.summary.scanType} | ${item.summary.totalDocsExamined ?? '-'} | ${item.summary.totalKeysExamined ?? '-'} | ${item.summary.nReturned ?? '-'} | ${item.summary.executionTimeMillis ?? '-'} | ${item.summary.indexes.join(', ') || '-'} |`);
  });

  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- IXSCAN indicates index-backed query execution.');
  lines.push('- COLLSCAN indicates full collection scan and should be optimized for frequent paths.');
  lines.push('- Raw explain payload is stored in the paired JSON file.');
  lines.push('');

  return lines.join('\n');
}

async function run() {
  const outputDir = path.resolve(__dirname, '..', '..', 'docs', 'performance');
  const jsonOut = path.join(outputDir, 'query-plan-evidence.json');
  const mdOut = path.join(outputDir, 'query-plan-evidence.md');

  await mongoose.connect(process.env.MONGODB_URI);

  const sampleUser = (await User.findOne({ role: 'user' }).lean()) || (await User.findOne().lean());
  const sampleProject = await Project.findOne().lean();

  const userId = sampleUser?._id;
  const projectId = sampleProject?._id;

  const checks = [
    {
      name: 'projects_topic_status_deadline',
      apiMapping: '/api/project and /api/search/projects',
      run: () => Project.find({ topic: 'Web Development', status: 'active' }).sort({ deadline: 1 }).limit(20),
    },
    {
      name: 'doubts_public_timestamp',
      apiMapping: '/api/doubts',
      run: () => Doubt.find({ visible_to_all: true }).sort({ timestamp: -1 }).limit(20),
    },
  ];

  if (userId) {
    checks.push(
      {
        name: 'notifications_user_unread_createdAt',
        apiMapping: '/api/notifications and /api/job_not',
        run: () => Notification.find({ user_id: userId, is_read: false }).sort({ createdAt: -1 }).limit(20),
      },
      {
        name: 'jobApplications_user_dateApplied',
        apiMapping: '/api/job and /api/job_not',
        run: () => JobApplication.find({ user_id: String(userId) }).sort({ date_applied: -1 }).limit(20),
      },
      {
        name: 'joinRequests_user_pending_requestedAt',
        apiMapping: '/api/joined-projects and /api/notifications',
        run: () => JoinRequest.find({ user_id: userId, status: 'pending' }).sort({ requested_at: -1 }).limit(20),
      }
    );
  }

  if (projectId && userId) {
    checks.push({
      name: 'projectMembers_project_user',
      apiMapping: '/api/project/:id and chat member routes',
      run: () => ProjectMember.find({ project_id: projectId, user_id: userId }).limit(20),
    });
  }

  const results = [];

  for (const check of checks) {
    const explain = await check.run().explain('executionStats');
    results.push({
      name: check.name,
      apiMapping: check.apiMapping,
      summary: summarizeExplain(explain),
      explain,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sampleUserId: userId ? String(userId) : null,
    sampleProjectId: projectId ? String(projectId) : null,
    results,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdOut, toMarkdown(report));

  console.log(`Saved: ${jsonOut}`);
  console.log(`Saved: ${mdOut}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err.message);
  try {
    await mongoose.disconnect();
  } catch {
  }
  process.exit(1);
});
