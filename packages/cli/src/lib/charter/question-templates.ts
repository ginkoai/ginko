/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, conversation, questions, templates, patterns]
 * @related: [conversation-facilitator.ts, conversation-context.ts, ../../types/charter.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import {
  QuestionTemplate,
  CharterAspect,
  QuestionContext,
} from '../../types/charter.js';

/**
 * Natural question patterns for charter aspects
 *
 * These are PATTERNS, not scripts. The conversation facilitator
 * selects questions based on context and conversation flow.
 *
 * Key principle: Questions feel like a thoughtful technical partner,
 * not a bureaucratic form or interrogation.
 */

/**
 * Opening prompts - natural conversation starters
 */
export const OPENING_PROMPTS = [
  "💡 What would you like to build today?",
  "💡 Tell me about this project!",
  "💡 What problem are you solving?",
  "💡 What got you excited about building this?",
];

/**
 * Purpose exploration questions
 */
export const PURPOSE_QUESTIONS: QuestionTemplate[] = [
  {
    aspect: 'purpose',
    question: "What's the pain point you're solving?",
    followUps: [
      "What makes existing solutions frustrating?",
      "Why is this problem worth solving now?",
    ],
    keywords: ['problem', 'pain', 'frustration', 'challenge', 'issue'],
    weight: 1.0,
  },
  {
    aspect: 'purpose',
    question: "What makes existing solutions frustrating?",
    followUps: [
      "What would make this better?",
      "What are people doing instead right now?",
    ],
    keywords: ['existing', 'current', 'alternative', 'workaround'],
    weight: 0.8,
  },
  {
    aspect: 'purpose',
    question: "Why build this now? What's the timing about?",
    followUps: [
      "What's changed that makes this important now?",
      "What happens if this doesn't get built?",
    ],
    keywords: ['timing', 'now', 'urgency', 'opportunity'],
    weight: 0.7,
  },
  {
    aspect: 'purpose',
    question: "What's the core value this brings?",
    followUps: [
      "Who benefits most from this?",
      "What changes for them?",
    ],
    keywords: ['value', 'benefit', 'impact', 'change'],
    weight: 0.9,
  },
];

/**
 * Users and personas exploration questions
 */
export const USER_QUESTIONS: QuestionTemplate[] = [
  {
    aspect: 'users',
    question: "Who's this for - yourself, your team, or broader?",
    followUps: [
      "What do they care most about?",
      "What frustrates them currently?",
    ],
    keywords: ['users', 'customers', 'audience', 'stakeholders', 'team'],
    weight: 1.0,
  },
  {
    aspect: 'users',
    question: "What does success look like from their perspective?",
    followUps: [
      "How will they know it's working well for them?",
      "What would make them love it vs. just tolerate it?",
    ],
    keywords: ['perspective', 'experience', 'satisfaction', 'needs'],
    weight: 0.9,
  },
  {
    aspect: 'users',
    question: "Are there different types of users with different needs?",
    followUps: [
      "Who's the primary user vs. secondary?",
      "Do any groups have conflicting needs?",
    ],
    keywords: ['types', 'segments', 'personas', 'groups', 'roles'],
    weight: 0.7,
  },
  {
    aspect: 'users',
    question: "What are users doing now to solve this problem?",
    followUps: [
      "What parts of their current solution work well?",
      "What would they miss if we don't include it?",
    ],
    keywords: ['current', 'existing', 'workflow', 'process', 'tools'],
    weight: 0.6,
  },
];

/**
 * Success criteria exploration questions
 */
export const SUCCESS_QUESTIONS: QuestionTemplate[] = [
  {
    aspect: 'success',
    question: "How will you know this is working well?",
    followUps: [
      "What would you measure?",
      "What does 'good enough' look like?",
    ],
    keywords: ['measure', 'metrics', 'success', 'goals', 'kpi'],
    weight: 1.0,
  },
  {
    aspect: 'success',
    question: "What would success look like in 3 months? 6 months?",
    followUps: [
      "What's the minimum viable success?",
      "What would make this a home run?",
    ],
    keywords: ['timeline', 'milestones', 'goals', 'targets'],
    weight: 0.8,
  },
  {
    aspect: 'success',
    question: "What outcomes matter most - adoption, performance, satisfaction?",
    followUps: [
      "How would you prioritize those?",
      "Which one is non-negotiable?",
    ],
    keywords: ['outcomes', 'results', 'priorities', 'critical'],
    weight: 0.9,
  },
  {
    aspect: 'success',
    question: "What would make you feel confident this is delivering value?",
    followUps: [
      "What signals would tell you it's working?",
      "What would be a red flag that it's not?",
    ],
    keywords: ['confidence', 'validation', 'proof', 'evidence'],
    weight: 0.7,
  },
];

/**
 * Scope and boundaries exploration questions
 */
export const SCOPE_QUESTIONS: QuestionTemplate[] = [
  {
    aspect: 'scope',
    question: "What's the smallest version that would be useful?",
    followUps: [
      "What can we defer for v2?",
      "What's the absolute minimum to validate the idea?",
    ],
    keywords: ['mvp', 'minimum', 'essential', 'core', 'first'],
    weight: 1.0,
  },
  {
    aspect: 'scope',
    question: "What are you explicitly NOT building?",
    followUps: [
      "What problems are you leaving for later?",
      "What would be scope creep?",
    ],
    keywords: ['not', 'exclude', 'out of scope', 'defer', 'later'],
    weight: 1.0,
  },
  {
    aspect: 'scope',
    question: "What features did you consider but decide to skip?",
    followUps: [
      "Why skip them?",
      "Would users expect them?",
    ],
    keywords: ['considered', 'decided', 'skip', 'exclude', 'nice to have'],
    weight: 0.7,
  },
  {
    aspect: 'scope',
    question: "Where are the boundaries that might be unclear?",
    followUps: [
      "What could expand unexpectedly?",
      "What depends on learning more first?",
    ],
    keywords: ['unclear', 'ambiguous', 'depends', 'tbd', 'maybe'],
    weight: 0.6,
  },
];

/**
 * Context and constraints exploration questions
 */
export const CONTEXT_QUESTIONS: QuestionTemplate[] = [
  {
    aspect: 'purpose', // Context relates to purpose
    question: "Any technical constraints? Existing stack, platform, etc.?",
    followUps: [
      "What technologies are you committed to?",
      "What do you need to integrate with?",
    ],
    keywords: ['constraints', 'technical', 'stack', 'platform', 'existing'],
    weight: 0.8,
  },
  {
    aspect: 'purpose',
    question: "Who's working on this with you?",
    followUps: [
      "What are their roles?",
      "Any skill gaps to work around?",
    ],
    keywords: ['team', 'collaborators', 'working with', 'contributors'],
    weight: 0.6,
  },
  {
    aspect: 'purpose',
    question: "What's your timeline look like?",
    followUps: [
      "Any hard deadlines?",
      "What's driving the timing?",
    ],
    keywords: ['timeline', 'deadline', 'schedule', 'when', 'launch'],
    weight: 0.7,
  },
  {
    aspect: 'purpose',
    question: "Any organizational or business constraints to navigate?",
    followUps: [
      "Budget limits?",
      "Compliance or regulatory requirements?",
    ],
    keywords: ['budget', 'compliance', 'regulatory', 'policy', 'organizational'],
    weight: 0.5,
  },
];

/**
 * Gentle nudge templates for when clarity is needed
 */
export const NUDGE_TEMPLATES = {
  purpose: [
    "I want to make sure I understand the core problem well enough to help effectively. Can you tell me more about what's frustrating about the current situation?",
    "Help me understand what problem this solves - that way I can make better suggestions as we build.",
  ],
  users: [
    "I want to understand who we're building this for so I can keep their needs in mind. Can you tell me more about your users?",
    "Who's going to use this? That'll help me think through the right trade-offs.",
  ],
  success: [
    "How will we know if this is working well? Having success criteria helps us stay focused.",
    "What does 'good enough' look like? That'll help us avoid over-engineering.",
  ],
  scope: [
    "What are you NOT planning to build? That helps me understand the boundaries.",
    "What's the smallest version that would be useful? I want to make sure we're focused on the essentials.",
  ],
};

/**
 * Stop/TBD handling templates
 */
export const TBD_TEMPLATES = [
  "No worries! I'll mark that as TBD and we can revisit later.",
  "That's fine - we can figure that out as we go. I'll note it as TBD.",
  "Totally understand. Let's mark it TBD and move forward with what we know.",
];

/**
 * Completion/synthesis transition templates
 */
export const SYNTHESIS_TEMPLATES = [
  "Perfect! I've got a good sense of the project. Let me capture our thinking in a charter...",
  "Great conversation! I'll organize what we've discussed into a charter so we stay aligned...",
  "Thanks for walking me through this! Let me document our understanding...",
];

/**
 * Select best question template based on context
 */
export function selectQuestion(
  aspect: CharterAspect,
  context: QuestionContext
): string {
  let templates: QuestionTemplate[];

  switch (aspect) {
    case 'purpose':
      templates = PURPOSE_QUESTIONS;
      break;
    case 'users':
      templates = USER_QUESTIONS;
      break;
    case 'success':
      templates = SUCCESS_QUESTIONS;
      break;
    case 'scope':
      templates = SCOPE_QUESTIONS;
      break;
    default:
      return PURPOSE_QUESTIONS[0].question;
  }

  // Filter out questions already asked
  const available = templates.filter(
    t => !context.previousQuestions.includes(t.question)
  );

  if (available.length === 0) {
    // Use follow-ups if main questions exhausted
    return templates[0].followUps[0];
  }

  // Select highest weighted available question
  available.sort((a, b) => b.weight - a.weight);
  return available[0].question;
}

/**
 * Select gentle nudge for an aspect
 */
export function selectNudge(aspect: CharterAspect): string {
  const templates = NUDGE_TEMPLATES[aspect];
  if (!templates || templates.length === 0) {
    return NUDGE_TEMPLATES.purpose[0];
  }

  // Randomly select to feel more natural
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

/**
 * Select TBD handling message
 */
export function selectTBDMessage(): string {
  const index = Math.floor(Math.random() * TBD_TEMPLATES.length);
  return TBD_TEMPLATES[index];
}

/**
 * Select synthesis transition message
 */
export function selectSynthesisMessage(): string {
  const index = Math.floor(Math.random() * SYNTHESIS_TEMPLATES.length);
  return SYNTHESIS_TEMPLATES[index];
}

/**
 * Select opening prompt
 */
export function selectOpeningPrompt(): string {
  const index = Math.floor(Math.random() * OPENING_PROMPTS.length);
  return OPENING_PROMPTS[index];
}
