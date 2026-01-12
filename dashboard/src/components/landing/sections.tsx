/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-12
 * @tags: [landing-page, marketing, static-sections, server-component]
 * @related: [landing-page.tsx, hero-section.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, next/link, heroicons, ui/button, ui/corner-brackets]
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CornerBrackets } from '@/components/ui/corner-brackets'
import {
  ArrowRightIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  UserGroupIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

// Problem Cards - Static server component
export function ProblemCards() {
  return (
    <section className="container mx-auto px-6 py-16">
      <div className="grid md:grid-cols-3 gap-6">
        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="text-center p-6">
            <div className="font-mono text-sm text-primary mb-3 uppercase tracking-wider">CONTEXT_ROT</div>
            <p className="text-muted-foreground text-sm">
              AI assistants lose effectiveness as conversations grow. By message 50, they&apos;re guessing.
            </p>
          </div>
        </CornerBrackets>

        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="text-center p-6">
            <div className="font-mono text-sm text-primary mb-3 uppercase tracking-wider">SESSION_RESET</div>
            <p className="text-muted-foreground text-sm">
              Every new session = 10+ minutes re-explaining your project, decisions, and goals.
            </p>
          </div>
        </CornerBrackets>

        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="text-center p-6">
            <div className="font-mono text-sm text-primary mb-3 uppercase tracking-wider">KNOWLEDGE_SILOS</div>
            <p className="text-muted-foreground text-sm">
              Context lives in your head. When you switch tools or take a break, it&apos;s gone.
            </p>
          </div>
        </CornerBrackets>
      </div>
    </section>
  )
}

// How It Works - Static server component
export function HowItWorks() {
  return (
    <section id="how-it-works" className="container mx-auto px-6 py-16 md:py-24">
      <h2 className="text-2xl md:text-3xl font-mono font-bold text-center text-foreground mb-12">
        How ginko works
      </h2>

      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        {/* Terminal Demo */}
        <CornerBrackets corners="all" className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-card/50 px-4 py-2 border-b border-border flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2">terminal</span>
          </div>
          <div className="p-4 font-mono text-sm space-y-1">
            <div className="text-muted-foreground">
              <span className="text-primary">$</span> ginko start
            </div>
            <div className="text-green-500">✓ Session restored from 2026-01-10 15:42</div>
            <div className="text-muted-foreground">→ Loaded 3 active tasks from current sprint</div>
            <div className="text-muted-foreground">→ Found 2 relevant patterns: auth-flow, api-design</div>
            <div className="text-yellow-500">→ Alert: 1 gotcha applies to current work</div>
            <div className="mt-2"></div>
            <div>
              <span className="text-primary font-semibold">Ready</span>
              <span className="text-muted-foreground"> | </span>
              <span className="text-green-500">Hot (8/10)</span>
              <span className="text-muted-foreground"> | Think & Build mode</span>
            </div>
            <div className="text-muted-foreground">Resume: Implementing user auth with JWT tokens</div>
            <div className="mt-2"></div>
            <div className="text-muted-foreground">19 uncommitted files, 2 commits ahead of origin</div>
            <div className="mt-2"></div>
            <div className="text-foreground">What would you like to work on?</div>
            <div className="text-muted-foreground">
              <span className="text-primary">$</span> <span className="animate-pulse">▊</span>
            </div>
          </div>
        </CornerBrackets>

        {/* Explanation */}
        <div className="space-y-4">
          <p className="text-muted-foreground">
            <strong className="text-foreground">ginko</strong> captures your development state and stores it alongside your code. Session logs, sprint progress, patterns, and gotchas are versioned with git.
          </p>
          <p className="text-muted-foreground">
            When you start a new session, your AI assistant has immediate context. No re-explaining. No context rot. Just flow.
          </p>
          <div className="pt-4">
            <Link href="https://docs.ginko.ai/quickstart">
              <Button variant="outline" size="sm">
                Read the quickstart guide
                <ArrowRightIcon className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// Features Section - Static server component
export function FeaturesSection() {
  return (
    <section id="features" className="container mx-auto px-6 py-16 md:py-24">
      <h2 className="text-2xl md:text-3xl font-mono font-bold text-center text-foreground mb-12">
        Features
      </h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ArrowPathIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-mono text-sm text-primary mb-2 uppercase tracking-wider">SESSION_HANDOFF</div>
            <p className="text-muted-foreground text-sm">
              Capture and resume development state across AI sessions
            </p>
          </div>
        </CornerBrackets>

        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ClipboardDocumentCheckIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-mono text-sm text-primary mb-2 uppercase tracking-wider">SPRINT_TRACKING</div>
            <p className="text-muted-foreground text-sm">
              Progress tracking that lives alongside your code
            </p>
          </div>
        </CornerBrackets>

        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <CodeBracketIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-mono text-sm text-primary mb-2 uppercase tracking-wider">PATTERN_CAPTURE</div>
            <p className="text-muted-foreground text-sm">
              Learn from your codebase, remember what works
            </p>
          </div>
        </CornerBrackets>

        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-mono text-sm text-primary mb-2 uppercase tracking-wider">GOTCHA_ALERTS</div>
            <p className="text-muted-foreground text-sm">
              Surface past mistakes before you repeat them
            </p>
          </div>
        </CornerBrackets>

        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ServerStackIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-mono text-sm text-primary mb-2 uppercase tracking-wider">GIT_NATIVE</div>
            <p className="text-muted-foreground text-sm">
              Works offline, versioned with your code
            </p>
          </div>
        </CornerBrackets>

        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg border-primary/30">
          <div className="p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <UserGroupIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-mono text-sm text-primary mb-2 uppercase tracking-wider">
              TEAM_SYNC
              <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Pro</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Share context across team members
            </p>
          </div>
        </CornerBrackets>
      </div>
    </section>
  )
}

// Testimonial Section - Static server component
export function TestimonialSection() {
  return (
    <section className="container mx-auto px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <CornerBrackets corners="all" className="bg-card border border-border rounded-lg p-8 md:p-12">
          <blockquote className="text-lg md:text-xl text-foreground text-center font-medium leading-relaxed">
            &ldquo;The rapport is right there from the start. The flow is preserved, and my frustrations are gone.&rdquo;
          </blockquote>
          <cite className="block text-center text-muted-foreground text-sm mt-4 not-italic">
            — Beta User Feedback
          </cite>
        </CornerBrackets>
      </div>
    </section>
  )
}

// Stats Section - Static server component
export function StatsSection() {
  return (
    <section className="container mx-auto px-6 py-16">
      <CornerBrackets corners="all" className="bg-card border border-border rounded-lg p-8 md:p-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-primary">30s</div>
            <div className="text-muted-foreground text-sm mt-1">Flow Recovery</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-primary">10x</div>
            <div className="text-muted-foreground text-sm mt-1">Faster Context</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-primary">100%</div>
            <div className="text-muted-foreground text-sm mt-1">Git-Native</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-primary">0</div>
            <div className="text-muted-foreground text-sm mt-1">Vendor Lock-in</div>
          </div>
        </div>
      </CornerBrackets>
    </section>
  )
}

// Pricing Section - Static server component
export function PricingSection() {
  return (
    <section id="pricing" className="container mx-auto px-6 py-16 md:py-24">
      <h2 className="text-2xl md:text-3xl font-mono font-bold text-center text-foreground mb-12">
        Pricing
      </h2>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Free Plan */}
        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="p-6">
            <h3 className="font-mono font-bold text-foreground text-lg mb-2">Free</h3>
            <div className="mb-4">
              <span className="text-3xl font-mono font-bold text-foreground">$0</span>
            </div>
            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                1 user, 1 project
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Local context only
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Git integration
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Community support
              </li>
            </ul>
            <Link href="/auth/signup" className="block">
              <Button variant="outline" className="w-full">Get Started</Button>
            </Link>
          </div>
        </CornerBrackets>

        {/* Pro Plan - Featured */}
        <CornerBrackets corners="all" className="bg-card border-2 border-primary rounded-lg relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-primary-foreground text-xs font-mono px-2 py-1 rounded">POPULAR</span>
          </div>
          <div className="p-6">
            <h3 className="font-mono font-bold text-foreground text-lg mb-2">Pro</h3>
            <div className="mb-4">
              <span className="text-3xl font-mono font-bold text-foreground">$9</span>
              <span className="text-muted-foreground text-sm">/user/mo</span>
            </div>
            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Unlimited users
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Team context sync
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Cloud backup
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Team analytics
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Email support
              </li>
            </ul>
            <Link href="/auth/signup" className="block">
              <Button className="w-full">Start Pro Trial</Button>
            </Link>
          </div>
        </CornerBrackets>

        {/* Enterprise Plan */}
        <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
          <div className="p-6">
            <h3 className="font-mono font-bold text-foreground text-lg mb-2">Enterprise</h3>
            <div className="mb-4">
              <span className="text-3xl font-mono font-bold text-foreground">$29</span>
              <span className="text-muted-foreground text-sm">/user/mo</span>
            </div>
            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                SSO/SAML integration
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Audit logging
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                On-premise deployment
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-primary" />
                Priority support & SLA
              </li>
            </ul>
            <a href="mailto:chris@watchhill.ai" className="block">
              <Button variant="outline" className="w-full">Contact Sales</Button>
            </a>
          </div>
        </CornerBrackets>
      </div>
    </section>
  )
}
