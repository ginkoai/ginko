/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [landing-page, marketing, hero, features, ui, ginko-branding]
 * @related: [page.tsx, button.tsx, auth/login/page.tsx, corner-brackets.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next/link, heroicons, ui/button, ui/corner-brackets]
 */
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CornerBrackets } from '@/components/ui/corner-brackets'
import { ArrowRightIcon, ChartBarIcon, CodeBracketIcon, BoltIcon } from '@heroicons/react/24/outline'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="font-mono text-2xl font-bold text-foreground hover:text-primary transition-colors">
              <span className="text-primary">g</span>inko
            </Link>
            <div className="flex items-center space-x-3">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <CornerBrackets size="lg" corners="all" className="inline-block mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold text-foreground leading-tight">
              The AI Collaboration Platform.
            </h1>
          </CornerBrackets>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
            Where humans and AI ship together. Back in flow in 30 seconds.
          </p>

          {/* Terminal Install Command */}
          <div className="inline-flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 mb-10 font-mono text-sm">
            <span className="text-primary">$</span>
            <code className="text-foreground">npm install -g @ginkoai/cli</code>
            <button
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={() => navigator.clipboard.writeText('npm install -g @ginkoai/cli')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://docs.ginko.ai" target="_blank">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View Docs
              </Button>
            </Link>
          </div>
        </div>

        {/* Problem Cards */}
        <div className="mt-24 grid md:grid-cols-3 gap-6">
          <CornerBrackets corners="all" variant="muted" className="bg-card rounded-lg">
            <div className="text-center p-6">
              <div className="font-mono text-sm text-primary mb-3 uppercase tracking-wider">CONTEXT_ROT</div>
              <p className="text-muted-foreground text-sm">
                AI assistants lose effectiveness as conversations grow. By message 50, they're guessing.
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
                Context lives in your head. When you switch tools or take a break, it's gone.
              </p>
            </div>
          </CornerBrackets>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BoltIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-mono font-semibold text-foreground mb-2">
              30-Second Recovery
            </h3>
            <p className="text-muted-foreground text-sm">
              Resume exactly where you left off. Your context, decisions, and progress—instantly restored.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <CodeBracketIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-mono font-semibold text-foreground mb-2">
              Git-Native Context
            </h3>
            <p className="text-muted-foreground text-sm">
              Context lives in your repo. No vendor lock-in. Works with Claude Code, Cursor, and more.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ChartBarIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-mono font-semibold text-foreground mb-2">
              Collaboration Insights
            </h3>
            <p className="text-muted-foreground text-sm">
              Track patterns, measure productivity, and get coaching to improve your AI collaboration.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-24">
          <CornerBrackets corners="all" className="bg-card border border-border rounded-lg p-12">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-mono font-bold text-primary">30s</div>
                <div className="text-muted-foreground text-sm mt-1">Flow Recovery</div>
              </div>
              <div>
                <div className="text-3xl font-mono font-bold text-primary">10x</div>
                <div className="text-muted-foreground text-sm mt-1">Faster Context</div>
              </div>
              <div>
                <div className="text-3xl font-mono font-bold text-primary">100%</div>
                <div className="text-muted-foreground text-sm mt-1">Git-Native</div>
              </div>
              <div>
                <div className="text-3xl font-mono font-bold text-primary">0</div>
                <div className="text-muted-foreground text-sm mt-1">Vendor Lock-in</div>
              </div>
            </div>
          </CornerBrackets>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-border py-12">
        <div className="container mx-auto px-6 text-center">
          <Link href="/" className="font-mono text-xl font-bold text-foreground hover:text-primary transition-colors">
            <span className="text-primary">g</span>inko
          </Link>
          <p className="text-muted-foreground text-sm mt-2">
            The AI Collaboration Platform
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <Link href="https://docs.ginko.ai" className="hover:text-primary transition-colors">Docs</Link>
            <Link href="https://github.com/ginkoai" className="hover:text-primary transition-colors">GitHub</Link>
            <Link href="/auth/login" className="hover:text-primary transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}