import React from 'react';

const ProjectForm = ({
    formData,
    validation,
    isFormValid,
    updateField,
    handleSubmit,
    titleFeedback,
    descFeedback,
    isSaving
}) => (
    <div className={`project-form active`} id="project-form" style={{ display: 'block' }}>
        <h2>Create New Project</h2>
        <form id="new-project-form" onSubmit={handleSubmit}>
            <div className="form-group" style={{ position: 'relative' }}>
                <label htmlFor="project-title">Project Title</label>
                <input
                    type="text"
                    id="project-title"
                    name="title"
                    required
                    maxLength="100"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className={validation.title ? 'invalid' : ''}
                />
                <span className={`field-valid-icon ${!validation.title && formData.title ? 'show' : ''}`} id="title-valid">✓</span>
                <div className={`char-counter ${titleFeedback.class}`} id="title-counter">{titleFeedback.count}</div>
                <div className="field-error" id="title-error">{validation.title}</div>
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
                <label htmlFor="project-description">Project Description</label>
                <textarea
                    id="project-description"
                    name="description"
                    rows="3"
                    required
                    maxLength="500"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className={validation.description ? 'invalid' : ''}
                ></textarea>
                <span className={`field-valid-icon ${!validation.description && formData.description ? 'show' : ''}`} id="description-valid" style={{ top: '30px' }}>✓</span>
                <div className={`char-counter ${descFeedback.class}`} id="description-counter">{descFeedback.count}</div>
                <div className="field-error" id="description-error">{validation.description}</div>
            </div>
            <div className="form-group">
                <label htmlFor="project-topic">Project Topic</label>
                <select
                    id="project-topic"
                    name="topic"
                    required
                    value={formData.topic}
                    onChange={(e) => updateField('topic', e.target.value)}
                    className={validation.topic ? 'invalid' : ''}
                >
                    <option value="" disabled>Select a topic</option>
                    <option value="blockchain">Blockchain</option>
                    <option value="cyber-security">Cyber Security</option>
                    <option value="robotics">Robotics</option>
                    <option value="web-dev">Web Development</option>
                    <option value="deep learning">Deep Learning</option>
                    <option value="data science">Data Science</option>
                </select>
                <div className="field-error" id="topic-error">{validation.topic}</div>
            </div>
            <div className="form-group">
                <label htmlFor="project-capacity">Number of Members</label>
                <div className="capacity-control">
                    <button type="button" className="capacity-btn" onClick={() => updateField('capacity', Math.max(3, formData.capacity - 1))} disabled={formData.capacity <= 3}>−</button>
                    <input
                        type="number"
                        id="project-capacity"
                        name="capacity"
                        min="3"
                        max="20"
                        required
                        value={formData.capacity}
                        readOnly
                        className={validation.capacity ? 'invalid' : ''}
                        style={{ width: '100px', textAlign: 'center' }}
                    />
                    <button type="button" className="capacity-btn" onClick={() => updateField('capacity', Math.min(20, formData.capacity + 1))} disabled={formData.capacity >= 20}>+</button>
                </div>
                <div className="field-error" id="capacity-error">{validation.capacity}</div>
            </div>
            <div className="form-group">
                <label htmlFor="project-deadline">Deadline</label>
                <input
                    type="date"
                    id="project-deadline"
                    name="deadline"
                    required
                    value={formData.deadline}
                    onChange={(e) => updateField('deadline', e.target.value)}
                    className={validation.deadline ? 'invalid' : ''}
                />
                <div className="field-error" id="deadline-error">{validation.deadline}</div>
            </div>
            <button type="submit" id="create-project-btn" disabled={!isFormValid}>Create Project</button>
        </form>
        <div className={`auto-save-indicator ${isSaving ? 'show' : ''}`} id="auto-save-indicator">
            Draft saved
        </div>
    </div>
);

export default ProjectForm;
