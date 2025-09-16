import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Grid,
  FormControl,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import Header from '../components/Header';
import { useNavigate, useLocation } from 'react-router-dom';
import StorageIcon from '@mui/icons-material/Storage';
import { dataSourceConfigs } from '../data/dataSourceConfigs';

const steps = [
  { number: 1, label: 'Data Sources' },
  { number: 2, label: 'Filters' },
  { number: 3, label: 'Analysis' }
];

function FiltersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dataSource } = location.state || {};

  // Get filters for selected data source
  const availableFilters = dataSource ? dataSourceConfigs[dataSource.id]?.availableFilters || [] : [];

  // Determine which filter to highlight based on data source
  const getHighlightedFilter = () => {
    if (!dataSource) return 'WEEK_END_DATE';
    switch(dataSource.id) {
      case 'weekly-pipeline':
        return 'CREATEDON';
      case 'pipeline-history':
        return 'SNAPSHOT_DATE';
      default:
        return 'WEEK_END_DATE';
    }
  };

  const [selectedFilter, setSelectedFilter] = useState(getHighlightedFilter());
  const [selectedFilters, setSelectedFilters] = useState({
    fromMonth: 'January',
    fromWeek: 'Week 1',
    fromYear: '2025',
    toMonth: 'September',
    toWeek: 'Week 2',
    toYear: '2025'
  });

  const [applyFilter, setApplyFilter] = useState(true);

  const handleReset = () => {
    setSelectedFilters({
      fromMonth: 'January',
      fromWeek: 'Week 1',
      fromYear: '2025',
      toMonth: 'September',
      toWeek: 'Week 2',
      toYear: '2025'
    });
  };

  const handleContinue = () => {
    navigate('/conversation', { 
      state: { 
        dataSource,
        filters: selectedFilters 
      } 
    });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const years = ['2023', '2024', '2025'];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Progress Stepper */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: step.number <= 2 ? '#187955' : '#e0e0e0',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      mb: 1
                    }}
                  >
                    {step.number}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ 
                      color: step.number <= 2 ? '#187955' : '#757575',
                      fontWeight: step.number === 2 ? 600 : 400
                    }}
                  >
                    {step.label}
                  </Typography>
                </Box>
                {index < steps.length - 1 && (
                  <Box
                    sx={{
                      width: 100,
                      height: 2,
                      bgcolor: step.number < 2 ? '#187955' : '#e0e0e0',
                      mx: 2,
                      mb: 4
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </Box>
        </Box>

        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 500, textAlign: 'center' }}>
            Filter Your Data
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}
          >
            Select filters to reduce your dataset for optimal analysis performance.
          </Typography>

          {/* Selected Data Source Chip */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Chip
              icon={<StorageIcon />}
              label={dataSource?.title || 'No Data Source'}
              color="primary"
              variant="outlined"
            />
          </Box>

          <Grid container spacing={4}>
            {/* Available Filters */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Available Filters
                </Typography>
                <List>
                  {availableFilters.map((filter) => (
                    <ListItem
                      key={filter}
                      button
                      onClick={() => setSelectedFilter(filter)}
                      sx={{
                        py: 1,
                        px: 2,
                        mb: 1,
                        bgcolor: filter === selectedFilter ? '#e8f5e9' : 'transparent',
                        border: filter === selectedFilter ? '1px solid #187955' : 'none',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: filter === selectedFilter ? '#e8f5e9' : '#f5f5f5'
                        }
                      }}
                    >
                      <ListItemText 
                        primary={filter}
                        primaryTypographyProps={{
                          sx: { 
                            fontSize: '0.95rem',
                            fontWeight: filter === selectedFilter ? 500 : 400
                          }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* Date Range Filter */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 600 }}>
                  {selectedFilter}
                </Typography>

                {/* Show different controls based on filter type */}
                {(selectedFilter === 'WEEK_END_DATE' || selectedFilter === 'CREATEDON' || 
                  selectedFilter === 'MODIFIEDON' || selectedFilter === 'OUTCOME_DATE' || 
                  selectedFilter === 'LAST_SIGNIFICANT_UPDATE_DATE' || selectedFilter === 'SNAPSHOT_DATE') ? (
                  <>
                    {/* From Date */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        From
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={selectedFilters.fromMonth}
                              onChange={(e) => setSelectedFilters({...selectedFilters, fromMonth: e.target.value})}
                            >
                              {months.map(month => (
                                <MenuItem key={month} value={month}>{month}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={selectedFilters.fromWeek}
                              onChange={(e) => setSelectedFilters({...selectedFilters, fromWeek: e.target.value})}
                            >
                              {weeks.map(week => (
                                <MenuItem key={week} value={week}>{week}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={selectedFilters.fromYear}
                              onChange={(e) => setSelectedFilters({...selectedFilters, fromYear: e.target.value})}
                            >
                              {years.map(year => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* To Date */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        To
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={selectedFilters.toMonth}
                              onChange={(e) => setSelectedFilters({...selectedFilters, toMonth: e.target.value})}
                            >
                              {months.map(month => (
                                <MenuItem key={month} value={month}>{month}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={selectedFilters.toWeek}
                              onChange={(e) => setSelectedFilters({...selectedFilters, toWeek: e.target.value})}
                            >
                              {weeks.map(week => (
                                <MenuItem key={week} value={week}>{week}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={selectedFilters.toYear}
                              onChange={(e) => setSelectedFilters({...selectedFilters, toYear: e.target.value})}
                            >
                              {years.map(year => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>
                  </>
                ) : (
                  /* For other filter types, show appropriate controls */
                  <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography>
                      Select values for {selectedFilter}
                    </Typography>
                    {/* You can add specific controls for REGION, SYSTEM, IPA, etc. here */}
                  </Box>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleReset}
                    sx={{ px: 3 }}
                  >
                    Reset last 12 months
                  </Button>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={applyFilter}
                      onChange={(e) => setApplyFilter(e.target.checked)}
                    />
                    <Typography variant="body2">Apply Filter</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              2025 BCG Product By BI&A
            </Typography>
          </Box>
        </Paper>

        {/* Continue Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleContinue}
            sx={{
              bgcolor: '#187955',
              px: 4,
              '&:hover': {
                bgcolor: '#0e5f3f'
              }
            }}
          >
            CONTINUE TO ANALYSIS
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default FiltersPage;