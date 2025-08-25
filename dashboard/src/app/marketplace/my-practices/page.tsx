'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Skeleton,
  Grid,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Analytics,
  Star
} from '@mui/icons-material';

interface BestPractice {
  id: string;
  name: string;
  description: string;
  visibility: 'public' | 'private';
  tags: string[];
  usage_count: number;
  adoption_count: number;
  created_at: string;
  updated_at: string;
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
      id={`practices-tabpanel-${index}`}
      aria-labelledby={`practices-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MyPracticesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [createdPractices, setCreatedPractices] = useState<BestPractice[]>([]);
  const [adoptedPractices, setAdoptedPractices] = useState<BestPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPractice, setSelectedPractice] = useState<BestPractice | null>(null);
  
  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [practiceToDelete, setPracticeToDelete] = useState<BestPractice | null>(null);

  useEffect(() => {
    loadMyPractices();
  }, []);

  const loadMyPractices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Get actual user ID from auth context
      const userId = 'temp-user-id';
      
      // Load created practices
      const createdResponse = await fetch(`/api/mcp/best-practices?author=${userId}`);
      if (createdResponse.ok) {
        const createdData = await createdResponse.json();
        setCreatedPractices(createdData.best_practices || []);
      }
      
      // TODO: Load adopted practices (would need a new API endpoint)
      // For now, using mock data
      setAdoptedPractices([]);
      
    } catch (err) {
      console.error('Failed to load practices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load practices');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, practice: BestPractice) => {
    setAnchorEl(event.currentTarget);
    setSelectedPractice(practice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPractice(null);
  };

  const handleEdit = () => {
    if (selectedPractice) {
      router.push(`/marketplace/practices/${selectedPractice.id}/edit`);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedPractice) {
      setPracticeToDelete(selectedPractice);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!practiceToDelete) return;
    
    try {
      const response = await fetch(`/api/mcp/best-practices/${practiceToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete practice');
      }
      
      // Remove from local state
      setCreatedPractices(prev => prev.filter(p => p.id !== practiceToDelete.id));
      
    } catch (err) {
      console.error('Failed to delete practice:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete practice');
    } finally {
      setDeleteDialogOpen(false);
      setPracticeToDelete(null);
    }
  };

  const toggleVisibility = async (practice: BestPractice) => {
    try {
      const newVisibility = practice.visibility === 'public' ? 'private' : 'public';
      
      const response = await fetch(`/api/mcp/best-practices/${practice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visibility: newVisibility })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update visibility');
      }
      
      // Update local state
      setCreatedPractices(prev => 
        prev.map(p => 
          p.id === practice.id 
            ? { ...p, visibility: newVisibility }
            : p
        )
      );
      
    } catch (err) {
      console.error('Failed to update visibility:', err);
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const PracticeCard = ({ practice, showAdoptionInfo = false }: { practice: BestPractice, showAdoptionInfo?: boolean }) => (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        cursor: 'pointer',
        '&:hover': { boxShadow: 4 }
      }}
    >
      <CardContent 
        sx={{ flexGrow: 1 }}
        onClick={() => router.push(`/marketplace/practices/${practice.id}`)}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="h3" noWrap>
            {practice.name}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuOpen(e, practice);
            }}
          >
            <MoreVert />
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {practice.visibility === 'public' ? (
            <Visibility fontSize="small" color="primary" />
          ) : (
            <VisibilityOff fontSize="small" color="action" />
          )}
          <Typography variant="body2" color="text.secondary">
            {practice.visibility}
          </Typography>
        </Box>
        
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Star fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {practice.adoption_count || 0}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {practice.usage_count || 0} views
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
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            My Practices
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your created and adopted best practices
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => router.push('/marketplace/create')}
        >
          Create Practice
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`Created (${createdPractices.length})`} />
          <Tab label={`Adopted (${adoptedPractices.length})`} />
        </Tabs>
      </Box>

      {/* View Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={viewMode === 'list'}
              onChange={(e) => setViewMode(e.target.checked ? 'list' : 'grid')}
            />
          }
          label="List View"
        />
      </Box>

      {/* Created Practices Tab */}
      <TabPanel value={activeTab} index={0}>
        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" height={32} />
                    <Skeleton variant="text" height={20} />
                    <Skeleton variant="text" height={20} width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : createdPractices.length > 0 ? (
          <Grid container spacing={3}>
            {createdPractices.map((practice) => (
              <Grid item xs={12} md={viewMode === 'list' ? 12 : 6} lg={viewMode === 'list' ? 12 : 4} key={practice.id}>
                <PracticeCard practice={practice} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No practices created yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Share your knowledge by creating your first best practice.
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
        )}
      </TabPanel>

      {/* Adopted Practices Tab */}
      <TabPanel value={activeTab} index={1}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No adopted practices yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Browse the marketplace to find and adopt practices for your projects.
            </Typography>
            <Button 
              variant="contained"
              onClick={() => router.push('/marketplace')}
            >
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => selectedPractice && toggleVisibility(selectedPractice)}>
          {selectedPractice?.visibility === 'public' ? (
            <VisibilityOff fontSize="small" sx={{ mr: 1 }} />
          ) : (
            <Visibility fontSize="small" sx={{ mr: 1 }} />
          )}
          Make {selectedPractice?.visibility === 'public' ? 'Private' : 'Public'}
        </MenuItem>
        <MenuItem onClick={() => console.log('View analytics')}>
          <Analytics fontSize="small" sx={{ mr: 1 }} />
          View Analytics
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Practice</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{practiceToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}