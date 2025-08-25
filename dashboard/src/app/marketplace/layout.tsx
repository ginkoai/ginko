import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { Store, Dashboard, Add, AutoAwesome } from '@mui/icons-material';
import Link from 'next/link';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Marketplace Navigation */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Ginko AI Logo */}
              <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesome sx={{ color: '#2563eb', fontSize: 28 }} />
                  <Typography 
                    variant="h5" 
                    component="div" 
                    sx={{ 
                      fontWeight: 700,
                      color: '#111827'
                    }}
                  >
                    Ginko
                    <Box 
                      component="span" 
                      sx={{ 
                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 700
                      }}
                    >
                      AI
                    </Box>
                  </Typography>
                </Box>
              </Link>

              {/* Marketplace Navigation */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                <Store sx={{ color: '#6b7280', fontSize: 20 }} />
                <Typography variant="body1" sx={{ color: '#6b7280', fontWeight: 500, mr: 2 }}>
                  Best Practices
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  component={Link}
                  href="/marketplace"
                  color="inherit"
                  sx={{ 
                    textTransform: 'none',
                    color: '#4b5563',
                    fontWeight: 500,
                    '&:hover': { bgcolor: '#f3f4f6' }
                  }}
                >
                  Browse
                </Button>
                <Button
                  component={Link}
                  href="/marketplace/search"
                  color="inherit"
                  sx={{ 
                    textTransform: 'none',
                    color: '#4b5563',
                    fontWeight: 500,
                    '&:hover': { bgcolor: '#f3f4f6' }
                  }}
                >
                  Search
                </Button>
                <Button
                  component={Link}
                  href="/marketplace/my-practices"
                  color="inherit"
                  sx={{ 
                    textTransform: 'none',
                    color: '#4b5563',
                    fontWeight: 500,
                    '&:hover': { bgcolor: '#f3f4f6' }
                  }}
                >
                  My Practices
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                component={Link}
                href="/dashboard"
                startIcon={<Dashboard />}
                color="inherit"
                sx={{ 
                  textTransform: 'none',
                  color: '#4b5563',
                  fontWeight: 500,
                  '&:hover': { bgcolor: '#f3f4f6' }
                }}
              >
                Dashboard
              </Button>
              <Button
                component={Link}
                href="/marketplace/create"
                variant="contained"
                startIcon={<Add />}
                sx={{ 
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.2)',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                    boxShadow: '0 6px 20px 0 rgba(37, 99, 235, 0.3)',
                  }
                }}
              >
                Create Practice
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Main Content */}
      <Box component="main" sx={{ bgcolor: '#fafbfc' }}>
        {children}
      </Box>
    </Box>
  );
}