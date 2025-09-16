import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Grid,
  Card,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Chip
} from '@mui/material';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { dataSourceConfigs } from '../data/dataSourceConfigs';

// Get data sources from config
const dataSources = Object.values(dataSourceConfigs);

function HomePageDemo() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState(null);
  const [showDataFields, setShowDataFields] = useState(false);

  const handleDataSourceSelect = (source) => {
    setSelectedDataSource(source);
    setShowDataFields(true);
  };

  const handleContinue = () => {
    // Navigate to filters page
    navigate('/filters', { state: { dataSource: selectedDataSource } });
  };

  // Get fields for selected data source
  const getDataFields = () => {
    if (!selectedDataSource) return null;
    return dataSourceConfigs[selectedDataSource.id];
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Left Panel - Data Source Selection */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Choose Data Source
              </Typography>
              
              {/* Search Bar */}
              <TextField
                fullWidth
                placeholder="What are you trying to analyze/search?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Data sources available chip */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <StorageIcon sx={{ mr: 1, color: '#1976d2' }} />
                <Typography sx={{ color: '#1976d2' }}>
                  Data sources available
                </Typography>
              </Box>

              {/* Search data sources */}
              <TextField
                fullWidth
                placeholder="Search data sources..."
                size="small"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Data Sources List */}
              <List sx={{ bgcolor: 'background.paper' }}>
                {dataSources.map((source) => (
                  <React.Fragment key={source.id}>
                    <ListItem
                      button
                      selected={selectedDataSource?.id === source.id}
                      onClick={() => handleDataSourceSelect(source)}
                      sx={{
                        border: selectedDataSource?.id === source.id ? '2px solid #187955' : 'none',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': {
                          bgcolor: 'rgba(24, 121, 85, 0.04)'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <StorageIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={source.title}
                        secondary={source.description}
                        secondaryTypographyProps={{
                          sx: { fontSize: '0.875rem', color: 'text.secondary' }
                        }}
                      />
                      {selectedDataSource?.id === source.id && (
                        <CheckCircleIcon sx={{ color: '#187955', ml: 1 }} />
                      )}
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Right Panel - Data Fields */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  Data Fields
                </Typography>
                {selectedDataSource && (
                  <Chip
                    label={selectedDataSource.title}
                    icon={<StorageIcon />}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>

              {!showDataFields ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: 400,
                  color: 'text.secondary'
                }}>
                  <StorageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                  <Typography>Select a data source to see available fields</Typography>
                </Box>
              ) : (
                <Box>
                  {(() => {
                    const fields = getDataFields();
                    if (!fields) return null;
                    
                    return (
                      <>
                        {/* Key Metrics */}
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              Key Metrics
                            </Typography>
                            <Chip
                              label={fields.keyMetrics.length}
                              size="small"
                              color="primary"
                              sx={{ ml: 2, height: 20 }}
                            />
                          </Box>
                          <Grid container spacing={2}>
                            {fields.keyMetrics.map((metric, index) => (
                              <Grid item xs={12} sm={6} key={index}>
                                <Card variant="outlined" sx={{ p: 2 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {metric.name}
                                  </Typography>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        {/* Dimensions */}
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              Dimensions
                            </Typography>
                            <Chip
                              label={fields.dimensions.length}
                              size="small"
                              color="primary"
                              sx={{ ml: 2, height: 20 }}
                            />
                          </Box>
                          <Grid container spacing={2}>
                            {fields.dimensions.map((dimension, index) => (
                              <Grid item xs={12} sm={6} key={index}>
                                <Card variant="outlined" sx={{ p: 2 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {dimension.name}
                                  </Typography>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        {/* Suggested Questions */}
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              Suggested Questions
                            </Typography>
                            <Chip
                              label={fields.suggestedQuestions.length}
                              size="small"
                              color="primary"
                              sx={{ ml: 2, height: 20 }}
                            />
                          </Box>
                          <Box>
                            {fields.suggestedQuestions.map((question, index) => (
                              <Card 
                                key={index} 
                                variant="outlined" 
                                sx={{ 
                                  p: 2, 
                                  mb: 1, 
                                  cursor: 'pointer',
                                  '&:hover': {
                                    bgcolor: 'rgba(24, 121, 85, 0.04)',
                                    borderColor: '#187955'
                                  }
                                }}
                                onClick={() => setSearchQuery(question)}
                              >
                                <Typography variant="body2">
                                  {question}
                                </Typography>
                              </Card>
                            ))}
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Continue Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            disabled={!selectedDataSource}
            onClick={handleContinue}
            sx={{
              bgcolor: '#187955',
              px: 4,
              '&:hover': {
                bgcolor: '#0e5f3f'
              }
            }}
          >
            CONTINUE
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default HomePageDemo;