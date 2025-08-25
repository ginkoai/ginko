/**
 * @fileType: page
 * @status: current
 * @updated: 2025-08-14
 * @tags: [marketplace, best-practices, search, discovery, community]
 * @related: [create/page.tsx, my-practices/page.tsx, practices/[id]/page.tsx]
 * @priority: medium
 * @complexity: high
 * @dependencies: [react, mui/material, heroicons]
 */
'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Chip,
  InputAdornment,
  Skeleton,
  Alert
} from '@mui/material';
import { Search, Add, TrendingUp, Star, Visibility } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface BestPractice {
  id: string;
  name: string;
  description: string;
  author_name: string;
  author_avatar?: string;
  tags: string[];
  usage_count: number;
  adoption_count: number;
  created_at: string;
  visibility: 'public' | 'private';
  
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

interface MarketplaceStats {
  total_practices: number;
  active_contributors: number;
  adoptions_this_month: number;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredPractices, setFeaturedPractices] = useState<BestPractice[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Always use demo data for now to demonstrate AI attribution system
      console.log('Loading demo data to showcase AI Attribution and Efficacy Tracking System');
      
      // Fallback to demo data to show AI attribution system
      const demoData: BestPractice[] = [
        {
          id: 'demo-1',
          name: 'Result Pattern for Error Handling',
          description: 'A TypeScript pattern that eliminates try-catch blocks and makes error handling explicit in the type system. This pattern, inspired by Rust\'s Result type, forces developers to handle both success and error cases explicitly, reducing runtime errors and improving code reliability.',
          author_name: '🤖 Claude (AI Assistant)',
          tags: ['typescript', 'error-handling', 'functional-programming', 'api'],
          usage_count: 42,
          adoption_count: 18,
          created_at: new Date().toISOString(),
          visibility: 'public',
          content_source: 'ai_generated',
          ai_model: 'claude-3-5-sonnet-20241022',
          curation_status: 'approved',
          verification_status: 'empirically_validated',
          efficacy_score: 87.5,
          statistically_significant: true,
          community_validation_count: 12,
          source_label: '🤖 AI-Generated (Reviewed)'
        },
        {
          id: 'demo-2',
          name: 'React Hook Optimization Patterns',
          description: 'Essential patterns for optimizing React hooks to prevent unnecessary re-renders and improve application performance. These patterns are crucial for large applications where performance bottlenecks often stem from excessive re-rendering.',
          author_name: '🤖 Claude (AI Assistant)',
          tags: ['react', 'performance', 'hooks', 'optimization', 'memoization'],
          usage_count: 38,
          adoption_count: 22,
          created_at: new Date().toISOString(),
          visibility: 'public',
          content_source: 'ai_generated',
          ai_model: 'claude-3-5-sonnet-20241022',
          curation_status: 'approved',
          verification_status: 'empirically_validated',
          efficacy_score: 92.3,
          statistically_significant: true,
          community_validation_count: 15,
          source_label: '🤖 AI-Generated (Reviewed)'
        },
        {
          id: 'demo-3',
          name: 'Database Migration Safety Patterns',
          description: 'Production-safe database migration patterns that ensure zero-downtime deployments and provide rollback safety. These patterns have been battle-tested in high-traffic production environments.',
          author_name: '🤖 Claude (AI Assistant)',
          tags: ['database', 'migration', 'production', 'devops', 'safety'],
          usage_count: 51,
          adoption_count: 16,
          created_at: new Date().toISOString(),
          visibility: 'public',
          content_source: 'ai_generated',
          ai_model: 'claude-3-5-sonnet-20241022',
          curation_status: 'approved',
          verification_status: 'empirically_validated',
          efficacy_score: 95.1,
          statistically_significant: true,
          community_validation_count: 8,
          source_label: '🤖 AI-Generated (Reviewed)'
        },
        {
          id: 'demo-4',
          name: 'Context-Aware Prompting for Claude',
          description: 'Proven patterns for structuring prompts that maximize Claude\'s effectiveness in software development tasks. These patterns emerge from analysis of thousands of successful Claude Code sessions.',
          author_name: '🤖 Claude (AI Assistant)',
          tags: ['claude', 'prompting', 'ai-assistance', 'development', 'best-practices'],
          usage_count: 29,
          adoption_count: 14,
          created_at: new Date().toISOString(),
          visibility: 'public',
          content_source: 'ai_generated',
          ai_model: 'claude-3-5-sonnet-20241022',
          curation_status: 'approved',
          verification_status: 'community_tested',
          efficacy_score: 89.7,
          statistically_significant: true,
          community_validation_count: 6,
          source_label: '🤖 AI-Generated (Reviewed)'
        },
        {
          id: 'demo-5',
          name: 'Advanced Git Workflow Patterns',
          description: 'Team collaboration patterns using Git that scale from small teams to enterprise organizations. Includes branching strategies, code review processes, and automated quality gates.',
          author_name: 'Sarah Chen',
          tags: ['git', 'workflow', 'collaboration', 'devops'],
          usage_count: 33,
          adoption_count: 19,
          created_at: new Date().toISOString(),
          visibility: 'public',
          content_source: 'human',
          verification_status: 'community_tested',
          community_validation_count: 11,
          source_label: '👤 Community Contributed'
        },
        {
          id: 'demo-6',
          name: 'API Testing with Contract Validation',
          description: 'Comprehensive approach to API testing that ensures contract compliance and prevents breaking changes in microservice architectures.',
          author_name: 'Mike Rodriguez',
          tags: ['api', 'testing', 'microservices', 'contracts'],
          usage_count: 27,
          adoption_count: 13,
          created_at: new Date().toISOString(),
          visibility: 'public',
          content_source: 'human',
          verification_status: 'unverified',
          community_validation_count: 3,
          source_label: '👤 Community Contributed'
        }
      ];
      
      setFeaturedPractices(demoData);
      setStats({
        total_practices: demoData.length,
        active_contributors: new Set(demoData.map(bp => bp.author_name)).size,
        adoptions_this_month: demoData.reduce((sum, bp) => sum + (bp.adoption_count || 0), 0)
      });
      setError(null); // Clear error since we have demo data
      
    } catch (err) {
      console.error('Failed to load marketplace data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load marketplace data');
      setStats({
        total_practices: 0,
        active_contributors: 0,
        adoptions_this_month: 0
      });
      setFeaturedPractices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    router.push(`/marketplace/search?${params.toString()}`);
  };

  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 8, py: 6 }}>
        <Typography 
          variant="h2" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            color: '#111827',
            mb: 3
          }}
        >
          Best Practices{' '}
          <Box 
            component="span" 
            sx={{ 
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Marketplace
          </Box>
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#6b7280',
            mb: 6, 
            maxWidth: 700, 
            mx: 'auto',
            fontSize: '1.25rem',
            lineHeight: 1.6,
            fontWeight: 400
          }}
        >
          Discover, share, and adopt proven development practices from the community. 
          Accelerate your team's productivity with battle-tested patterns and workflows.
        </Typography>
        
        {/* Search Bar */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search practices, tags, or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button 
                    variant="contained" 
                    onClick={handleSearch}
                    sx={{ mr: -1 }}
                  >
                    Search
                  </Button>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Quick Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => router.push('/marketplace/create')}
            sx={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.2)',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                boxShadow: '0 6px 20px 0 rgba(37, 99, 235, 0.3)',
              }
            }}
          >
            Create Practice
          </Button>
          <Button 
            variant="outlined"
            onClick={() => router.push('/marketplace/search?visibility=public')}
            sx={{
              borderColor: '#d1d5db',
              color: '#4b5563',
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: '#f8fafc'
              }
            }}
          >
            Browse Public
          </Button>
          <Button 
            variant="outlined"
            onClick={() => router.push('/marketplace/search?sort=created')}
            sx={{
              borderColor: '#d1d5db',
              color: '#4b5563',
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: '#f8fafc'
              }
            }}
          >
            Latest
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<TrendingUp />}
            onClick={() => router.push('/marketplace/search?sort=adoption')}
            sx={{
              borderColor: '#d1d5db',
              color: '#4b5563',
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: '#f8fafc'
              }
            }}
          >
            Trending
          </Button>
        </Box>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
          <Button onClick={loadMarketplaceData} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Demo Data Info */}
      {!loading && !error && featuredPractices.length > 0 && featuredPractices[0]?.id?.startsWith('demo-') && (
        <Alert severity="info" sx={{ mb: 4 }}>
          🧪 Showing demo data to demonstrate the AI Attribution and Efficacy Tracking System. 
          Notice the clear labeling of AI-generated vs human content with quality indicators.
        </Alert>
      )}

      {/* Statistics Dashboard */}
      <Grid container spacing={3} sx={{ mb: 8 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 2,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
          }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography 
                variant="h3" 
                component="div" 
                sx={{ 
                  color: '#2563eb',
                  fontWeight: 700,
                  mb: 1
                }}
              >
                {loading ? <Skeleton width={60} /> : stats?.total_practices || 0}
              </Typography>
              <Typography 
                sx={{ 
                  color: '#6b7280',
                  fontSize: '1rem',
                  fontWeight: 500
                }}
              >
                Total Practices
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 2,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
          }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography 
                variant="h3" 
                component="div" 
                sx={{ 
                  color: '#2563eb',
                  fontWeight: 700,
                  mb: 1
                }}
              >
                {loading ? <Skeleton width={60} /> : stats?.active_contributors || 0}
              </Typography>
              <Typography 
                sx={{ 
                  color: '#6b7280',
                  fontSize: '1rem',
                  fontWeight: 500
                }}
              >
                Active Contributors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 2,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
          }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography 
                variant="h3" 
                component="div" 
                sx={{ 
                  color: '#2563eb',
                  fontWeight: 700,
                  mb: 1
                }}
              >
                {loading ? <Skeleton width={60} /> : stats?.adoptions_this_month || 0}
              </Typography>
              <Typography 
                sx={{ 
                  color: '#6b7280',
                  fontSize: '1rem',
                  fontWeight: 500
                }}
              >
                Total Adoptions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Featured Practices */}
      <Box sx={{ mb: 8 }}>
        <Typography 
          variant="h4" 
          component="h2" 
          gutterBottom 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 700,
            color: '#111827',
            mb: 2
          }}
        >
          <Star sx={{ color: '#f59e0b' }} />
          Featured Practices
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#6b7280', 
            mb: 4,
            fontSize: '1.1rem'
          }}
        >
          Most adopted practices from the community
        </Typography>
        
        <Grid container spacing={3}>
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" height={32} />
                    <Skeleton variant="text" height={20} />
                    <Skeleton variant="text" height={20} width="60%" />
                    <Box sx={{ mt: 2 }}>
                      <Skeleton variant="rectangular" height={24} width={80} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : featuredPractices.length > 0 ? (
            featuredPractices.map((practice) => (
              <Grid item xs={12} md={6} lg={4} key={practice.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    borderRadius: 2,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    '&:hover': { 
                      boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      borderColor: '#2563eb',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => router.push(`/marketplace/practices/${practice.id}`)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" component="h3" noWrap>
                        {practice.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {practice.visibility === 'private' && (
                          <Visibility fontSize="small" color="action" />
                        )}
                      </Box>
                    </Box>

                    {/* AI Attribution & Quality Badges */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {practice.source_label && (
                        <Chip 
                          label={practice.source_label}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20,
                            bgcolor: practice.content_source === 'human' ? '#f0f9ff' : '#fefce8',
                            borderColor: practice.content_source === 'human' ? '#0ea5e9' : '#eab308',
                            color: practice.content_source === 'human' ? '#0369a1' : '#a16207'
                          }}
                        />
                      )}
                      {practice.verification_status === 'empirically_validated' && (
                        <Chip 
                          label="✅ Proven Effective"
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20,
                            bgcolor: '#f0fdf4',
                            borderColor: '#16a34a',
                            color: '#15803d'
                          }}
                        />
                      )}
                      {practice.verification_status === 'community_tested' && (
                        <Chip 
                          label="🧪 Community Tested"
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20,
                            bgcolor: '#fefce8',
                            borderColor: '#ca8a04',
                            color: '#a16207'
                          }}
                        />
                      )}
                      {practice.efficacy_score && practice.efficacy_score > 75 && (
                        <Chip 
                          label={`${Math.round(practice.efficacy_score)}% Effective`}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20,
                            bgcolor: '#f0f9ff',
                            borderColor: '#0ea5e9',
                            color: '#0369a1'
                          }}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      By {practice.author_name}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {practice.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {practice.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                      {practice.tags.length > 3 && (
                        <Chip label={`+${practice.tags.length - 3}`} size="small" variant="outlined" />
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(practice.created_at)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {practice.adoption_count || 0} adoptions
                      </Typography>
                    </Box>
                  </CardContent>
                  
                  <CardActions>
                    <Button size="small" fullWidth>
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No practices available yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Be the first to share a best practice with the community!
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<Add />}
                    onClick={() => router.push('/marketplace/create')}
                  >
                    Create First Practice
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Browse by Category */}
      <Box sx={{ mb: 8 }}>
        <Typography 
          variant="h4" 
          component="h2" 
          gutterBottom
          sx={{
            fontWeight: 700,
            color: '#111827',
            mb: 2
          }}
        >
          Browse by Category
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#6b7280', 
            mb: 4,
            fontSize: '1.1rem'
          }}
        >
          Find practices organized by technology and domain
        </Typography>
        
        <Grid container spacing={2}>
          {[
            { label: 'JavaScript', count: '23 practices' },
            { label: 'React', count: '18 practices' },
            { label: 'Node.js', count: '15 practices' },
            { label: 'TypeScript', count: '12 practices' },
            { label: 'Testing', count: '11 practices' },
            { label: 'API Design', count: '9 practices' },
            { label: 'Database', count: '8 practices' },
            { label: 'Security', count: '7 practices' }
          ].map((category) => (
            <Grid item xs={6} sm={4} md={3} key={category.label}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 2 }
                }}
                onClick={() => router.push(`/marketplace/search?tags=${category.label.toLowerCase()}`)}
              >
                <CardContent>
                  <Typography variant="h6" component="h3">
                    {category.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {category.count}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}