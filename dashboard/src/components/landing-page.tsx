/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-14
 * @tags: [landing-page, marketing, hero, features, ui]
 * @related: [page.tsx, button.tsx, auth/login/page.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next/link, heroicons, ui/button]
 */
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRightIcon, ChartBarIcon, CodeBracketIcon, SparklesIcon } from '@heroicons/react/24/outline'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="relative">
        <div className="container mx-auto px-6 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Ginko</span>
            </div>
            <div className="space-x-4">
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
      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Intelligent Context Management for{' '}
            <span className="text-blue-600">Claude Code</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Transform your development workflow with AI-powered context awareness. 
            Ginko learns from your coding patterns and provides intelligent 
            suggestions to accelerate your development process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              View Demo
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <CodeBracketIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Smart Code Analysis
              </h3>
              <p className="text-gray-600">
                Automatically analyze your codebase patterns and provide 
                contextual suggestions for better development practices.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <SparklesIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI-Powered Insights
              </h3>
              <p className="text-gray-600">
                Leverage advanced AI to understand your development workflow 
                and provide intelligent context management.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <ChartBarIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Advanced Analytics
              </h3>
              <p className="text-gray-600">
                Track your development patterns, session analytics, and 
                productivity metrics with detailed insights.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-24 bg-white rounded-2xl shadow-xl p-12">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">10K+</div>
              <div className="text-gray-600 mt-1">Sessions Analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">500+</div>
              <div className="text-gray-600 mt-1">Developers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">95%</div>
              <div className="text-gray-600 mt-1">Productivity Gain</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">24/7</div>
              <div className="text-gray-600 mt-1">AI Support</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <SparklesIcon className="h-6 w-6" />
            <span className="text-xl font-bold">Ginko</span>
          </div>
          <p className="text-gray-400">
            Intelligent context management for modern development
          </p>
        </div>
      </footer>
    </div>
  )
}