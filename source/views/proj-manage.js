function openModal() {
    document.getElementById("taskModal").style.display = "block";
}

function closeModal() {
    document.getElementById("taskModal").style.display = "none";
}

function openFinishProjectModal() {
    const pendingTasks = document.querySelectorAll('.in-progress, .review, .assigned');
    const pendingTasksWarning = document.getElementById("pendingTasksWarning");
    
    if (pendingTasks.length > 0) {
      pendingTasksWarning.style.display = "block";
    } else {
      pendingTasksWarning.style.display = "none";
    }
    
    document.getElementById("finishProjectModal").style.display = "block";
}

function closeFinishProjectModal() {
    document.getElementById("finishProjectModal").style.display = "none";
}

function finishProject() {
    const pendingTasks = document.querySelectorAll('.in-progress, .review, .assigned');
    pendingTasks.forEach(task => {
      const statusLabel = task.querySelector('.status-label');
      statusLabel.textContent = "Completed";
      statusLabel.className = "status-label completed";
      const extendButton = task.querySelector('.extend-deadline-btn');
      if (extendButton) extendButton.remove();
    });
    
    const projectStatus = document.getElementById('projectStatus');
    projectStatus.textContent = "Finished";
    projectStatus.className = "project-status project-completed";
    
    const finishButton = document.querySelector('.finish-project-btn');
    finishButton.style.display = "none";
    
    closeFinishProjectModal();
    showNotification("Project marked as finished successfully!");
}

function openStatusModal(link) {
    const modal = document.getElementById("statusModal");
    const githubLink = document.getElementById("githubLink");
    githubLink.href = link;
    githubLink.textContent = link;
    modal.style.display = "block";
}

function closeStatusModal() {
    document.getElementById("statusModal").style.display = "none";
}

window.onclick = function(event) {
    if (event.target == document.getElementById("taskModal")) {
      closeModal();
    }
    if (event.target == document.getElementById("finishProjectModal")) {
      closeFinishProjectModal();
    }
    if (event.target == document.getElementById("statusModal")) {
      closeStatusModal();
    }
}

function createNewTask() {
    const title = document.getElementById("taskTitle").value;
    const description = document.getElementById("taskDescription").value;
    const assignToSelect = document.getElementById("assignTo");
    const assignedTo = assignToSelect.options[assignToSelect.selectedIndex].text;
    const dueDate = document.getElementById("dueDate").value;
    
    if (!title || !description || assignToSelect.selectedIndex === 0 || !dueDate) {
      showNotification("Please fill in all fields");
      return;
    }
    
    const formattedDate = formatDate(dueDate);
    const githubUsername = assignedTo.split(" ")[0].toLowerCase();
    const repoName = title.toLowerCase().replace(/\s+/g, "-").substring(0, 15);
    const githubLink = `github.com/${githubUsername}/${repoName}`;
    
    const taskHTML = `
      <div class="task-card">
        <div class="task-header">
          <h3 class="task-title">${title}</h3>
          <span class="status-label assigned">Assigned</span>
        </div>
        <div class="task-meta">
          <div>Assigned to: ${assignedTo}</div>
          <div>Due: ${formattedDate}</div>
        </div>
        <p class="task-description">${description}</p>
        <div class="task-actions">
          <button class="task-btn check-status-btn" onclick="openStatusModal('${githubLink}')">Check Status</button>
          <button class="task-btn extend-deadline-btn" onclick="extendDeadline('${title}')">Extend Deadline</button>
        </div>
      </div>
    `;
    
    const tasksList = document.getElementById("tasks-list");
    tasksList.insertAdjacentHTML('afterbegin', taskHTML);
    
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskDescription").value = "";
    document.getElementById("assignTo").selectedIndex = 0;
    document.getElementById("dueDate").value = "";
    
    closeModal();
    showNotification("New task created successfully");
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

let actionType = "";

function showFeedbackForm(type) {
    actionType = type;
    document.getElementById("review-actions").style.display = "none";
    document.getElementById("feedback-form").style.display = "block";
    
    const placeholder = type === "approve" ? 
      "Add any feedback before approving this task..." : 
      "Please explain why you're rejecting this task...";
    document.getElementById("feedback-text").placeholder = placeholder;
}

function cancelFeedback() {
    document.getElementById("review-actions").style.display = "flex";
    document.getElementById("feedback-form").style.display = "none";
    document.getElementById("feedback-text").value = "";
}

function submitFeedback() {
    const feedbackText = document.getElementById("feedback-text").value;
    const taskCard = document.getElementById("api-docs-task"); // Specific to Ap.html
    
    if (actionType === "approve") {
      const statusLabel = taskCard.querySelector(".status-label");
      statusLabel.textContent = "Completed";
      statusLabel.className = "status-label completed";
      const extendButton = taskCard.querySelector('.extend-deadline-btn');
      if (extendButton) extendButton.remove();
      showNotification("Task approved and feedback sent to Lisa Chen");
    } else {
      const statusLabel = taskCard.querySelector(".status-label");
      statusLabel.textContent = "In Progress";
      statusLabel.className = "status-label in-progress";
      showNotification("Task returned to Lisa Chen with feedback");
    }
    
    document.getElementById("feedback-form").style.display = "none";
    const actionsDiv = document.getElementById("review-actions");
    actionsDiv.innerHTML = `
      <button class="task-btn check-status-btn" onclick="openStatusModal('github.com/lisac/api-docs')">Check Status</button>
      ${actionType !== 'approve' ? `<button class="task-btn extend-deadline-btn" onclick="extendDeadline('Write API Documentation')">Extend Deadline</button>` : ''}
    `;
    actionsDiv.style.display = "flex";
}

function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.display = "block";
    notification.style.opacity = "1";
    
    setTimeout(function() {
      notification.style.opacity = "0";
      setTimeout(function() {
        notification.style.display = "none";
      }, 300);
    }, 3000);
}

function extendDeadline(taskTitle) {
    const taskCard = Array.from(document.querySelectorAll('.task-card')).find(
      card => card.querySelector('.task-title').textContent === taskTitle
    );
    
    if (!taskCard) return;
    
    const dueDateElement = taskCard.querySelector('.task-meta div:nth-child(2)');
    let currentDueDate = new Date(dueDateElement.textContent.replace('Due: ', ''));
    
    currentDueDate.setDate(currentDueDate.getDate() + 7);
    const formattedDate = formatDate(currentDueDate.toISOString().split('T')[0]);
    
    dueDateElement.textContent = `Due: ${formattedDate}`;
    showNotification(`Deadline for "${taskTitle}" extended to ${formattedDate}`);
}

function removeMember(memberName) {
    const memberElement = Array.from(document.querySelectorAll('.member')).find(
      member => member.querySelector('.member-name').textContent === memberName
    );
    
    if (!memberElement) return;
    
    memberElement.remove();
    
    const tasks = document.querySelectorAll('.task-card');
    tasks.forEach(task => {
      const assignedTo = task.querySelector('.task-meta div:first-child');
      if (assignedTo.textContent === `Assigned to: ${memberName}`) {
        task.remove();
      }
    });
    
    showNotification(`${memberName} has been removed from the project and their tasks have been deleted`);
}