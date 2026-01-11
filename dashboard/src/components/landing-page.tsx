/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [landing-page, marketing, hero, features, pricing, testimonial, conversion]
 * @related: [page.tsx, button.tsx, auth/login/page.tsx, corner-brackets.tsx]
 * @priority: high
 * @complexity: high
 * @dependencies: [react, next/link, heroicons, ui/button, ui/corner-brackets]
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CornerBrackets } from '@/components/ui/corner-brackets'
import {
  ArrowRightIcon,
  ChartBarIcon,
  CodeBracketIcon,
  BoltIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  UserGroupIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export function LandingPage() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="font-mono text-2xl font-bold text-foreground hover:text-primary transition-colors">
              <span className="text-primary">g</span>inko
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <Link href="https://docs.ginko.ai" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section - A/B test ready with data attributes */}
        <section className="container mx-auto px-6 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <CornerBrackets size="lg" corners="all" className="inline-block mb-8">
              <h1
                className="text-3xl md:text-5xl lg:text-6xl font-mono font-bold text-foreground leading-tight px-4 py-2"
                data-hero-title
              >
                Stop re-explaining your codebase to AI.
              </h1>
            </CornerBrackets>
            <p
              className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto"
              data-hero-subtitle
            >
              ginko keeps context in the collaboration graph. Resume in 30 seconds with your project, decisions, and patterns intact.
            </p>

            {/* Terminal Install Command */}
            <div className="inline-flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 mb-10 font-mono text-sm">
              <span className="text-primary">$</span>
              <code className="text-foreground">npm install -g @ginkoai/cli</code>
              <button
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={() => copyToClipboard('npm install -g @ginkoai/cli')}
                aria-label="Copy to clipboard"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-primary" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto" data-hero-cta-primary>
                  Install CLI
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="https://docs.ginko.ai" target="_blank">
                <Button variant="outline" size="lg" className="w-full sm:w-auto" data-hero-cta-secondary>
                  View Docs
                </Button>
              </Link>
            </div>
          </div>

          {/* Logo Marquee - Tools & Technologies */}
          <div className="mt-16 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
            <div className="flex animate-marquee whitespace-nowrap py-4">
              {/* First set */}
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">ANTHROPIC</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">CURSOR</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">GITHUB</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">VERCEL</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">NEO4J</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">TYPESCRIPT</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">NEXT.JS</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">SUPABASE</span>
              {/* Duplicate set for seamless loop */}
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">ANTHROPIC</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">CURSOR</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">GITHUB</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">VERCEL</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">NEO4J</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">TYPESCRIPT</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">NEXT.JS</span>
              <span className="mx-8 text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">SUPABASE</span>
            </div>
          </div>
        </section>

        {/* Problem Cards */}
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

        {/* How It Works Section */}
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

        {/* Features Section */}
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

        {/* Testimonial Section */}
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

        {/* Stats Section */}
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

        {/* Pricing Section */}
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

        {/* Final CTA Section */}
        <section className="container mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl mx-auto">
            <CornerBrackets corners="all" className="bg-card border border-border rounded-lg p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-mono font-bold text-foreground mb-6">
                Ready to eliminate context rot?
              </h2>

              {/* Terminal Install Command */}
              <div className="inline-flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 mb-8 font-mono text-sm">
                <span className="text-primary">$</span>
                <code className="text-foreground">npm install -g @ginkoai/cli</code>
                <button
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => copyToClipboard('npm install -g @ginkoai/cli')}
                  aria-label="Copy to clipboard"
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4 text-primary" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started Free
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="https://docs.ginko.ai" target="_blank">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Read the Docs
                  </Button>
                </Link>
              </div>
            </CornerBrackets>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="font-mono text-xl font-bold text-foreground hover:text-primary transition-colors">
                <span className="text-primary">g</span>inko
              </Link>
              <p className="text-muted-foreground text-sm mt-2">
                Context that flows with you
              </p>
            </div>

            <div>
              <h4 className="font-mono font-semibold text-foreground text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><Link href="https://docs.ginko.ai" className="hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="https://github.com/ginkoai" className="hover:text-primary transition-colors">GitHub</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-semibold text-foreground text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:chris@watchhill.ai" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-semibold text-foreground text-sm mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="https://docs.ginko.ai/quickstart" className="hover:text-primary transition-colors">Getting Started</Link></li>
                <li><Link href="https://docs.ginko.ai/api" className="hover:text-primary transition-colors">API Reference</Link></li>
                <li><a href="mailto:chris@watchhill.ai" className="hover:text-primary transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © 2025 ginko. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}