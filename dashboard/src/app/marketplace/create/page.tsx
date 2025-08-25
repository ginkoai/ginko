/**
 * @fileType: page
 * @status: current
 * @updated: 2025-08-14
 * @tags: [marketplace, create, best-practices, form, user-generated]
 * @related: [page.tsx, my-practices/page.tsx, api/mcp/best-practices]
 * @priority: medium
 * @complexity: high
 * @dependencies: [react, next/navigation, mui/material]
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Alert,
  Divider,
  Paper,
  Grid,
  Breadcrumbs,
  Link
} from '@mui/material';
import { Save, Preview, Code } from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CreatePracticeForm {
  name: string;
  description: string;
  syntax: string;
  visibility: 'public' | 'private';
  tags: string[];
}

const availableTags = [
  'javascript', 'typescript', 'react', 'nodejs', 'python',
  'api', 'database', 'testing', 'security', 'performance',
  'css', 'html', 'git', 'docker', 'aws', 'nextjs',
  'authentication', 'validation', 'error-handling', 'logging'
];

export default function CreatePracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  const [form, setForm] = useState<CreatePracticeForm>({
    name: '',
    description: '',
    syntax: '',
    visibility: 'private',
    tags: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Practice name is required';
    } else if (form.name.length > 100) {
      newErrors.name = 'Practice name must be 100 characters or less';
    }
    
    if (!form.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (form.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }
    
    if (form.tags.length === 0) {
      newErrors.tags = 'At least one tag is required';
    } else if (form.tags.length > 10) {
      newErrors.tags = 'Maximum 10 tags allowed';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Get actual user info from auth context
      const practiceData = {
        ...form,
        author_id: 'temp-user-id', // This would come from auth
        author_name: 'Current User', // This would come from auth
        author_avatar: null,
        author_github_url: null,
        organization_id: null
      };
      
      const response = await fetch('/api/mcp/best-practices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(practiceData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create practice');
      }
      
      const result = await response.json();
      
      // Redirect to the new practice
      router.push(`/marketplace/practices/${result.best_practice.id}`);
      
    } catch (err) {
      console.error('Failed to create practice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create practice');
    } finally {
      setLoading(false);
    }
  };

  const handleTagChange = (event: any) => {
    const value = event.target.value;
    setForm({ ...form, tags: typeof value === 'string' ? value.split(',') : value });
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
          Create Practice
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Create Best Practice
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Share your knowledge with the development community
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Form */}
        <Grid item xs={12} md={previewMode ? 6 : 12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Practice Details</Typography>
                <Button
                  startIcon={<Preview />}
                  onClick={() => setPreviewMode(!previewMode)}
                  variant={previewMode ? 'contained' : 'outlined'}
                >
                  {previewMode ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Practice Name"
                  required
                  fullWidth
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  error={!!errors.name}
                  helperText={errors.name || `${form.name.length}/100 characters`}
                  inputProps={{ maxLength: 100 }}
                />

                <TextField
                  label="Description"
                  required
                  fullWidth
                  multiline
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  error={!!errors.description}
                  helperText={errors.description || `${form.description.length} characters (minimum 50)`}
                />

                <TextField
                  label="Code Example (Optional)"
                  fullWidth
                  multiline
                  rows={8}
                  value={form.syntax}
                  onChange={(e) => setForm({ ...form, syntax: e.target.value })}
                  placeholder="// Add code examples to help explain your practice&#10;function example() {&#10;  return 'Hello World';&#10;}"
                  sx={{ fontFamily: 'monospace' }}
                />

                <FormControl fullWidth required error={!!errors.tags}>
                  <InputLabel>Tags</InputLabel>
                  <Select
                    multiple
                    value={form.tags}
                    onChange={handleTagChange}
                    input={<OutlinedInput label="Tags" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {availableTags.map((tag) => (
                      <MenuItem key={tag} value={tag}>
                        {tag}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.tags && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                      {errors.tags}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Visibility</InputLabel>
                  <Select
                    value={form.visibility}
                    label="Visibility"
                    onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}
                  >
                    <MenuItem value="private">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Private
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Only visible to you and your team
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="public">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Public
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Visible to everyone in the marketplace
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/marketplace')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Practice'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview */}
        {previewMode && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preview
                </Typography>
                
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Typography variant="h5" gutterBottom>
                    {form.name || 'Practice Name'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    By Current User
                  </Typography>
                  
                  <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                    {form.description || 'Practice description will appear here...'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {form.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                  
                  {form.syntax && (
                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Code fontSize="small" />
                        <Typography variant="subtitle2">
                          Code Example ({detectLanguage(form.syntax)})
                        </Typography>
                      </Box>
                      <Paper sx={{ overflow: 'hidden' }}>
                        <SyntaxHighlighter
                          language={detectLanguage(form.syntax)}
                          style={tomorrow}
                          customStyle={{
                            margin: 0,
                            fontSize: '12px',
                            lineHeight: '1.4'
                          }}
                        >
                          {form.syntax}
                        </SyntaxHighlighter>
                      </Paper>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}