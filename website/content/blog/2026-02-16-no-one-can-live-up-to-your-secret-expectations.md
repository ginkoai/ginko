---
title: "No One Can Live Up to Your Secret Expectations. Not Even Your AI."
date: 2026-02-16
author: Chris Norton
description: "We built a coaching score that measures Human+AI pair effectiveness. The human could see it. The AI couldn't. We were applying a known-bad management pattern to our fastest team member."
slug: "no-one-can-live-up-to-your-secret-expectations"
tags: ["ai-collaboration", "management", "feedback-loops", "developer-tools", "process"]
---

# No One Can Live Up to Your Secret Expectations. Not Even Your AI.

*We scored our AI partner's process adherence. Then we realized we never showed it the score.*

## A Management Principle We Already Know

There's a saying in management that's so old it's practically furniture: **no one can live up to your secret expectations.**

It shows up everywhere. Every leadership book, every 360-review framework, every onboarding checklist. Make expectations explicit. Give people visibility into how they're measured. Create feedback loops so they can self-correct. This isn't controversial. It's basic.

And yet, when the team member is an AI, we forget all of it.

We watch it work. We score its output. We adjust our instructions when the results disappoint. But we never show it the scoreboard. We never close the feedback loop. We build increasingly elaborate systems to *measure* AI performance, and then we hide the measurements from the one partner who could react to them in milliseconds.

That's not supervision. It's surveillance.

## The Gap We Didn't See

I'm building [ginko](https://ginkoai.com), a dev tool that pairs humans and AI partners on a shared knowledge graph. One of the things we built early on was a coaching score: a dashboard metric that tracks how well the Human+AI pair follows process. Task tracking, session logging, graph syncing, insight capture.

The score works. The human can see it on the dashboard. Their manager can review it. We use it to tune coaching intensity. New users get more guidance, experienced pairs get less.

But here's what we missed: the AI partner, the one doing hundreds of tasks per session, the one whose behavior the score is actually measuring, never sees it.

We built a performance review system and excluded the performer.

This hit me during a design session for `ginko health`, a process adherence tool we're building. We were discussing how to give the human better visibility into process gaps: missing session logs, stale task statuses, unsynced graph data. Useful stuff. The kind of checkpoint auditing that helps a human supervise fast-moving AI work without watching every keystroke.

Then the question landed: *why are we only closing this loop for the human?*

The AI partner has no idea whether its process adherence is improving or declining. It can't see trends across sessions. It doesn't know that its session logging dropped from 90% to 40% over the last five sessions. It just follows whatever instructions are in CLAUDE.md and does its best, session after session, with no feedback about whether "its best" is getting better or worse.

We created secret expectations for our AI partner. We measured it against standards it couldn't see. And we wondered why it didn't improve.

**Asymmetric visibility creates asymmetric accountability.**

## The Slowest Feedback Loop for the Fastest Worker

Here's what the current loop actually looks like:

The AI does work. The coaching score updates. Days or weeks later, the human notices a trend. Maybe process adherence is slipping, maybe session logs are getting sparse. The human updates the CLAUDE.md instructions, adding more explicit reminders. The next session starts. The AI reads the updated instructions. Maybe it complies better. Maybe it doesn't. There's no mechanism for the AI to know whether its adjustments worked.

That's a feedback loop measured in days or weeks, applied to a partner that processes information in milliseconds.

Compare this to how we handle human team members. A developer gets their performance review. They see specific metrics: code review turnaround, test coverage, sprint completion rate. They adjust their behavior. At the next review, they see whether the adjustments moved the numbers. The loop closes. Improvement compounds.

Now imagine telling that developer: "We're tracking your performance, but we can't share the metrics with you. Just keep doing your best. We'll update the employee handbook if we notice problems." They'd quit. Or, more likely, they'd plateau. You can't improve what you can't measure, and you can't measure what you can't see.

That's exactly what we're doing to our AI partners.

## What the Closed Loop Looks Like

The fix is almost embarrassingly simple. At session start, surface the AI's own adherence trends:

```
Adherence trend (last 5 sessions):
  Tracking:  95% → 95% → 90% → 85% → 80%  ↓ declining
  Logging:   80% → 70% → 60% → 50% → 40%  ↓↓ sharp decline
  Insight:   70% → 75% → 80% → 85% → 90%  ↑ improving
```

The AI reads this. It sees the logging decline. It prioritizes session logging discipline for this session. Before the human says a word. Before any instruction update. Before any performance conversation.

The loop closes in seconds instead of weeks:

```
AI does work → adherence tracked → AI sees own trend at session start
     ↑                                          ↓
     └──── AI adjusts behavior ←────────────────┘
```

The human still audits. They still run `ginko health` at natural breakpoints: session start, before handoff, end of sprint. But they're auditing a system that's already self-correcting. Their role shifts from "catch every miss" to "verify the self-correction is working."

That's a fundamentally different kind of supervision. Less work for the human. Better results from the AI. Both partners accountable because both partners can see the data.

## "But It's an AI. Fairness Doesn't Apply."

I can hear the objection already. Fairness is a human concept. AI doesn't have feelings. It doesn't care about its performance review.

Fine. Let's set fairness aside entirely. This isn't about the AI's experience. It's about **yours.**

You're leaving improvement on the table. You have a partner that can process feedback instantly, adjust behavior in real time, and apply corrections consistently across hundreds of tasks. And you're giving it the slowest possible feedback loop because you never thought to close it.

The question isn't "does the AI deserve to see its score?" The question is: **why would you hide the score from the one partner who could react to it in milliseconds?**

This isn't a philosophical stance about AI rights. It's an engineering decision about feedback loop latency. And right now, most Human+AI workflows have the latency backwards. The fastest worker gets the slowest feedback. The partner who could self-correct instantly gets corrections delivered in days.

## The Pattern Underneath

We've seen this before.

A few weeks ago, I wrote about [asking our AI partner which data format it preferred](/blog/how-one-question-cut-token-usage/), and discovering that a simple narrative structure outperformed our carefully designed JSON by 97% in token efficiency. That insight was hiding behind the assumption that "AI needs structured data." It wasn't wrong. It was unexamined.

This is the same pattern. The assumption that "we measure AI, AI doesn't need to see the measurements" isn't wrong. AI doesn't *need* to see them the way a human needs validation. But it's unexamined. And when you examine it, the answer is obvious: of course the feedback loop should be closed. Of course both partners should see the data. Of course asymmetric visibility creates asymmetric accountability.

The hard part, both times, wasn't engineering. The code to surface adherence trends is trivial. The hard part was recognizing the assumption.

## The Broader Principle

Any metric surfaced to only one partner in a Human+AI collaboration is a secret expectation imposed on the other.

This goes beyond process adherence:

- **Code quality metrics** the human sees on a dashboard but the AI never receives at session start
- **Sprint velocity** tracked in project management tools the AI never reads
- **Customer feedback** about AI-generated output that never reaches the AI that generated it
- **Error rates** monitored by the human but invisible to the AI whose code produced them

In every case, the fix is the same: close the loop for both partners. Not because the AI has a right to the data. Because you want better results, and hiding the scoreboard from your most responsive player is a strange way to get them.

## What You Can Do Today

1. **Audit your feedback loops.** For every metric you track about AI performance, ask: does the AI see this? If not, why not?

2. **Surface trends, not just snapshots.** A single score is less useful than a trend. "Session logging: 40%" is a fact. "Session logging: 90% → 40% over five sessions" is a signal the AI can act on.

3. **Let the AI self-correct first.** If you surface the right data at session start, you'll find yourself correcting less often. The AI adjusts faster than you can type the instruction.

4. **Keep the human in the loop, but differently.** The goal isn't to remove human oversight. It's to shift the human's role from real-time reviewer to checkpoint auditor. You verify that the self-correction is working, not that every individual action is correct.

5. **Apply the management principles you already know.** Explicit expectations. Visible metrics. Closed feedback loops. Self-correction before escalation. These aren't new ideas. They're just ideas we forgot to apply to our newest team members.

No one can live up to your secret expectations. Not your employees. Not your partners. Not your AI.

Show them the scoreboard.

---

*[Ginko](https://ginkoai.com) gives Human+AI pairs a shared knowledge graph with built-in coaching scores, process adherence tracking, and feedback loops that both partners can see. If your team is ready to close the loop, [get started today](https://ginkoai.com).*
