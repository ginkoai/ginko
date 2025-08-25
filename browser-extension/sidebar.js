/**
 * @fileType: component
 * @status: current
 * @updated: 2025-01-18
 * @tags: browser-extension, javascript, session-management, coaching
 * @related: sidebar.html, sidebar.css
 * @priority: critical
 * @complexity: high
 * @dependencies: chrome-extension-apis
 */

// Session management state
let sessionState = {
  startTime: null,
  elapsedMinutes: 0,
  timer: null,
  lastHandoff: null,
  handoffCount: 0
};

// Coaching rules with evidence-based messaging
const coachingRules = {
  fresh: {
    minMinutes: 0,
    maxMinutes: 10,
    message: '💚 Fresh context - ideal for complex work. <a href="https://ginko.ai/evidence/fresh-context?utm_source=extension&utm_medium=coaching&utm_campaign=context" target="_blank">Learn why →</a>',
    urgency: 'info'
  },
  optimal: {
    minMinutes: 10,
    maxMinutes: 30,
    message: '<strong>Optimal collaboration zone.</strong> <a href="https://ginko.ai/evidence/optimal-zone?utm_source=extension&utm_medium=coaching&utm_campaign=optimal" target="_blank">See the research →</a>',
    urgency: 'info'
  },
  warning: {
    minMinutes: 30,
    maxMinutes: 45,
    message: '<strong>Context degrades 43% after 30 min.</strong> <a href="https://ginko.ai/evidence/context-degradation?utm_source=extension&utm_medium=coaching&utm_campaign=warning" target="_blank">View study</a> | <a href="#" data-action="handoff">Handoff now →</a>',
    urgency: 'warning'
  },
  critical: {
    minMinutes: 45,
    maxMinutes: Infinity,
    message: '<strong>Session effectiveness dropped 67%.</strong> <a href="https://ginko.ai/evidence/session-effectiveness?utm_source=extension&utm_medium=coaching&utm_campaign=critical" target="_blank">See data</a> | Generate handoff now.',
    urgency: 'critical'
  }
};

// Smart prompt generation based on session duration
function generateHandoffPrompt(minutes) {
  const base = "Generate a comprehensive session handoff that includes:";
  
  if (minutes < 15) {
    return `${base}
• What you were working on
• Current status
• Next steps`;
  }
  
  if (minutes < 30) {
    return `${base}
• What you accomplished
• Current state of the work
• Blockers or challenges encountered
• Clear next steps to continue`;
  }
  
  if (minutes < 45) {
    return `${base}
• Complete summary of work done
• All decisions made and reasoning
• Current blockers and attempted solutions
• Detailed next steps with context
• Any warnings or gotchas discovered`;
  }
  
  // Long session - comprehensive dump
  return `CRITICAL: Your session has significant context degradation. Create an exhaustive handoff including:
• Complete brain dump of everything you've done
• All context, decisions, and reasoning
• Every blocker, error, and solution attempted
• Detailed state of all work in progress
• Exact reproduction steps for any issues
• Complete next steps with full context
• Any patterns, insights, or learnings
• Files modified and why
• Dependencies or prerequisites discovered`;
}

// Template form fields configuration
const templateFormFields = {
  cleanSlate: [
    { name: 'projectOverview', label: 'Project Overview', type: 'textarea', placeholder: 'Describe what you\'re building...' },
    { name: 'userType', label: 'As a... (user role/persona)', type: 'text', placeholder: 'e.g., developer, product manager, end user', hint: 'Who will use this? Examples: developer, designer, student, admin' },
    { name: 'solution', label: 'I want... (action or goal)', type: 'text', placeholder: 'e.g., a dashboard that tracks metrics', hint: 'What capability do you need? Be specific about the solution' },
    { name: 'goal', label: 'So that... (benefit or value)', type: 'text', placeholder: 'e.g., I can make data-driven decisions', hint: 'Why is this valuable? What problem does it solve?' },
    { name: 'criteria', label: 'Success Criteria', type: 'textarea', placeholder: 'List measurable outcomes (one per line)', hint: 'How will you know it\'s working? Be specific and testable' },
    { name: 'requirements', label: 'Technical Requirements', type: 'textarea', placeholder: 'List specific requirements (one per line)', hint: 'Any technical constraints, integrations, or prerequisites' },
    { name: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any constraints or context', hint: 'Background info, constraints, or important context' }
  ],
  workplan: [
    { name: 'goal', label: 'Goal', type: 'textarea', placeholder: 'What needs to be accomplished?' },
    { name: 'timeline', label: 'Timeline', type: 'text', placeholder: 'e.g., 2 weeks, by Friday' },
    { name: 'constraints', label: 'Constraints', type: 'textarea', placeholder: 'Any limitations or requirements' },
    { name: 'status', label: 'Current Status', type: 'textarea', placeholder: 'What\'s already done?' },
    { name: 'deliverables', label: 'Expected Deliverables', type: 'textarea', placeholder: 'What does success look like?' }
  ],
  feature: [
    { name: 'featureName', label: 'Feature Name', type: 'text', placeholder: 'Name of the feature', hint: 'Short, descriptive name for this feature' },
    { name: 'userType', label: 'As a... (user role)', type: 'text', placeholder: 'e.g., admin, customer, developer', hint: 'Who will use this feature?' },
    { name: 'capability', label: 'I want... (capability)', type: 'text', placeholder: 'e.g., to export data to CSV', hint: 'What should they be able to do?' },
    { name: 'benefit', label: 'So that... (benefit)', type: 'text', placeholder: 'e.g., I can analyze it in Excel', hint: 'Why is this valuable to them?' },
    { name: 'criteria', label: 'Acceptance Criteria', type: 'textarea', placeholder: 'List testable criteria (one per line)', hint: 'Specific, measurable requirements for this feature' },
    { name: 'notes', label: 'Implementation Notes', type: 'textarea', placeholder: 'Technical approach or concerns', hint: 'Technical considerations, dependencies, or risks' }
  ],
  test: [
    { name: 'component', label: 'What to Test', type: 'text', placeholder: 'Component/function/feature name' },
    { name: 'coverage', label: 'Test Coverage', type: 'checkboxes', options: [
      'Happy path scenarios',
      'Edge cases',
      'Error handling',
      'Performance considerations'
    ]},
    { name: 'code', label: 'Code to Test', type: 'textarea', placeholder: 'Paste your code here' },
    { name: 'language', label: 'Language', type: 'select', options: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'other'] },
    { name: 'concerns', label: 'Specific Concerns', type: 'textarea', placeholder: 'What might break?' }
  ],
  debug: [
    { name: 'error', label: 'Error Message', type: 'textarea', placeholder: 'Paste the exact error message' },
    { name: 'expected', label: 'Expected Behavior', type: 'textarea', placeholder: 'What should happen?' },
    { name: 'actual', label: 'Actual Behavior', type: 'textarea', placeholder: 'What\'s happening instead?' },
    { name: 'steps', label: 'Steps to Reproduce', type: 'textarea', placeholder: 'List exact steps (one per line)' },
    { name: 'tried', label: 'What You\'ve Tried', type: 'textarea', placeholder: 'Solutions attempted so far' },
    { name: 'code', label: 'Relevant Code', type: 'textarea', placeholder: 'Paste relevant code' },
    { name: 'language', label: 'Language', type: 'select', options: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'other'] },
    { name: 'environment', label: 'Environment', type: 'text', placeholder: 'OS, version, dependencies' }
  ],
  gitCommit: [
    { name: 'files', label: 'What files did you change?', type: 'textarea', placeholder: 'e.g., sidebar.js, sidebar.css, README.md', hint: 'List files you modified, added, or deleted' },
    { name: 'changes', label: 'What did you change?', type: 'textarea', placeholder: 'e.g., Added history feature to track user prompts', hint: 'Describe the actual modifications you made' },
    { name: 'why', label: 'Why did you make these changes?', type: 'textarea', placeholder: 'e.g., Users needed to reuse previous prompts without re-entering', hint: 'Explain the problem solved or feature added' },
    { name: 'breaking', label: 'Breaking changes or issues (optional)', type: 'textarea', placeholder: 'e.g., Fixes #123, BREAKING: Changed API response format', hint: 'Any breaking changes or issue references' }
  ]
};

// Template definitions
const templates = {
  cleanSlate: {
    name: 'Clean Slate',
    description: 'Start a new project with clear structure',
    content: `I'm starting a new project and need your help.

**Project Overview**: [describe what you're building]

**User Experience**: As a [user type], I want a [solution] to help me [achieve goal]

**Success Criteria**:
- [ ] [measurable outcome]
- [ ] [measurable outcome]
- [ ] [measurable outcome]

**Technical Requirements**:
- [ ] [specific requirement]
- [ ] [specific requirement]

**Notes**: [any additional context or constraints]`
  },
  workplan: {
    name: 'Create Workplan',
    description: 'Break down complex tasks into manageable steps',
    content: `Help me create a workplan for this task.

**Goal**: [what needs to be accomplished]

**Timeline**: [deadline or timeframe]

**Constraints**: [any limitations or requirements]

**Current Status**: [what's already done, if anything]

**Expected Deliverables**: [what success looks like]`
  },
  feature: {
    name: 'Add Feature',
    description: 'Add a new feature with clear requirements',
    content: `I want to add a new feature.

**Feature Name**: [name of the feature]

**User Story**: As a [user], I want [capability] so that [benefit]

**Acceptance Criteria**:
- [ ] [specific, testable criterion]
- [ ] [specific, testable criterion]

**Implementation Notes**: [technical approach or concerns]`
  },
  test: {
    name: 'Create Test',
    description: 'Write comprehensive tests for your code',
    content: `Help me create tests for this functionality.

**What to Test**: [component/function/feature name]

**Test Coverage Needed**:
- [ ] Happy path scenarios
- [ ] Edge cases
- [ ] Error handling
- [ ] Performance considerations

**Code to Test**:
\`\`\`[language]
[paste code here]
\`\`\`

**Specific Concerns**: [what you're worried might break]`
  },
  debug: {
    name: 'Debug Problem',
    description: 'Systematic approach to fixing issues',
    content: `I need help debugging an issue.

**Error Message**: [paste exact error]

**Expected Behavior**: [what should happen]

**Actual Behavior**: [what's happening instead]

**Steps to Reproduce**: 
1. [exact step]
2. [exact step]
3. [exact step]

**What I've Tried**: [solutions attempted so far]

**Relevant Code**:
\`\`\`[language]
[paste code here]
\`\`\`

**Environment**: [OS, version, dependencies]`
  },
  gitCommit: {
    name: 'Git Commit',
    description: 'Have Claude write your commit message',
    content: `Please write a git commit message for my changes.

**What files did I change:**
[List the files you modified, added, or deleted]

**What I changed:**
[Describe what you actually changed in these files - the key modifications, additions, or deletions]

**Why I made these changes:**
[Explain the motivation - what problem does this solve? what feature does this add?]

**Additional context:**
[Any breaking changes, related issues, or important notes]

Please write a conventional commit message following these guidelines:
- First line: <type>(<scope>): <subject> (50 chars max)
- Types: feat, fix, docs, style, refactor, test, chore
- Body: Explain what and why (not how), wrapped at 72 chars
- Footer: Reference issues, breaking changes if any

Format the commit message so I can copy it directly into my git commit.`
  }
};

// DOM elements
let elements = {};
let currentTemplate = null;
let templateFormData = {};
let promptHistory = [];
const MAX_HISTORY_ITEMS = 20;

// Initialize the sidebar
document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  initializeEventListeners();
  startAutoSession();
  loadLastSession();
  updateInsights();
  
  console.log('Ginko sidebar initialized - handoff-first mode');
});

function initializeElements() {
  elements = {
    // Core elements
    sessionTime: document.getElementById('sessionTime'),
    generateHandoffBtn: document.getElementById('generateHandoffBtn'),
    coachingHint: document.getElementById('coachingHint'),
    
    // Workflow elements
    handoffWorkflow: document.getElementById('handoffWorkflow'),
    generatedPrompt: document.getElementById('generatedPrompt'),
    copyPromptBtn: document.getElementById('copyPromptBtn'),
    handoffInput: document.getElementById('handoffInput'),
    saveHandoffBtn: document.getElementById('saveHandoffBtn'),
    
    // Secondary elements
    resumeSection: document.getElementById('resumeSection'),
    resumeSessionBtn: document.getElementById('resumeSessionBtn'),
    lastSessionInfo: document.getElementById('lastSessionInfo'),
    quickTemplates: document.getElementById('quickTemplates'),
    
    // Success state
    successState: document.getElementById('successState'),
    newSessionBtn: document.getElementById('newSessionBtn'),
    
    // Template Form elements
    templateFormPanel: document.getElementById('templateFormPanel'),
    closeFormBtn: document.getElementById('closeFormBtn'),
    formTitle: document.getElementById('formTitle'),
    formDescription: document.getElementById('formDescription'),
    templateForm: document.getElementById('templateForm'),
    generateFromFormBtn: document.getElementById('generateFromFormBtn'),
    resetFormBtn: document.getElementById('resetFormBtn'),
    toastContainer: document.getElementById('toastContainer'),
    
    // History elements
    promptHistory: document.getElementById('promptHistory'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    
    // Context Tracker elements
    contextTracker: document.getElementById('contextTracker'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    statusIcon: document.getElementById('statusIcon'),
    statusMessage: document.getElementById('statusMessage'),
    
    // Insights
    toggleInsights: document.getElementById('toggleInsights'),
    insightsPanel: document.getElementById('insightsPanel'),
    closeInsights: document.getElementById('closeInsights'),
    sessionQuality: document.getElementById('sessionQuality'),
    timeSaved: document.getElementById('timeSaved'),
    handoffCount: document.getElementById('handoffCount'),
    qualityTip: document.getElementById('qualityTip'),
    handoffTip: document.getElementById('handoffTip'),
    
    // Notifications
    notification: document.getElementById('notification'),
    notificationMessage: document.getElementById('notificationMessage'),
    notificationClose: document.getElementById('notificationClose')
  };
}

function initializeEventListeners() {
  // Main handoff button
  elements.generateHandoffBtn?.addEventListener('click', showHandoffWorkflow);
  
  // Workflow actions
  elements.copyPromptBtn?.addEventListener('click', copyPrompt);
  elements.handoffInput?.addEventListener('input', enableSaveButton);
  elements.saveHandoffBtn?.addEventListener('click', saveHandoff);
  
  // Secondary actions
  elements.resumeSessionBtn?.addEventListener('click', resumeLastSession);
  elements.newSessionBtn?.addEventListener('click', startNewSession);
  
  // Template links - show form directly
  document.querySelectorAll('.template-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const templateKey = e.target.dataset.template;
      const template = templates[templateKey];
      if (template) {
        showTemplateForm(templateKey, template);
      }
    });
  });

  // Template form controls
  elements.closeFormBtn?.addEventListener('click', hideTemplateForm);
  elements.generateFromFormBtn?.addEventListener('click', generateFromForm);
  elements.resetFormBtn?.addEventListener('click', resetTemplateForm);
  
  // History controls
  elements.clearHistoryBtn?.addEventListener('click', clearHistory);
  
  // Load history on startup
  loadPromptHistory();
  
  // Coaching action links
  elements.coachingHint?.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'handoff') {
      e.preventDefault();
      showHandoffWorkflow();
    }
  });
  
  // Insights panel
  elements.toggleInsights?.addEventListener('click', toggleInsightsPanel);
  elements.closeInsights?.addEventListener('click', () => {
    elements.insightsPanel.classList.remove('active');
  });
  
  // Notifications
  elements.notificationClose?.addEventListener('click', hideNotification);
}

// Auto-session management
function startAutoSession() {
  sessionState.startTime = new Date();
  updateSessionDisplay();
  
  // Update every minute
  sessionState.timer = setInterval(() => {
    updateSessionDisplay();
    updateCoaching();
    updateButtonState();
  }, 60000); // Every minute
  
  // Initial updates
  updateContextTracker(0);
  updateCoaching();
  updateButtonState();
}

function updateSessionDisplay() {
  const now = new Date();
  const startTime = sessionState.startTime;
  
  // Format time as "Started 9:45 AM"
  const timeString = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  elements.sessionTime.textContent = `Started ${timeString}`;
  
  // Calculate elapsed minutes for internal use
  sessionState.elapsedMinutes = Math.floor((now - startTime) / 60000);
  
  // Update context tracker
  updateContextTracker(sessionState.elapsedMinutes);
}

// Update context tracker with progress bar and status
function updateContextTracker(minutes) {
  // TEST MODE: Using shorter intervals for testing
  // Normal: 0-60 minutes = 0-100%
  // Test: 0-6 minutes = 0-100% for faster testing
  const testMode = true; // Toggle this for production
  const maxMinutes = testMode ? 6 : 60;
  const progress = Math.min((minutes / maxMinutes) * 100, 100);
  
  // Update progress bar width
  if (elements.progressFill) {
    elements.progressFill.style.width = `${progress}%`;
  }
  
  // Determine color and message based on time thresholds
  // TEST MODE: 3 min green, then 1 min each color
  // PRODUCTION: 30 min green, then 10 min each color
  let colorClass = 'green';
  let icon = '💚';
  let message = 'Fresh context - ideal for complex work';
  
  if (testMode) {
    // Test intervals: 3 minutes green, then 1 minute each
    if (minutes >= 5) {
      colorClass = 'red';
      icon = '🔴';
      message = 'Performance drop-off likely. Handoff soon';
    } else if (minutes >= 4) {
      colorClass = 'orange';
      icon = '🟠';
      message = 'Session getting long. Consider handing off to a new session';
    } else if (minutes >= 3) {
      colorClass = 'yellow';
      icon = '🟡';
      message = 'Keep going, but watch your context';
    }
  } else {
    // Production intervals: 30 minutes green, then 10 minutes each
    if (minutes >= 50) {
      colorClass = 'red';
      icon = '🔴';
      message = 'Performance drop-off likely. Handoff soon';
    } else if (minutes >= 40) {
      colorClass = 'orange';
      icon = '🟠';
      message = 'Session getting long. Consider handing off to a new session';
    } else if (minutes >= 30) {
      colorClass = 'yellow';
      icon = '🟡';
      message = 'Keep going, but watch your context';
    }
  }
  
  // Update progress bar color
  if (elements.progressFill) {
    elements.progressFill.className = 'progress-fill ' + colorClass;
  }
  
  // Update status message only if it changed
  if (elements.statusIcon && elements.statusMessage) {
    const currentMessage = elements.statusMessage.textContent;
    if (currentMessage !== message) {
      elements.statusIcon.textContent = icon;
      elements.statusMessage.textContent = message;
      
      // Show a toast notification for important transitions
      const transitionMinutes = testMode ? [3, 4, 5] : [30, 40, 50];
      if (transitionMinutes.includes(minutes)) {
        showToast('Context Update', message, colorClass === 'red' ? 'warning' : 'info');
      }
    }
  }
}

// Update context tracker to show session saved state
function updateContextTrackerSaved() {
  // Add saved class to progress bar for stripes
  if (elements.progressFill) {
    elements.progressFill.classList.add('saved');
  }
  
  // Update message and icon
  if (elements.statusIcon && elements.statusMessage) {
    elements.statusIcon.textContent = '✅';
    elements.statusMessage.textContent = 'Session Saved! Close this Claude session and resume work in a new window.';
  }
  
  // Show a success toast
  showToast('Session Saved', 'Your context has been saved. You can now start a fresh session.', 'success');
}

function updateCoaching() {
  const minutes = sessionState.elapsedMinutes;
  let coaching = null;
  
  // Find appropriate coaching message
  for (const rule of Object.values(coachingRules)) {
    if (minutes >= rule.minMinutes && minutes < rule.maxMinutes) {
      coaching = rule;
      break;
    }
  }
  
  if (coaching) {
    elements.coachingHint.innerHTML = coaching.message;
    elements.coachingHint.className = `coaching-hint ${coaching.urgency}`;
    
    // Re-attach event listeners for action links
    elements.coachingHint.querySelectorAll('[data-action]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.dataset.action === 'handoff') {
          showHandoffWorkflow();
        }
      });
    });
  }
}

function updateButtonState() {
  const minutes = sessionState.elapsedMinutes;
  const button = elements.generateHandoffBtn;
  
  // Remove all state classes
  button.classList.remove('suggested', 'critical');
  
  if (minutes >= 45) {
    button.classList.add('critical');
  } else if (minutes >= 30) {
    button.classList.add('suggested');
  }
}

// Handoff workflow
function showHandoffWorkflow() {
  // Hide hero button and show workflow
  elements.generateHandoffBtn.parentElement.classList.add('hidden');
  elements.handoffWorkflow.classList.remove('hidden');
  
  // Generate smart prompt
  const prompt = generateHandoffPrompt(sessionState.elapsedMinutes);
  elements.generatedPrompt.textContent = prompt;
  
  // Focus on copy button
  elements.copyPromptBtn.focus();
}

function copyPrompt() {
  const prompt = elements.generatedPrompt.textContent;
  copyToClipboard(prompt);
  
  // Update button state
  elements.copyPromptBtn.classList.add('copied');
  elements.copyPromptBtn.textContent = 'Copied!';
  
  // Reset after 2 seconds
  setTimeout(() => {
    elements.copyPromptBtn.classList.remove('copied');
    elements.copyPromptBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="m5,15 L5,5 A2,2 0 0,1 7,3 L17,3" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
      Copy`;
  }, 2000);
  
  // Enable input field
  elements.handoffInput.disabled = false;
  elements.handoffInput.focus();
}

function enableSaveButton() {
  const hasContent = elements.handoffInput.value.trim().length > 10;
  elements.saveHandoffBtn.disabled = !hasContent;
}

function saveHandoff() {
  const handoffContent = elements.handoffInput.value.trim();
  
  if (!handoffContent) {
    showNotification('Please paste Claude\'s handoff response', 'error');
    return;
  }
  
  // Save to storage
  const handoff = {
    content: handoffContent,
    timestamp: new Date().toISOString(),
    sessionDuration: sessionState.elapsedMinutes,
    sessionStart: sessionState.startTime.toISOString()
  };
  
  // Save to chrome storage
  chrome.storage.local.get(['handoffs'], (result) => {
    const handoffs = result.handoffs || [];
    handoffs.unshift(handoff); // Add to beginning
    
    // Keep only last 20 handoffs
    if (handoffs.length > 20) {
      handoffs.pop();
    }
    
    chrome.storage.local.set({ 
      handoffs: handoffs,
      lastHandoff: handoff
    }, () => {
      // Update state
      sessionState.lastHandoff = handoff;
      sessionState.handoffCount++;
      
      // Mark session as saved in context tracker
      updateContextTrackerSaved();
      
      // Show success state
      showSuccessState();
      
      // Update insights
      updateInsights();
    });
  });
}

function showSuccessState() {
  // Hide workflow
  elements.handoffWorkflow.classList.add('hidden');
  
  // Show success
  elements.successState.classList.remove('hidden');
  
  // Show notification
  showNotification('Handoff saved successfully! ✅');
  
  // Update metrics
  const timeSaved = Math.min(sessionState.elapsedMinutes * 0.3, 15); // Estimate 30% time saved, max 15 min
  chrome.storage.local.get(['metrics'], (result) => {
    const metrics = result.metrics || { totalTimeSaved: 0, totalHandoffs: 0 };
    metrics.totalTimeSaved += timeSaved;
    metrics.totalHandoffs += 1;
    chrome.storage.local.set({ metrics });
  });
}

function startNewSession() {
  // Reset UI
  elements.successState.classList.add('hidden');
  elements.generateHandoffBtn.parentElement.classList.remove('hidden');
  
  // Clear input
  elements.handoffInput.value = '';
  elements.saveHandoffBtn.disabled = true;
  
  // Restart session
  sessionState.startTime = new Date();
  sessionState.elapsedMinutes = 0;
  updateSessionDisplay();
  updateCoaching();
  updateButtonState();
  
  // Show resume option if there's a last handoff
  if (sessionState.lastHandoff) {
    elements.resumeSection.classList.remove('hidden');
    const timeAgo = getTimeAgo(new Date(sessionState.lastHandoff.timestamp));
    elements.lastSessionInfo.textContent = `From ${timeAgo}`;
  }
}

function resumeLastSession() {
  if (!sessionState.lastHandoff) {
    showNotification('No previous session found', 'error');
    return;
  }
  
  // Copy handoff to clipboard
  copyToClipboard(sessionState.lastHandoff.content);
  showNotification('Previous handoff copied to clipboard!');
  
  // Show quick templates for continuing work
  elements.quickTemplates.classList.remove('hidden');
}

function loadLastSession() {
  chrome.storage.local.get(['lastHandoff', 'handoffs'], (result) => {
    if (result.lastHandoff) {
      sessionState.lastHandoff = result.lastHandoff;
      elements.resumeSection.classList.remove('hidden');
      
      const timeAgo = getTimeAgo(new Date(result.lastHandoff.timestamp));
      elements.lastSessionInfo.textContent = `From ${timeAgo}`;
    }
    
    // Set handoff count
    sessionState.handoffCount = (result.handoffs || []).length;
  });
}

function updateInsights() {
  chrome.storage.local.get(['metrics', 'handoffs'], (result) => {
    const metrics = result.metrics || { totalTimeSaved: 0, totalHandoffs: 0 };
    const handoffs = result.handoffs || [];
    
    // Calculate session quality based on average duration
    let quality = 'B+';
    let qualityTip = 'Good session management';
    
    if (handoffs.length > 0) {
      const avgDuration = handoffs.reduce((sum, h) => sum + h.sessionDuration, 0) / handoffs.length;
      
      if (avgDuration < 30) {
        quality = 'A';
        qualityTip = 'Excellent! You handoff before context degrades. <a href="https://ginko.ai/evidence/optimal-timing?utm_source=extension&utm_medium=insights&utm_campaign=quality-a" target="_blank">Learn more →</a>';
      } else if (avgDuration < 45) {
        quality = 'B';
        qualityTip = 'Good timing. Consider earlier handoffs for complex work. <a href="https://ginko.ai/evidence/handoff-timing?utm_source=extension&utm_medium=insights&utm_campaign=quality-b" target="_blank">See best practices →</a>';
      } else {
        quality = 'C';
        qualityTip = '<strong>Sessions over 45 min lose 67% effectiveness.</strong> <a href="https://ginko.ai/evidence/session-effectiveness?utm_source=extension&utm_medium=insights&utm_campaign=quality-c" target="_blank">View research</a>';
      }
    }
    
    // Update UI
    if (elements.sessionQuality) elements.sessionQuality.textContent = quality;
    if (elements.qualityTip) elements.qualityTip.innerHTML = qualityTip;
    if (elements.timeSaved) elements.timeSaved.textContent = Math.round(metrics.totalTimeSaved);
    if (elements.handoffCount) elements.handoffCount.textContent = metrics.totalHandoffs || 0;
    
    // Handoff tip based on count
    if (elements.handoffTip) {
      if (metrics.totalHandoffs === 0) {
        elements.handoffTip.textContent = 'Create your first handoff to start saving time';
      } else if (metrics.totalHandoffs < 5) {
        elements.handoffTip.textContent = 'Building good habits! Keep using handoffs.';
      } else {
        elements.handoffTip.textContent = `You're saving ~${Math.round(metrics.totalTimeSaved / metrics.totalHandoffs)} min per session`;
      }
    }
  });
}

function toggleInsightsPanel() {
  elements.insightsPanel.classList.toggle('active');
  if (elements.insightsPanel.classList.contains('active')) {
    updateInsights();
  }
}

// Utility functions
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy:', err);
    // Fallback method
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  });
}

function showNotification(message, type = 'info') {
  elements.notificationMessage.textContent = message;
  elements.notification.classList.remove('hidden');
  elements.notification.classList.add('show');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    hideNotification();
  }, 3000);
}

function hideNotification() {
  elements.notification.classList.remove('show');
  setTimeout(() => {
    elements.notification.classList.add('hidden');
  }, 300);
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Template Form Functions
function showTemplateForm(templateKey, template) {
  currentTemplate = { key: templateKey, data: template };
  
  // Update form header
  elements.formTitle.textContent = template.name;
  elements.formDescription.textContent = template.description;
  
  // Build the form
  buildTemplateForm(templateKey);
  
  // Show the form panel
  elements.templateFormPanel.classList.remove('hidden');
}

function hideTemplateForm() {
  elements.templateFormPanel.classList.add('hidden');
  currentTemplate = null;
  templateFormData = {};
  // Clear the form
  elements.templateForm.innerHTML = '';
}

function buildTemplateForm(templateKey) {
  const fields = templateFormFields[templateKey];
  if (!fields) return;
  
  // Clear existing form
  elements.templateForm.innerHTML = '';
  
  fields.forEach((field, index) => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    // Create label container with step number
    const labelContainer = document.createElement('div');
    labelContainer.className = 'label-container';
    
    const stepNumber = document.createElement('span');
    stepNumber.className = 'step-number';
    stepNumber.textContent = index + 1;
    
    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.name;
    
    labelContainer.appendChild(stepNumber);
    labelContainer.appendChild(label);
    formGroup.appendChild(labelContainer);
    
    // Add hint text if provided
    if (field.hint) {
      const hint = document.createElement('div');
      hint.className = 'form-hint';
      hint.textContent = field.hint;
      formGroup.appendChild(hint);
    }
    
    if (field.type === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = field.name;
      input.name = field.name;
      input.placeholder = field.placeholder || '';
      formGroup.appendChild(input);
    } else if (field.type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.id = field.name;
      textarea.name = field.name;
      textarea.placeholder = field.placeholder || '';
      textarea.rows = 3;
      formGroup.appendChild(textarea);
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      select.id = field.name;
      select.name = field.name;
      
      field.options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option;
        select.appendChild(optionEl);
      });
      
      formGroup.appendChild(select);
    } else if (field.type === 'checkboxes') {
      const checkboxGroup = document.createElement('div');
      checkboxGroup.className = 'checkbox-group';
      
      field.options.forEach(option => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${field.name}_${option}`;
        checkbox.name = field.name;
        checkbox.value = option;
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = checkbox.id;
        checkboxLabel.textContent = option;
        
        checkboxItem.appendChild(checkbox);
        checkboxItem.appendChild(checkboxLabel);
        checkboxGroup.appendChild(checkboxItem);
      });
      
      formGroup.appendChild(checkboxGroup);
    }
    
    elements.templateForm.appendChild(formGroup);
  });
}

function generateFromForm() {
  const formData = new FormData(elements.templateForm);
  const templateKey = currentTemplate.key;
  let generatedContent = '';
  
  // Generate content based on template type
  if (templateKey === 'cleanSlate') {
    generatedContent = `I'm starting a new project and need your help.

**Project Overview**: ${formData.get('projectOverview') || '[describe what you\'re building]'}

**User Story**: As a ${formData.get('userType') || '[user role]'}, I want ${formData.get('solution') || '[action or goal]'} so that ${formData.get('goal') || '[benefit or value]'}

**Success Criteria**:
${formData.get('criteria') ? formData.get('criteria').split('\n').map(c => `- [ ] ${c.trim()}`).join('\n') : '- [ ] [measurable outcome]'}

**Technical Requirements**:
${formData.get('requirements') ? formData.get('requirements').split('\n').map(r => `- [ ] ${r.trim()}`).join('\n') : '- [ ] [specific requirement]'}

**Notes**: ${formData.get('notes') || '[any additional context or constraints]'}`;
  } else if (templateKey === 'workplan') {
    generatedContent = `Help me create a workplan for this task.

**Goal**: ${formData.get('goal') || '[what needs to be accomplished]'}

**Timeline**: ${formData.get('timeline') || '[deadline or timeframe]'}

**Constraints**: ${formData.get('constraints') || '[any limitations or requirements]'}

**Current Status**: ${formData.get('status') || '[what\'s already done, if anything]'}

**Expected Deliverables**: ${formData.get('deliverables') || '[what success looks like]'}`;
  } else if (templateKey === 'feature') {
    generatedContent = `I want to add a new feature.

**Feature Name**: ${formData.get('featureName') || '[name of the feature]'}

**User Story**: As a ${formData.get('userType') || '[user]'}, I want ${formData.get('capability') || '[capability]'} so that ${formData.get('benefit') || '[benefit]'}

**Acceptance Criteria**:
${formData.get('criteria') ? formData.get('criteria').split('\n').map(c => `- [ ] ${c.trim()}`).join('\n') : '- [ ] [specific, testable criterion]'}

**Implementation Notes**: ${formData.get('notes') || '[technical approach or concerns]'}`;
  } else if (templateKey === 'test') {
    const coverage = [];
    const checkboxes = elements.templateForm.querySelectorAll('input[name="coverage"]:checked');
    checkboxes.forEach(cb => coverage.push(cb.value));
    const language = formData.get('language') || 'javascript';
    
    generatedContent = `Help me create tests for this functionality.

**What to Test**: ${formData.get('component') || '[component/function/feature name]'}

**Test Coverage Needed**:
${coverage.length > 0 ? coverage.map(c => `- [ ] ${c}`).join('\n') : '- [ ] Happy path scenarios\n- [ ] Edge cases\n- [ ] Error handling'}

**Code to Test**:
\`\`\`${language}
${formData.get('code') || '[paste code here]'}
\`\`\`

**Specific Concerns**: ${formData.get('concerns') || '[what you\'re worried might break]'}`;
  } else if (templateKey === 'debug') {
    const language = formData.get('language') || 'javascript';
    generatedContent = `I need help debugging an issue.

**Error Message**: ${formData.get('error') || '[paste exact error]'}

**Expected Behavior**: ${formData.get('expected') || '[what should happen]'}

**Actual Behavior**: ${formData.get('actual') || '[what\'s happening instead]'}

**Steps to Reproduce**: 
${formData.get('steps') ? formData.get('steps').split('\n').map((s, i) => `${i+1}. ${s.trim()}`).join('\n') : '1. [exact step]'}

**What I've Tried**: ${formData.get('tried') || '[solutions attempted so far]'}

**Relevant Code**:
\`\`\`${language}
${formData.get('code') || '[paste code here]'}
\`\`\`

**Environment**: ${formData.get('environment') || '[OS, version, dependencies]'}`;
  } else if (templateKey === 'gitCommit') {
    generatedContent = `Please write a git commit message for my changes.

**What files did I change:**
${formData.get('files') || '[List the files you modified, added, or deleted]'}

**What I changed:**
${formData.get('changes') || '[Describe what you actually changed in these files - the key modifications, additions, or deletions]'}

**Why I made these changes:**
${formData.get('why') || '[Explain the motivation - what problem does this solve? what feature does this add?]'}

${formData.get('breaking') ? `**Additional context:**
${formData.get('breaking')}` : ''}

Please write a conventional commit message following these guidelines:
- First line: <type>(<scope>): <subject> (50 chars max)
- Types: feat, fix, docs, style, refactor, test, chore
- Body: Explain what and why (not how), wrapped at 72 chars
- Footer: Reference issues, breaking changes if any

Format the commit message so I can copy it directly into my git commit.`;
  } else {
    // Fallback to the original template content
    generatedContent = currentTemplate.data.content;
  }
  
  // Save to history
  saveToHistory(currentTemplate.key, currentTemplate.data.name, generatedContent);
  
  // Copy to clipboard and show detailed instructions
  copyToClipboard(generatedContent);
  showToast(
    '✅ Template Ready!',
    'Your prompt has been copied to the clipboard. Now: 1) Switch to Claude tab, 2) Paste (Cmd+V or Ctrl+V), 3) Press Enter to start',
    'success'
  );
  
  // Hide form after a short delay
  setTimeout(() => {
    hideTemplateForm();
  }, 2000);
}

function resetTemplateForm() {
  elements.templateForm.reset();
  templateFormData = {};
}

// Toast notification system
function showToast(title, message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  if (type === 'success') {
    icon.innerHTML = '✓';
  } else if (type === 'error') {
    icon.innerHTML = '✕';
  } else if (type === 'warning') {
    icon.innerHTML = '⚠';
  } else {
    icon.innerHTML = 'ℹ';
  }
  
  const content = document.createElement('div');
  content.className = 'toast-content';
  
  const toastTitle = document.createElement('div');
  toastTitle.className = 'toast-title';
  toastTitle.textContent = title;
  
  const toastMessage = document.createElement('div');
  toastMessage.className = 'toast-message';
  toastMessage.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '✕';
  closeBtn.onclick = () => removeToast(toast);
  
  content.appendChild(toastTitle);
  content.appendChild(toastMessage);
  
  toast.appendChild(icon);
  toast.appendChild(content);
  toast.appendChild(closeBtn);
  
  elements.toastContainer.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    removeToast(toast);
  }, 5000);
}

function removeToast(toast) {
  toast.style.animation = 'toastSlideOut 0.3s ease';
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

// Prompt History Management
function saveToHistory(templateKey, templateName, content) {
  const historyItem = {
    id: Date.now(),
    templateKey: templateKey,
    templateName: templateName,
    content: content,
    timestamp: new Date().toISOString(),
    preview: getContentPreview(content)
  };
  
  // Add to beginning of array
  promptHistory.unshift(historyItem);
  
  // Limit history size
  if (promptHistory.length > MAX_HISTORY_ITEMS) {
    promptHistory = promptHistory.slice(0, MAX_HISTORY_ITEMS);
  }
  
  // Save to storage
  chrome.storage.local.set({ promptHistory: promptHistory }, () => {
    console.log('History saved');
    displayPromptHistory();
  });
}

function loadPromptHistory() {
  chrome.storage.local.get(['promptHistory'], (result) => {
    if (result.promptHistory) {
      promptHistory = result.promptHistory;
      displayPromptHistory();
    } else {
      // Show empty state
      elements.historyList.classList.add('hidden');
      elements.historyEmpty.classList.remove('hidden');
    }
  });
}

function displayPromptHistory() {
  if (!promptHistory || promptHistory.length === 0) {
    elements.historyList.classList.add('hidden');
    elements.historyEmpty.classList.remove('hidden');
    return;
  }
  
  elements.historyList.classList.remove('hidden');
  elements.historyEmpty.classList.add('hidden');
  
  // Clear existing items
  elements.historyList.innerHTML = '';
  
  // Add history items
  promptHistory.forEach(item => {
    const historyElement = createHistoryItem(item);
    elements.historyList.appendChild(historyElement);
  });
}

function createHistoryItem(item) {
  const div = document.createElement('div');
  div.className = 'history-item';
  div.dataset.historyId = item.id;
  
  // Get emoji for template type
  const templateEmoji = getTemplateEmoji(item.templateKey);
  
  // Format time
  const timeAgo = getTimeAgo(new Date(item.timestamp));
  
  div.innerHTML = `
    <div class="history-item-type">${templateEmoji}</div>
    <div class="history-item-content">
      <div class="history-item-label">${item.templateName}</div>
      <div class="history-item-preview">${item.preview}</div>
    </div>
    <div class="history-item-time">${timeAgo}</div>
  `;
  
  // Click to reuse
  div.addEventListener('click', () => {
    copyToClipboard(item.content);
    showToast(
      'History Copied!',
      'Your previous prompt has been copied. Paste it into Claude to continue.',
      'success'
    );
  });
  
  return div;
}

function getTemplateEmoji(templateKey) {
  const emojiMap = {
    cleanSlate: '🆕',
    workplan: '📋',
    feature: '✨',
    test: '🧪',
    debug: '🔍',
    gitCommit: '📝'
  };
  return emojiMap[templateKey] || '📝';
}

function getContentPreview(content) {
  // Extract first meaningful line after removing markdown
  const lines = content.split('\n').filter(line => line.trim());
  for (let line of lines) {
    // Skip headers and empty lines
    if (line.startsWith('#') || line.startsWith('*')) continue;
    // Return first content line, truncated
    const preview = line.replace(/\*\*/g, '').trim();
    return preview.length > 60 ? preview.substring(0, 60) + '...' : preview;
  }
  return 'Template prompt';
}

function clearHistory() {
  if (confirm('Clear all prompt history?')) {
    promptHistory = [];
    chrome.storage.local.remove('promptHistory', () => {
      displayPromptHistory();
      showToast('History Cleared', 'Your prompt history has been cleared.', 'info');
    });
  }
}

// Message passing with content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CLAUDE_DETECTED') {
    console.log('Claude.ai detected, extension active');
    updateCoaching();
  }
});