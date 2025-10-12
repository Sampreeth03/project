Group ID: 02
- Project title: RELABTeams
- SPOC: J. Siva Sampreeth, S20230010110, sivasampreeth.j23@iiits.in
- Team members & roles: based on division below

## Member-wise division

- Sampreeth (@Sampreeth03)
  - Resolution: Wired GET /stud to render admin-stud with activePage="students". Open: remove‑leader bug, navbar glitches.
  - DOM form validation: N/A.
  - DHTML: admin-stud.ejs sortable headers working with search + indicator and guarded listeners; profile.ejs chip editor for Skills/Interests.
  - AJAX: Admin pages load cards/data via XMLHttpRequest.
  - async: Async XHR; instant table/profile updates.

- Surya (@satyasurya123)
  - Resolution: Set activePage="students"; guarded sidebar/search; verified job cards (jobId and resume name="resume"). Open: “view task” on notification page.
  - DOM form validation: N/A.
  - DHTML: Dashboard/userhome search filters; dynamic card rendering.
  - AJAX: userhome.ejs loads project cards via XMLHttpRequest.
  - async: setTimeout to simulate loading; async XHR.

- Eswar (@EswarbabuEttaligalla)
  - Resolution: Pending—recruiter notification/application pages not loading.
  - DOM form validation: login.ejs, signup.ejs, create_proj.ejs with inline errors and disabled submit until valid.
  - DHTML: Inline error areas and enable/disable states.
  - AJAX: doubt.ejs replies via JSON XHR POST /reply (delegated handler).
  - async: Async XHR for replies.

- Srihesh (@Srihesh)
  - Resolution: Pending—self‑reply bug.
  - DHTML: Inline status/feedback updates; Quick Profile modal content injection.
  - AJAX: applyjobs.ejs FormData POST /apply-job; project_details.ejs JSON POST /task/review-submission; GET /profile-data/:id.
  - fetch: Approve/reject via fetch post json+toasts, fetch post formdata to applyjobs page
  - async: Async XHR with optimistic UI (flip to Applied, update rows).


- Shiva (@shivasaiprasad03)
  - Resolution: Pending—join‑project profile flow; payment popup after 3–5 project creations (no API).
  - DOM form validation: Form validation done in create_jobs page form
  - DHTML: Minimal UI updates after actions.
  - AJAX: proj_notif.ejs POST /approve-join-request and /reject-join-request with row removal + toasts; clear.ejs FormData POST /ask to add new doubt.
  - async: Async XHR; immediate DOM updates.


# RELABTeams

A simple platform to create or join real projects, ask doubts inside the project, and build a verified portfolio. Recruiters post jobs and can see real contributions. Admins keep the platform safe. Free for up to three projects; upgrade to make more and get extra features.

## Business case (simple English)
Students and makers need real projects and quick help. Recruiters want to see real work, not just a resume. RELABTeams connects both. People can do up to three projects for free; heavy users pay to create more. Recruiters can list jobs and hire based on actual project activity. Admins verify and moderate. This gives faster learning for students and better hiring for companies.

## Main features
- Projects: create, join, invite teammates.
- Doubts/Q&A: ask inside tasks; replies inline.
- Portfolio: auto list of your tasks and commits.
- Jobs: recruiter job board; apply with your real work.
- Notifications and toasts for key actions.
- Limits: free up to 3 projects, then a simple upgrade popup.

## Roles
- Member/Mentor: work on projects, ask/answer doubts, manage tasks, keep a portfolio.
- Recruiter: company profile, post jobs, shortlist, message, schedule interviews.
- Admin: verify recruiters/mentors, approve/flag posts, remove spam, manage subscriptions, view analytics.

## How to run (local)
- Prerequisites: macOS, Node.js 18+, npm 9+, VS Code.
- Steps (typical Express + EJS app):
  1) Open terminal in the project folder.
  2) npm install
  3) npm run dev (or: node server.js)
  4) Open http://localhost:3000
- If the app has separate frontend/backend, run install and dev in each folder. Use VS Code Live Server to open plain HTML if needed.

## Key files and what they do
- server.js → GET /stud renders admin-stud.ejs with activePage="students".
- admin-stud.ejs → search + click‑to‑sort table with indicator; safe on empty data.
- profile.ejs → chip editor for Skills and Interests; POST /profile on Save.
- login.ejs, signup.ejs, create_proj.ejs → strong client validation and inline errors.
- proj_notif.ejs → Approve/Reject join requests via POST; instant UI + toasts.
- applyjobs.ejs → Apply via FormData; card flips to “Applied”.
- project_details.ejs → Task review via JSON POST; inline status + feedback; quick profile modal via GET /profile-data/:id.
- doubt.ejs / clear.ejs → reply via JSON and ask via FormData; delegated handlers and toasts.
- userhome.ejs + dashboard → cards via XMLHttpRequest; setTimeout loading; search filters.

## Data model (high level)
- User(id, name, email, role[member|recruiter|admin], profile, skills, interests)
- Project(id, ownerId, title, description, tags, createdAt)
- Membership(userId, projectId, role[owner|member|mentor])
- Task(id, projectId, title, status, assigneeId, feedback)
- Doubt(id, projectId or taskId, authorId, text, status[open|solved], createdAt)
- Reply(id, doubtId, authorId, text, isPrivate, createdAt)
- Job(id, recruiterId, companyId, title, skills, location, type, status)
- Application(id, jobId, userId, resumeUrl, status)
- Notification(id, userId, kind, payload, readAt)
- Subscription(id, userId or companyId, plan, renewsAt)
- Payment(id, subscriptionId, amount, status, createdAt)

## Demo link and timestamps
- Demo video: (add link later)
- Timestamps:
  - 00:00–00:50 Title + business case
  - 00:50–02:00 Form validation demo (login, signup, create project)
  - 02:00–03:30 DHTML demo (admin-stud sort+search; profile chips)
  - 03:30–06:00 AJAX demos (join approval; apply job; task review)
  - 06:00–06:30 Per‑member contributions
  - 06:30–07:30 Wrap‑up and where evidence is located

## Evidence locations
- network_evidence/ → Network tab screenshots for each async flow
- demo_assets/ → screenshots for them
- logs/git-logs.txt → key commits
- notes/acceptance.md → what we checked before recording

## Contact
- For questions: sivasampreeth.j23@iiits.in