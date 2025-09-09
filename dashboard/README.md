# Ginko Dashboard

A modern Next.js 14 dashboard application for ContextMCP - intelligent context management for Claude Code sessions.

## 🚀 Monetization Roadmap

### Current Status: Pre-Monetization (70% Infrastructure Complete)
The dashboard infrastructure is production-ready with authentication, database, and core features implemented. Monetization features are planned for Q1 2025.

### Monetization Timeline

#### Phase 1: MVP (Weeks 1-2) - January 2025
- [ ] **Stripe Integration**: Activate billing infrastructure
- [ ] **Public Session Viewer**: Shareable session URLs at `/session/[id]`
- [ ] **Coaching Insights Display**: AI-powered recommendations
- [ ] **Free Tier Signup**: Onboarding flow for new users

#### Phase 2: Pro Features (Weeks 3-4) - January 2025
- [ ] **Advanced Analytics Dashboard**: Team metrics and comparisons
- [ ] **AI Key Management**: Secure storage for customer API keys
- [ ] **Team Collaboration**: Shared sessions and insights
- [ ] **Export Capabilities**: CSV/JSON data export

#### Phase 3: Launch (Week 5-6) - February 2025
- [ ] **Pricing Page**: Tier comparison and checkout
- [ ] **Marketing Website**: Landing pages and feature tours
- [ ] **Documentation**: User guides and API docs
- [ ] **Early Access Program**: Beta user onboarding

#### Phase 4: Enterprise (Months 3-6) - Q2 2025
- [ ] **SSO/SAML**: Enterprise authentication
- [ ] **Custom Workflows**: SCRUM, Kanban, SAFe templates
- [ ] **Advanced Permissions**: Role-based access control
- [ ] **SLA & Support**: Enterprise support infrastructure

### Pricing Tiers (Planned)
- **Free**: Unlimited personal use, single project
- **Pro**: $10/user/month - Teams, analytics, multi-project
- **Enterprise**: Custom pricing - SSO, workflows, SLA

### Key Differentiators
- **Privacy-First**: Customer API keys, zero-knowledge architecture
- **AI-Native**: Built for AI development workflows
- **Git-Native**: All data stored in version control
- **41% Cheaper**: Than comparable Jira Premium features

For detailed monetization strategy, see [docs/PRD/monetization-strategy-2025.md](../docs/PRD/monetization-strategy-2025.md)

## Features

- **Next.js 14 App Router** - Latest Next.js with app directory structure
- **TypeScript** - Full type safety throughout the application
- **Tailwind CSS** - Modern utility-first CSS framework
- **Supabase Integration** - Authentication and database management
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Real-time Analytics** - Session tracking and productivity insights
- **Component Library** - Reusable UI components with consistent design
- **Error Boundaries** - Graceful error handling and recovery
- **Loading States** - Smooth user experience with proper loading indicators

## Project Structure

```
dashboard/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard pages
│   │   └── api/               # API routes (if needed)
│   ├── components/            # React components
│   │   ├── ui/                # Reusable UI components
│   │   ├── auth/              # Authentication components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   └── layout/            # Layout components
│   ├── lib/                   # Library code and configurations
│   │   └── supabase/          # Supabase client setup
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. **Install dependencies:**
   ```bash
   cd dashboard
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_CONTEXTMCP_API_URL=http://localhost:3001
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Authentication

The application uses Supabase Auth with the following features:

- **Email/Password Authentication**
- **Protected Routes** - Dashboard requires authentication
- **User Profile Management**
- **Session Management** - Automatic token refresh

## Database Schema

The application expects the following Supabase tables:

### profiles
- `id` (uuid, primary key)
- `full_name` (text)
- `username` (text, unique)
- `avatar_url` (text)
- `website` (text)
- `updated_at` (timestamp)

### sessions
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `title` (text)
- `description` (text)
- `start_time` (timestamp)
- `end_time` (timestamp, nullable)
- `status` (enum: active, completed, paused)
- `files_count` (integer)
- `context_size` (integer)
- `metadata` (json)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### session_analytics
- `id` (uuid, primary key)
- `session_id` (uuid, foreign key)
- `user_id` (uuid, foreign key)
- `event_type` (text)
- `event_data` (json)
- `timestamp` (timestamp)
- `created_at` (timestamp)

## UI Components

The application includes a comprehensive set of reusable UI components:

- **Button** - Multiple variants and sizes
- **Input** - Form inputs with validation states
- **Card** - Content containers
- **Badge** - Status indicators
- **Alert** - Notification messages
- **Avatar** - User profile images
- **Dropdown** - Context menus
- **Select** - Form selects
- **Loading Spinner** - Loading states

## Customization

### Styling

The application uses Tailwind CSS with a custom configuration:

- **Colors** - Primary blue theme with secondary grays
- **Typography** - Inter font family with JetBrains Mono for code
- **Animations** - Smooth transitions and loading states

### Adding New Pages

1. Create a new page in `src/app/dashboard/`
2. Add navigation link in `src/components/dashboard/dashboard-sidebar.tsx`
3. Implement the page component with proper TypeScript types

### Adding New Components

1. Create component in appropriate directory under `src/components/`
2. Export from component file
3. Add TypeScript interfaces for props
4. Include proper error handling and loading states

## API Integration

The application integrates with the ContextMCP backend API:

- **Session Management** - CRUD operations for sessions
- **Analytics** - Productivity metrics and insights
- **User Preferences** - Profile and settings management

## Error Handling

- **Error Boundaries** - React error boundaries for graceful failure
- **API Error Handling** - Proper error responses and user feedback
- **Form Validation** - Client-side validation with helpful messages
- **Loading States** - Skeleton loaders and spinners

## Performance

- **Code Splitting** - Automatic code splitting with Next.js
- **Image Optimization** - Next.js Image component
- **Bundle Analysis** - Analyze bundle size
- **Caching** - Proper caching strategies

## Accessibility

- **Semantic HTML** - Proper HTML structure
- **Keyboard Navigation** - Full keyboard support
- **ARIA Labels** - Screen reader compatibility
- **Color Contrast** - WCAG compliant color choices

## Contributing

1. Follow the existing code style and patterns
2. Write TypeScript for all new code
3. Include proper error handling
4. Add loading states for async operations
5. Test components thoroughly
6. Update documentation as needed

## License

MIT License - see LICENSE file for details