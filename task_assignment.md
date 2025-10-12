# RELABTeams – Task Assignment

## @Sampreeth03
- Files
  - admin-stud.ejs
  - profile.ejs
  - server.js (GET /stud render only)

- Bugs/Issues
  - Members have permission to remove leader (must remove that).
  - Nav bar problems.

- Admin Students (admin-stud.ejs)
  - Make column headers clickable to sort by:
    - Student
    - Hosted Projects
    - Tasks Completed
  - Sorting must work together with the existing search filter.
  - Add a simple sort indicator.
  - Guard sidebar and search toggle listeners.
  - Ensure the page works even if `studentsData` is empty.

- Server wiring (server.js)
  - In `GET /stud`, render `admin-stud` with `activePage = "students"` so the sidebar highlights correctly.

- Profile (profile.ejs)
  - Convert Skills and Interests to chip lists you can add and remove inline.
  - On Save, submit the final list via the existing `POST /profile`.
  - No schema changes.

- Acceptance
  - Students table can be searched and sorted instantly without reload.
  - Profile chips add and remove smoothly and Save still works.

- Admin pages work done (notes)
  - Admin home page
    - Included search option.
    - Loading cards through asynchronous function.
    - Fetching cards through XMLHttpRequest.
  - Admin student page
    - Search functionality.
    - Loading table contents through `setTimeout`.
    - Loading data through XMLHttpRequest.
  - Admin recruiter page
    - Search functionality.
    - XMLHttpRequest.

---

## @EswarbabuEttaligalla
- Files
  - login.ejs
  - signup.ejs
  - create_proj.ejs

- Bug/Issue
  - Recruiter notification/application page not working (check both).

- login.ejs (Validation)
  - Validate email format and password policy on blur and input.
  - Show inline errors.
  - Disable Sign In until both fields are valid.
  - On submit, block and focus the first invalid field.

- signup.ejs (Validation)
  - Name required.
  - Email format check.
  - Password policy: at least 6 chars, one uppercase, one special.
  - Confirm must match.
  - Live per-field feedback and a small summary if submit is blocked.
  - Disable Sign Up until valid.

- create_proj.ejs (GET /e) (Validation)
  - Title at least 3 chars.
  - Capacity 1–20.
  - Topic required.
  - Deadline must be a future date.
  - One inline error area; highlight the invalid field.
  - Disable Create until valid.

- Acceptance
  - All three forms block invalid submits.
  - Clear inline messages.
  - Enable submit only when valid.
  - No page reload required for feedback.

- doubt.ejs — Inline Reply via XHR (JSON)
  - Markup sanity
    - Each doubt card has `data-doubt-id`.
    - Each replies container targetable by that id.
    - Each reply form has an input named `text`; optional `isPrivate` checkbox if supported.
  - Replace old behavior with delegated submit handling (document-level listener targeting `.reply-form`).
  - Collect `doubtId` from data attribute, `text` from the input, `isPrivate` from checkbox.
  - Send XMLHttpRequest:
    - `POST /reply`
    - Headers: `Content-Type: application/json`
    - Body: `JSON.stringify({ doubtId, text, isPrivate })`
    - `responseType = "json"`
  - On XHR load
    - If success: append the new reply under the correct doubt, clear the input, show success toast.
    - If failure: show the server message in a toast; keep the input.
  - On XHR error/timeout
    - Show an error toast; keep the input.
  - Server rule to surface
    - If the original poster tries to reply first, show: “Wait for another user to reply before you add a follow-up.”

---

## @shivasaiprasad03
- Files
  - proj_notif.ejs

- Issues
  - Profile page when about to join project.
  - Payment popup after 3–5 projects creation (no API needed).

- Join requests (proj_notif.ejs)
  - Intercept Approve and Reject actions and call:
    - `POST /approve-join-request`
    - `POST /reject-join-request`
  - On success, remove that request row/card immediately and show a small toast.
  - On failure, show a non‑blocking error toast and keep the row.
  - Handle “already processed” and “project full” responses gracefully.

- Acceptance
  - Approve or reject updates the UI instantly.
  - Row disappears and a confirmation toast appears.
  - No page reload.

- clear.ejs — Ask a Doubt via XHR + FormData
  - Markup sanity
    - Inputs named `message` and `file-input`.
    - A container that holds the list of doubts (so you can prepend the new one).
  - Replace old behavior
    - Prevent the form’s default submit.
    - Build a `FormData` from the form (auto-includes `message` and `file-input`).
  - Send XMLHttpRequest:
    - `POST /ask`
    - Do not set `Content-Type` manually (browser sets it for FormData).
    - `responseType = "json"`
  - On XHR load
    - If `success === true`: prepend a new doubt card (author, text, timestamp), reset the form, show success toast.
    - If `success === false`: show a non‑blocking error toast; keep inputs.
  - On XHR error/timeout
    - Show an error toast; keep inputs.

---

## @Srihesh
- Files
  - applyjobs.ejs
  - project_details.ejs

- Issue
  - Self reply problem.

- Apply to job (applyjobs.ejs)
  - Intercept form submit and send `FormData` with `jobId` and `resume`.
  - Client check for `pdf`, `doc`, `docx` before sending.
  - On success, clear inputs, disable the button, and switch the card state to “Applied” in place.

- Task review (project_details.ejs)
  - Intercept Accept and Reject, capture feedback.
  - Send JSON `{ taskId, projectId, action, feedback }` to `POST /task/review-submission`.
  - On success, update the task row status and feedback immediately.

- Acceptance
  - Applying flips the job card to “Applied” without reload.
  - Reviewing updates status and feedback inline.

- project-details.ejs — Member Quick Profile Modal via XHR (GET)
  - Markup sanity
    - Add a “View Profile” control with `data-user-id` on each member card.
    - Ensure a modal shell exists or is created on first use.
  - Replace old behavior
    - On click of “View Profile”, create an XMLHttpRequest to `GET /profile-data/:id`.
    - `responseType = "json"`.
  - On XHR load
    - If success: inject user fields (name, email, bio, skills, interests, resumeUrl) into the modal and open it.
    - If failure (401/404/500): show an error toast.
  - On XHR error/timeout
    - Show an error toast.
  - Accessibility
    - Close modal on overlay click and Esc; return focus to the trigger.

---

## @satyasurya123
- Issues
  - Notification page → “view task” not working.

- Fixes/verification
  - Change `activePage` for `/stud` render to `students` instead of `dashboard`.
  - Verify `admin-stud.ejs` injects `studentsData` safely and guards sidebar/search listeners.
  - Check each job card in `applyjobs.ejs` includes `jobId` and resume input name is `resume`.

- End‑to‑end test (manual)
  - Forms: invalid submits are blocked with inline errors; valid submits succeed.
  - Students page: search and sort work together with instant updates.
  - Join approval: row removed and toast shown.
  - Apply job: card becomes “Applied” without reload.
  - Task review: status and feedback update instantly.

- Pages implemented
  - userhome.ejs
    - Fetched project cards using AJAX (XMLHttpRequest) and used asynchronous JavaScript `setTimeout` to load them.
  - user dashboard
    - Search filter using DHTML.
    - Loaded cards with `setTimeout` and fetched through XMLHttpRequest.