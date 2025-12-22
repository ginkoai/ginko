/**
 * Section card data for the Ginko marketing site
 * Each section tells part of the Ginko story
 */

export interface Section {
  id: number
  title: string
  problemText: string
  solutionText: string
  modalContent: {
    header: string
    description: string
  }
}

export const sections: Section[] = [
  {
    id: 1,
    title: 'Maximize Flow',
    problemText: 'Context switching kills productivity. Every interruption costs 23 minutes of recovery time. AI assistants that constantly ask for clarification break your concentration.',
    solutionText: 'Ginko learns your project context once and remembers it. Start coding immediately, stay in flow longer. Your AI partner works alongside you, not against your focus.',
    modalContent: {
      header: 'Stay in the Zone',
      description: 'Ginko\'s intelligent context management means fewer interruptions and more time in flow state. Your session history, project patterns, and team decisions are always at hand.',
    },
  },
  {
    id: 2,
    title: 'Maintain Rapport',
    problemText: 'Every new chat starts from zero. You explain the same things repeatedly. Your AI doesn\'t remember what you discussed yesterday, let alone last week.',
    solutionText: 'Ginko maintains continuous rapport across sessions. Pick up where you left off. Your AI partner remembers your preferences, your codebase, and your decisions.',
    modalContent: {
      header: 'Build Understanding Over Time',
      description: 'Long-term collaboration beats one-off conversations. Ginko preserves context across sessions so your AI partner truly understands your project.',
    },
  },
  {
    id: 3,
    title: 'Partners, Not Assistants',
    problemText: 'Traditional AI assistants wait for commands. They don\'t anticipate needs, suggest improvements, or push back on bad ideas. They\'re reactive, not proactive.',
    solutionText: 'Ginko creates a partnership dynamic. Your AI collaborator offers insights, catches mistakes early, and contributes ideas. It\'s pair programming at its best.',
    modalContent: {
      header: 'True Collaboration',
      description: 'Move beyond command-and-response. Ginko enables genuine collaboration where AI and human complement each other\'s strengths.',
    },
  },
  {
    id: 4,
    title: 'Use Comparative Advantage',
    problemText: 'Humans waste time on tasks AI handles better. AI gets stuck on tasks requiring human judgment. Neither works to their full potential.',
    solutionText: 'Ginko helps you leverage what each does best. AI handles the tedious, repetitive work. You focus on architecture, creativity, and decisions that matter.',
    modalContent: {
      header: 'Play to Your Strengths',
      description: 'Let AI handle boilerplate, documentation, and pattern-matching. Reserve your energy for the creative, strategic work only humans can do.',
    },
  },
  {
    id: 5,
    title: 'Work With Intent',
    problemText: 'Aimless coding sessions drain energy without progress. Without clear goals, it\'s easy to over-engineer, go down rabbit holes, or build the wrong thing.',
    solutionText: 'Ginko keeps you focused on what matters. Sprint tracking, task management, and session goals keep every coding session purposeful and productive.',
    modalContent: {
      header: 'Purpose-Driven Development',
      description: 'Start each session with clear intent. Ginko helps you define goals, track progress, and stay aligned with what actually needs to be built.',
    },
  },
  {
    id: 6,
    title: 'Preserve Knowledge',
    problemText: 'Decisions made today are forgotten tomorrow. Why did we choose this architecture? What did we try that didn\'t work? Knowledge evaporates without capture.',
    solutionText: 'Ginko automatically captures decisions, insights, and context. Your project\'s knowledge graph grows over time, preserving institutional memory.',
    modalContent: {
      header: 'Never Lose an Insight',
      description: 'ADRs, patterns, gotchas, and session logs build a searchable knowledge base. Future you (and your team) will thank you.',
    },
  },
  {
    id: 7,
    title: 'Iterate And Deliver',
    problemText: 'Perfectionism stalls projects. Fear of shipping leads to endless polishing. The gap between "done" and "deployed" grows wider.',
    solutionText: 'Ginko encourages continuous delivery. Small commits, frequent deploys, rapid iteration. Ship early, learn fast, improve constantly.',
    modalContent: {
      header: 'Ship Early, Ship Often',
      description: 'Break down work into deliverable chunks. Ginko\'s sprint system keeps you shipping value continuously instead of waiting for "perfect."',
    },
  },
  {
    id: 8,
    title: 'Introducing Vibe Tribes',
    problemText: 'Remote teams struggle to share context. Async communication loses nuance. Onboarding new team members takes weeks of ramp-up.',
    solutionText: 'Vibe Tribes bring team collaboration to AI-assisted development. Share context, patterns, and learnings across your entire team effortlessly.',
    modalContent: {
      header: 'Team-Wide Intelligence',
      description: 'Coming soon: Shared knowledge graphs, team patterns, and collaborative sessions. What one team member learns, everyone benefits from.',
    },
  },
  {
    id: 9,
    title: 'Collaborate Natively',
    problemText: 'Switching between tools breaks flow. Copy-pasting context is tedious. AI tools that live outside your editor add friction.',
    solutionText: 'Ginko works where you work. Native CLI integration, git-native storage, IDE compatibility. No context switching, no copy-paste.',
    modalContent: {
      header: 'Your Tools, Enhanced',
      description: 'Ginko integrates with your existing workflow. Git-native means your context lives with your code. No separate apps, no platform lock-in.',
    },
  },
  {
    id: 10,
    title: 'Coach With Insight',
    problemText: 'AI that doesn\'t learn from your patterns can\'t help you improve. Generic suggestions miss the nuances of your codebase and style.',
    solutionText: 'Ginko learns your patterns and provides personalized coaching. It understands your codebase\'s conventions and helps you level up over time.',
    modalContent: {
      header: 'AI That Grows With You',
      description: 'Pattern recognition, gotcha prevention, and contextual suggestions tailored to your project. Ginko gets smarter the more you use it.',
    },
  },
]

/**
 * CTA button color variants cycling through the palette
 */
export const ctaColors = [
  'gold',
  'orange',
  'red-orange',
  'maroon',
  'navy',
] as const

export type CtaColor = typeof ctaColors[number]

export function getCtaColor(index: number): CtaColor {
  return ctaColors[index % ctaColors.length]
}
