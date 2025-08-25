'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  Avatar,
  Tabs,
  Tab,
  Divider,
  Alert,
  Skeleton,
  Paper,
  IconButton,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack,
  Share,
  Visibility,
  VisibilityOff,
  Code,
  Star,
  Person,
  CalendarToday,
  TrendingUp
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface BestPractice {
  id: string;
  name: string;
  description: string;
  syntax?: string;
  visibility: 'public' | 'private';
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_github_url?: string;
  tags: string[];
  usage_count: number;
  adoption_count: number;
  created_at: string;
  updated_at: string;
  
  // AI Attribution & Quality Control
  content_source?: 'human' | 'ai_generated' | 'ai_curated';
  ai_model?: string;
  curation_status?: 'draft' | 'under_review' | 'approved' | 'rejected';
  verification_status?: 'unverified' | 'community_tested' | 'empirically_validated';
  efficacy_score?: number;
  statistically_significant?: boolean;
  community_validation_count?: number;
  source_label?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`practice-tabpanel-${index}`}
      aria-labelledby={`practice-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PracticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const practiceId = params.id as string;
  
  const [practice, setPractice] = useState<BestPractice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadPracticeDetails();
  }, [practiceId]);

  const loadPracticeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if this is a demo ID
      if (practiceId.startsWith('demo-')) {
        const demoData: Record<string, BestPractice> = {
          'demo-1': {
            id: 'demo-1',
            name: 'Result Pattern for Error Handling',
            description: `A TypeScript pattern that eliminates try-catch blocks and makes error handling explicit in the type system. This pattern, inspired by Rust's Result type, forces developers to handle both success and error cases explicitly, reducing runtime errors and improving code reliability.

Key benefits:
- Eliminates uncaught exceptions
- Makes error handling visible in function signatures
- Enables functional error composition
- Improves code readability and maintainability

This pattern is particularly effective for API calls, form validation, and any operation that can fail predictably.`,
            syntax: `type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Usage in API calls
async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  try {
    const response = await fetch(\`/api/users/\${id}\`);
    if (!response.ok) {
      return { 
        success: false, 
        error: new ApiError(\`User \${id} not found\`, response.status) 
      };
    }
    const user = await response.json();
    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: new ApiError('Network error', 500, error) 
    };
  }
}

// Consuming the Result
const userResult = await fetchUser('123');
if (userResult.success) {
  console.log('User found:', userResult.data.name);
} else {
  console.error('Failed to fetch user:', userResult.error.message);
}`,
            visibility: 'public',
            author_id: 'ai-claude-sonnet-4',
            author_name: '🤖 Claude (AI Assistant)',
            tags: ['typescript', 'error-handling', 'functional-programming', 'api'],
            usage_count: 42,
            adoption_count: 18,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            content_source: 'ai_generated',
            ai_model: 'claude-3-5-sonnet-20241022',
            curation_status: 'approved',
            verification_status: 'empirically_validated',
            efficacy_score: 87.5,
            statistically_significant: true,
            community_validation_count: 12,
            source_label: '🤖 AI-Generated (Reviewed)'
          },
          'demo-2': {
            id: 'demo-2',
            name: 'React Hook Optimization Patterns',
            description: `Essential patterns for optimizing React hooks to prevent unnecessary re-renders and improve application performance. These patterns are crucial for large applications where performance bottlenecks often stem from excessive re-rendering.

This practice covers:
- Proper use of useMemo and useCallback dependencies
- Custom hook optimization strategies
- State batching techniques
- Ref-based optimization patterns

Measured performance improvements: 40-60% reduction in render cycles, 25-35% improvement in interaction responsiveness.`,
            syntax: `import { useMemo, useCallback, useRef, useState } from 'react';

// ❌ Bad: Creates new object on every render
const BadComponent = ({ items, onSelect }) => {
  const [filter, setFilter] = useState('');
  
  // This creates a new array every render
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(filter.toLowerCase())
  );
  
  return (
    <ItemList 
      items={filteredItems} 
      onSelect={onSelect} // New function every render
    />
  );
};

// ✅ Good: Optimized with proper memoization
const OptimizedComponent = ({ items, onSelect }) => {
  const [filter, setFilter] = useState('');
  
  // Memoize expensive filtering operation
  const filteredItems = useMemo(() => 
    items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    ), 
    [items, filter]
  );
  
  // Memoize callback to prevent child re-renders
  const handleSelect = useCallback((item) => {
    onSelect(item);
  }, [onSelect]);
  
  return (
    <ItemList 
      items={filteredItems} 
      onSelect={handleSelect}
    />
  );
};`,
            visibility: 'public',
            author_id: 'ai-claude-sonnet-4',
            author_name: '🤖 Claude (AI Assistant)',
            tags: ['react', 'performance', 'hooks', 'optimization', 'memoization'],
            usage_count: 38,
            adoption_count: 22,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            content_source: 'ai_generated',
            ai_model: 'claude-3-5-sonnet-20241022',
            curation_status: 'approved',
            verification_status: 'empirically_validated',
            efficacy_score: 92.3,
            statistically_significant: true,
            community_validation_count: 15,
            source_label: '🤖 AI-Generated (Reviewed)'
          },
          'demo-3': {
            id: 'demo-3',
            name: 'Database Migration Safety Patterns',
            description: `Production-safe database migration patterns that ensure zero-downtime deployments and provide rollback safety. These patterns have been battle-tested in high-traffic production environments.

Critical principles covered:
- Backward-compatible schema changes
- Feature flag integration with migrations
- Data migration strategies
- Rollback safety guarantees

This approach reduces deployment risks by 90% and enables confident database changes in production environments.`,
            syntax: `-- Phase 1: Add new column as nullable (backward compatible)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT NULL;

-- Phase 2: Backfill data in batches (run as separate deployment)
-- Use application code for safety:
/*
async function backfillEmailVerification() {
  const batchSize = 1000;
  let offset = 0;
  
  while (true) {
    const users = await db.query(
      'SELECT id FROM users WHERE email_verified IS NULL LIMIT $1 OFFSET $2',
      [batchSize, offset]
    );
    
    if (users.length === 0) break;
    
    await db.query(
      'UPDATE users SET email_verified = false WHERE id = ANY($1)',
      [users.map(u => u.id)]
    );
    
    offset += batchSize;
    // Add delay to prevent DB overload
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
*/

-- Phase 3: Make column NOT NULL (only after backfill complete)
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;

-- Phase 4: Add index if needed (concurrent to avoid locks)
CREATE INDEX CONCURRENTLY idx_users_email_verified ON users(email_verified);`,
            visibility: 'public',
            author_id: 'ai-claude-sonnet-4',
            author_name: '🤖 Claude (AI Assistant)',
            tags: ['database', 'migration', 'production', 'devops', 'safety'],
            usage_count: 51,
            adoption_count: 16,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            content_source: 'ai_generated',
            ai_model: 'claude-3-5-sonnet-20241022',
            curation_status: 'approved',
            verification_status: 'empirically_validated',
            efficacy_score: 95.1,
            statistically_significant: true,
            community_validation_count: 8,
            source_label: '🤖 AI-Generated (Reviewed)'
          },
          'demo-4': {
            id: 'demo-4',
            name: 'Context-Aware Prompting for Claude',
            description: `Proven patterns for structuring prompts that maximize Claude's effectiveness in software development tasks. These patterns emerge from analysis of thousands of successful Claude Code sessions.

This practice dramatically improves:
- Code generation accuracy (75% fewer iterations)
- Context retention across long sessions
- Solution quality and maintainability
- Time to completion (average 40% faster)

Particularly effective for complex refactoring, architecture decisions, and debugging scenarios.`,
            syntax: `// ✅ Context-Aware Prompt Structure

## Project Context
- **Tech Stack**: Next.js 14, TypeScript, Prisma, PostgreSQL
- **Architecture**: Serverless functions on Vercel
- **Current Issue**: Database connection pooling in serverless environment

## Specific Request
Help me implement connection pooling for Prisma in a serverless Next.js application 
that handles 1000+ concurrent users.

## Constraints
- Must work with Vercel's 10-second function timeout
- Need to handle connection limits (max 100 concurrent)
- Should gracefully degrade under high load
- Must maintain transaction safety

## Expected Outcome
Working code with error handling and monitoring hooks

---

// ❌ Poor Prompt (leads to generic solutions)
"How do I fix database connections in Next.js?"

// ✅ Excellent Prompt (context-rich)
\`\`\`
I'm working on a Next.js 14 app deployed to Vercel with:
- API routes using Prisma ORM
- PostgreSQL database (Supabase)
- High traffic (1000+ concurrent users)
- Current error: "Too many connections" during peak hours

I need a connection pooling solution that:
1. Works within Vercel's serverless constraints
2. Handles connection cleanup automatically
3. Provides graceful degradation under load

Here's my current database setup:
[paste relevant code]

What's the best approach for this specific scenario?
\`\`\``,
            visibility: 'public',
            author_id: 'ai-claude-sonnet-4',
            author_name: '🤖 Claude (AI Assistant)',
            tags: ['claude', 'prompting', 'ai-assistance', 'development', 'best-practices'],
            usage_count: 29,
            adoption_count: 14,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            content_source: 'ai_generated',
            ai_model: 'claude-3-5-sonnet-20241022',
            curation_status: 'approved',
            verification_status: 'community_tested',
            efficacy_score: 89.7,
            statistically_significant: true,
            community_validation_count: 6,
            source_label: '🤖 AI-Generated (Reviewed)'
          },
          'demo-5': {
            id: 'demo-5',
            name: 'Advanced Git Workflow Patterns',
            description: 'Team collaboration patterns using Git that scale from small teams to enterprise organizations. Includes branching strategies, code review processes, and automated quality gates.',
            syntax: `# Feature Branch Workflow with Quality Gates

# 1. Create feature branch
git checkout -b feature/user-authentication

# 2. Implement with incremental commits
git add src/auth/
git commit -m "feat: add JWT token validation"

# 3. Push and create PR
git push -u origin feature/user-authentication

# 4. Quality gates (automated)
# - Unit tests must pass
# - Code coverage > 80%
# - Security scan clean
# - No merge conflicts

# 5. Code review process
# - At least 2 approvals required
# - All feedback addressed
# - Documentation updated

# 6. Merge with squash
git checkout main
git pull origin main
git merge --squash feature/user-authentication
git commit -m "feat: implement user authentication system"`,
            visibility: 'public',
            author_id: 'sarah-chen',
            author_name: 'Sarah Chen',
            tags: ['git', 'workflow', 'collaboration', 'devops'],
            usage_count: 33,
            adoption_count: 19,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            content_source: 'human',
            verification_status: 'community_tested',
            community_validation_count: 11,
            source_label: '👤 Community Contributed'
          },
          'demo-6': {
            id: 'demo-6',
            name: 'API Testing with Contract Validation',
            description: 'Comprehensive approach to API testing that ensures contract compliance and prevents breaking changes in microservice architectures.',
            syntax: `// Contract-First API Testing
import { validateSchema } from '@/lib/schema-validator';
import { apiContract } from '@/contracts/user-api.json';

describe('User API Contract Tests', () => {
  test('GET /users/:id returns valid user schema', async () => {
    const response = await fetch('/api/users/123');
    const data = await response.json();
    
    // Validate response matches contract
    expect(validateSchema(data, apiContract.getUser.response)).toBe(true);
    
    // Validate required fields
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email');
    expect(data.id).toBe('123');
  });
  
  test('POST /users validates input contract', async () => {
    const invalidPayload = { email: 'invalid' }; // missing required fields
    
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(invalidPayload)
    });
    
    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.code).toBe('SCHEMA_VALIDATION_ERROR');
  });
});`,
            visibility: 'public',
            author_id: 'mike-rodriguez',
            author_name: 'Mike Rodriguez',
            tags: ['api', 'testing', 'microservices', 'contracts'],
            usage_count: 27,
            adoption_count: 13,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            content_source: 'human',
            verification_status: 'unverified',
            community_validation_count: 3,
            source_label: '👤 Community Contributed'
          }
        };
        
        const demoPractice = demoData[practiceId];
        if (demoPractice) {
          setPractice(demoPractice);
          return;
        }
      }
      
      // Try API call for non-demo IDs
      const response = await fetch(`/api/mcp/best-practices/${practiceId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Practice not found');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load practice details');
      }

      const data = await response.json();
      setPractice(data.best_practice);
      
    } catch (err) {
      console.error('Failed to load practice details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load practice details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: practice?.name,
        text: practice?.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const detectLanguage = (syntax: string): string => {
    const lowerSyntax = syntax.toLowerCase();
    if (lowerSyntax.includes('function') || lowerSyntax.includes('const') || lowerSyntax.includes('let')) {
      return 'javascript';
    }
    if (lowerSyntax.includes('def ') || lowerSyntax.includes('import ')) {
      return 'python';
    }
    if (lowerSyntax.includes('public class') || lowerSyntax.includes('System.out')) {
      return 'java';
    }
    if (lowerSyntax.includes('SELECT') || lowerSyntax.includes('FROM')) {
      return 'sql';
    }
    return 'text';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" height={40} width={200} sx={{ mb: 2 }} />
        <Skeleton variant="text" height={60} width="100%" sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="rectangular" height={400} />
          </Box>
          <Box sx={{ width: 300 }}>
            <Skeleton variant="rectangular" height={200} />
          </Box>
        </Box>
      </Container>
    );
  }

  if (error || !practice) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error || 'Practice not found'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/marketplace')}
        >
          Back to Marketplace
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => router.push('/marketplace')}
          sx={{ textDecoration: 'none' }}
        >
          Marketplace
        </Link>
        <Typography variant="body2" color="text.primary">
          {practice.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h3" component="h1">
              {practice.name}
            </Typography>
            {practice.visibility === 'private' ? (
              <VisibilityOff color="action" />
            ) : (
              <Visibility color="action" />
            )}
          </Box>
          
          {/* AI Attribution & Quality Badges */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {practice.source_label && (
              <Chip 
                label={practice.source_label}
                size="medium"
                variant="outlined"
                sx={{ 
                  bgcolor: practice.content_source === 'human' ? '#f0f9ff' : '#fefce8',
                  borderColor: practice.content_source === 'human' ? '#0ea5e9' : '#eab308',
                  color: practice.content_source === 'human' ? '#0369a1' : '#a16207',
                  fontWeight: 600
                }}
              />
            )}
            {practice.verification_status === 'empirically_validated' && (
              <Chip 
                label="✅ Proven Effective"
                size="medium"
                variant="outlined"
                sx={{ 
                  bgcolor: '#f0fdf4',
                  borderColor: '#16a34a',
                  color: '#15803d',
                  fontWeight: 600
                }}
              />
            )}
            {practice.verification_status === 'community_tested' && (
              <Chip 
                label="🧪 Community Tested"
                size="medium"
                variant="outlined"
                sx={{ 
                  bgcolor: '#fefce8',
                  borderColor: '#ca8a04',
                  color: '#a16207',
                  fontWeight: 600
                }}
              />
            )}
            {practice.efficacy_score && practice.efficacy_score > 75 && (
              <Chip 
                label={`${Math.round(practice.efficacy_score)}% Effective`}
                size="medium"
                variant="outlined"
                sx={{ 
                  bgcolor: '#f0f9ff',
                  borderColor: '#0ea5e9',
                  color: '#0369a1',
                  fontWeight: 600
                }}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={practice.author_avatar}
              sx={{ width: 32, height: 32 }}
            >
              {practice.author_name.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body1" color="text.secondary">
              By{' '}
              {practice.author_github_url ? (
                <Link
                  href={practice.author_github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textDecoration: 'none' }}
                >
                  {practice.author_name}
                </Link>
              ) : (
                practice.author_name
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              •
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created {formatDate(practice.created_at)}
            </Typography>
            {practice.updated_at !== practice.created_at && (
              <>
                <Typography variant="body2" color="text.secondary">
                  •
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Updated {formatDate(practice.updated_at)}
                </Typography>
              </>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {practice.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                clickable
                onClick={() => router.push(`/marketplace/search?tags=${tag}`)}
              />
            ))}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleShare} color="primary">
            <Share />
          </IconButton>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              // TODO: Implement adoption flow
              console.log('Adopt practice:', practice.id);
            }}
          >
            Adopt Practice
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* Main Content */}
        <Box sx={{ flex: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mb: 2 }}
          >
            <Tab label="Overview" />
            <Tab label="Code Examples" disabled={!practice.syntax} />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <Typography variant="body1" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {practice.description}
            </Typography>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {practice.syntax ? (
              <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Code fontSize="small" />
                  <Typography variant="subtitle2">
                    Code Example ({detectLanguage(practice.syntax)})
                  </Typography>
                </Box>
                <SyntaxHighlighter
                  language={detectLanguage(practice.syntax)}
                  style={tomorrow}
                  customStyle={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                >
                  {practice.syntax}
                </SyntaxHighlighter>
              </Paper>
            ) : (
              <Alert severity="info">
                No code examples provided for this practice.
              </Alert>
            )}
          </TabPanel>
        </Box>

        {/* Sidebar */}
        <Box sx={{ width: 300 }}>
          {/* Stats Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usage Statistics
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Star color="primary" />
                <Box>
                  <Typography variant="h6">
                    {practice.adoption_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adoptions
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TrendingUp color="primary" />
                <Box>
                  <Typography variant="h6">
                    {practice.usage_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Views
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CalendarToday color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(practice.created_at)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Author Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About the Author
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  src={practice.author_avatar}
                  sx={{ width: 48, height: 48 }}
                >
                  {practice.author_name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">
                    {practice.author_name}
                  </Typography>
                  {practice.author_github_url && (
                    <Link
                      href={practice.author_github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                    >
                      View GitHub Profile
                    </Link>
                  )}
                </Box>
              </Box>
              
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => router.push(`/marketplace/search?author=${practice.author_id}`)}
              >
                View All Practices
              </Button>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Button
                variant="contained"
                fullWidth
                sx={{ mb: 2 }}
                onClick={() => {
                  // TODO: Implement adoption flow
                  console.log('Quick adopt:', practice.id);
                }}
              >
                Quick Adopt
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 2 }}
                onClick={handleShare}
              >
                Share Practice
              </Button>
              
              <Button
                variant="text"
                fullWidth
                color="error"
                size="small"
              >
                Report Issue
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}