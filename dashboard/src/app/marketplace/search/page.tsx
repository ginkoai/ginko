'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Pagination,
  InputAdornment,
  Skeleton,
  Alert,
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Search, FilterList, Clear, Visibility, Star } from '@mui/icons-material';

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
  updated_at: string;
  visibility: 'public' | 'private';
}

interface SearchFilters {
  q: string;
  tags: string[];
  visibility: 'all' | 'public' | 'private';
  sort: 'created' | 'updated' | 'usage' | 'adoption' | 'name';
  order: 'asc' | 'desc';
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [practices, setPractices] = useState<BestPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const itemsPerPage = 20;
  
  const [filters, setFilters] = useState<SearchFilters>({
    q: searchParams.get('q') || '',
    tags: searchParams.getAll('tags'),
    visibility: (searchParams.get('visibility') as any) || 'all',
    sort: (searchParams.get('sort') as any) || 'created',
    order: (searchParams.get('order') as any) || 'desc'
  });

  const availableTags = [
    'javascript', 'typescript', 'react', 'nodejs', 'python',
    'api', 'database', 'testing', 'security', 'performance',
    'css', 'html', 'git', 'docker', 'aws'
  ];

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    loadSearchResults(page);
  }, [searchParams]);

  const loadSearchResults = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.tags.length > 0) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
      if (filters.visibility !== 'all') params.set('visibility', filters.visibility);
      params.set('sort', filters.sort);
      params.set('order', filters.order);
      params.set('limit', itemsPerPage.toString());
      params.set('offset', ((page - 1) * itemsPerPage).toString());

      const response = await fetch(`/api/mcp/best-practices?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load search results');
      }

      const data = await response.json();
      setPractices(data.best_practices || []);
      setTotalCount(data.pagination?.total || 0);
      
    } catch (err) {
      console.error('Failed to load search results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load search results');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    const params = new URLSearchParams();
    if (updatedFilters.q) params.set('q', updatedFilters.q);
    if (updatedFilters.tags.length > 0) {
      updatedFilters.tags.forEach(tag => params.append('tags', tag));
    }
    if (updatedFilters.visibility !== 'all') params.set('visibility', updatedFilters.visibility);
    params.set('sort', updatedFilters.sort);
    params.set('order', updatedFilters.order);
    params.set('page', '1');
    
    router.push(`/marketplace/search?${params.toString()}`);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/marketplace/search?${params.toString()}`);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    handleFilterChange({ tags: newTags });
  };

  const clearFilters = () => {
    handleFilterChange({
      q: '',
      tags: [],
      visibility: 'all',
      sort: 'created',
      order: 'desc'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const FilterContent = () => (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Filters</Typography>
        <Button startIcon={<Clear />} onClick={clearFilters} size="small">
          Clear All
        </Button>
      </Box>

      {/* Visibility Filter */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Visibility</InputLabel>
        <Select
          value={filters.visibility}
          label="Visibility"
          onChange={(e) => handleFilterChange({ visibility: e.target.value as any })}
        >
          <MenuItem value="all">All Practices</MenuItem>
          <MenuItem value="public">Public Only</MenuItem>
          <MenuItem value="private">Private Only</MenuItem>
        </Select>
      </FormControl>

      {/* Sort Options */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Sort By</InputLabel>
        <Select
          value={filters.sort}
          label="Sort By"
          onChange={(e) => handleFilterChange({ sort: e.target.value as any })}
        >
          <MenuItem value="created">Date Created</MenuItem>
          <MenuItem value="updated">Last Updated</MenuItem>
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="adoption">Most Adopted</MenuItem>
          <MenuItem value="usage">Most Used</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Order</InputLabel>
        <Select
          value={filters.order}
          label="Order"
          onChange={(e) => handleFilterChange({ order: e.target.value as any })}
        >
          <MenuItem value="desc">Descending</MenuItem>
          <MenuItem value="asc">Ascending</MenuItem>
        </Select>
      </FormControl>

      {/* Tag Filters */}
      <Typography variant="subtitle1" sx={{ mb: 2 }}>Tags</Typography>
      <FormGroup>
        {availableTags.map((tag) => (
          <FormControlLabel
            key={tag}
            control={
              <Checkbox
                checked={filters.tags.includes(tag)}
                onChange={() => handleTagToggle(tag)}
              />
            }
            label={tag}
          />
        ))}
      </FormGroup>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Search Best Practices
        </Typography>
        
        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search practices, tags, or authors..."
            value={filters.q}
            onChange={(e) => handleFilterChange({ q: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && loadSearchResults(1)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
          {isMobile && (
            <IconButton
              onClick={() => setDrawerOpen(true)}
              color="primary"
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <FilterList />
            </IconButton>
          )}
        </Box>

        {/* Results Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography color="text.secondary">
            {loading ? 'Loading...' : `${totalCount} practices found`}
          </Typography>
          {!isMobile && (
            <Button
              startIcon={<FilterList />}
              variant="outlined"
              size="small"
              onClick={() => setDrawerOpen(true)}
            >
              Filters
            </Button>
          )}
        </Box>

        {/* Active Filters */}
        {(filters.tags.length > 0 || filters.visibility !== 'all' || filters.q) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {filters.q && (
              <Chip
                label={`Search: "${filters.q}"`}
                onDelete={() => handleFilterChange({ q: '' })}
                variant="outlined"
              />
            )}
            {filters.visibility !== 'all' && (
              <Chip
                label={`Visibility: ${filters.visibility}`}
                onDelete={() => handleFilterChange({ visibility: 'all' })}
                variant="outlined"
              />
            )}
            {filters.tags.map((tag) => (
              <Chip
                key={tag}
                label={`Tag: ${tag}`}
                onDelete={() => handleTagToggle(tag)}
                variant="outlined"
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
          <Button onClick={() => loadSearchResults(currentPage)} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Results Grid */}
      <Grid container spacing={3}>
        {loading ? (
          Array.from({ length: itemsPerPage }).map((_, index) => (
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
        ) : practices.length > 0 ? (
          practices.map((practice) => (
            <Grid item xs={12} md={6} lg={4} key={practice.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 }
                }}
                onClick={() => router.push(`/marketplace/practices/${practice.id}`)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" component="h3" noWrap>
                      {practice.name}
                    </Typography>
                    {practice.visibility === 'private' && (
                      <Visibility fontSize="small" color="action" />
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Star fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {practice.adoption_count || 0}
                      </Typography>
                    </Box>
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
                  No practices found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Try adjusting your search criteria or browse all practices.
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: isMobile ? '100%' : 350,
            maxWidth: '100%'
          }
        }}
      >
        <FilterContent />
      </Drawer>
    </Container>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}