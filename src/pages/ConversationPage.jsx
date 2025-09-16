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
  Chip,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  LinearProgress,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import Header from '../components/Header';
import { useNavigate, useLocation } from 'react-router-dom';
import SendIcon from '@mui/icons-material/Send';
import StorageIcon from '@mui/icons-material/Storage';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dataSourceConfigs, generateMockData } from '../data/dataSourceConfigs';

const suggestedQuestions = [
  'Show me revenue by IPA vs last year',
  'What are the top 5 clients in each IPA?',
  'Compare subsystem revenue trends week over week.'
];

// Mock analysis results data
const mockResultsData = [
  { IPA: 'IG', CS_GEO: 'CS', CLIENT_NCC: 2456789012.345, LY_CLIENT_NCC: 2123456789.012 },
  { IPA: 'CP', CS_GEO: 'CS', CLIENT_NCC: 1987654321.098, LY_CLIENT_NCC: 2234567890.123 },
  { IPA: 'HC', CS_GEO: 'CS', CLIENT_NCC: 1876543210.987, LY_CLIENT_NCC: 1654321098.765 },
  { IPA: 'FP', CS_GEO: 'CS', CLIENT_NCC: 1567890123.456, LY_CLIENT_NCC: 1432109876.543 },
  { IPA: 'MM', CS_GEO: 'CS', CLIENT_NCC: 1345678901.234, LY_CLIENT_NCC: 1298765432.109 },
  { IPA: 'RP', CS_GEO: 'CS', CLIENT_NCC: 1234567890.123, LY_CLIENT_NCC: 1123456789.012 },
  { IPA: 'TC', CS_GEO: 'EU', CLIENT_NCC: 987654321.098, LY_CLIENT_NCC: 876543210.987 },
  { IPA: 'LP', CS_GEO: 'EU', CLIENT_NCC: 765432109.876, LY_CLIENT_NCC: 698765432.109 },
  { IPA: 'SP', CS_GEO: 'EU', CLIENT_NCC: 543210987.654, LY_CLIENT_NCC: 498765432.109 },
];

// Mock chart data
const mockChartData = [
  { name: 'IG-CS', thisYear: 2456789012, lastYear: 2123456789 },
  { name: 'CP-CS', thisYear: 1987654321, lastYear: 2234567890 },
  { name: 'HC-CS', thisYear: 1876543210, lastYear: 1654321098 },
  { name: 'FP-CS', thisYear: 1567890123, lastYear: 1432109876 },
  { name: 'MM-CS', thisYear: 1345678901, lastYear: 1298765432 },
  { name: 'RP-CS', thisYear: 1234567890, lastYear: 1123456789 },
  { name: 'TC-EU', thisYear: 987654321, lastYear: 876543210 },
  { name: 'LP-EU', thisYear: 765432109, lastYear: 698765432 },
  { name: 'SP-EU', thisYear: 543210987, lastYear: 498765432 },
];

function ConversationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dataSource, filters } = location.state || {};

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [chartType, setChartType] = useState('Bar Chart');
  const [dataPreviewExpanded, setDataPreviewExpanded] = useState(false);

  // Get mock data and config for selected data source
  const getMockData = () => {
    if (!dataSource) return mockResultsData; // fallback to default
    return generateMockData(dataSource.id);
  };

  const getResultColumns = () => {
    if (!dataSource) {
      return [
        { field: 'IPA', label: 'IPA' },
        { field: 'CS_GEO', label: 'CS_GEO' },
        { field: 'CLIENT_NCC', label: 'CLIENT_NCC', type: 'currency' },
        { field: 'LY_CLIENT_NCC', label: 'LY_CLIENT_NCC', type: 'currency' }
      ];
    }
    return dataSourceConfigs[dataSource.id]?.resultColumns || [];
  };

  const getSuggestedQuestions = () => {
    if (!dataSource) return suggestedQuestions;
    return dataSourceConfigs[dataSource.id]?.suggestedQuestions || suggestedQuestions;
  };

  const handleSendMessage = (message) => {
    const messageToSend = message || inputMessage;
    if (!messageToSend.trim()) return;

    // Add user message
    setMessages([...messages, { type: 'user', text: messageToSend }]);
    setInputMessage('');
    
    // Show analyzing state
    setIsAnalyzing(true);
    
    // Simulate AI response after delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        text: 'Here are the analysis results:',
        hasResults: true 
      }]);
    }, 3000);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDownloadCSV = () => {
    // Mock CSV download
    const csvContent = "IPA,CS_GEO,CLIENT_NCC,LY_CLIENT_NCC\n" +
      mockResultsData.map(row => `${row.IPA},${row.CS_GEO},${row.CLIENT_NCC},${row.LY_CLIENT_NCC}`).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revenue_analysis.csv';
    a.click();
  };

  const handleDownloadPowerPoint = () => {
    // Mock PowerPoint download
    alert('PowerPoint download would be triggered here');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Data Source Chip */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Chip
            icon={<StorageIcon />}
            label={dataSource?.title || 'Client Revenue'}
            color="primary"
            variant="outlined"
          />
          
          {/* Data Preview Toggle */}
          <Button
            startIcon={dataPreviewExpanded ? <ExpandLessIcon /> : <ExpandLessIcon />}
            onClick={() => setDataPreviewExpanded(!dataPreviewExpanded)}
            sx={{ ml: 2 }}
          >
            📊 Data Preview ▶
          </Button>
        </Box>

        {/* Main Chat Container */}
        <Paper 
          sx={{ 
            p: 3, 
            bgcolor: '#187955',
            position: 'relative'
          }}
        >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2
          }}>
            <Typography variant="h6" sx={{ color: 'white' }}>
              New Conversation
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'white', opacity: 0.8 }}>
                0 messages
              </Typography>
              <IconButton size="small" sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Chat Content Area */}
          <Box 
            sx={{ 
              bgcolor: 'white',
              borderRadius: 2,
              p: 3,
              minHeight: messages.length > 0 ? 'auto' : 400,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {messages.length === 0 && !isAnalyzing ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                  Start a new conversation by asking a question about your data.
                </Typography>
                
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  💡 Suggested Questions:
                </Typography>
                
                <Grid container spacing={2} sx={{ maxWidth: 800, mx: 'auto' }}>
                  {getSuggestedQuestions().map((question, index) => (
                    <Grid item xs={12} key={index}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          textAlign: 'left',
                          '&:hover': {
                            bgcolor: 'rgba(24, 121, 85, 0.04)',
                            borderColor: '#187955'
                          }
                        }}
                        onClick={() => handleSendMessage(question)}
                      >
                        <Typography variant="body2">
                          {index + 1}. {question}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1 }}>
                {/* Messages */}
                {messages.map((message, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    {message.type === 'user' ? (
                      <Paper 
                        sx={{ 
                          p: 2, 
                          bgcolor: '#187955',
                          color: 'white',
                          maxWidth: '70%',
                          ml: 'auto'
                        }}
                      >
                        <Typography>{message.text}</Typography>
                      </Paper>
                    ) : (
                      <Box>
                        <Paper 
                          sx={{ 
                            p: 2, 
                            bgcolor: '#f5f5f5',
                            maxWidth: '70%'
                          }}
                        >
                          <Typography>{message.text}</Typography>
                        </Paper>
                        
                        {message.hasResults && showResults && (
                          <Box sx={{ mt: 3 }}>
                            {/* Results Tabs */}
                            <Tabs value={activeTab} onChange={handleTabChange}>
                              <Tab label="Results" />
                              <Tab label="Visualization" />
                              <Tab label="Interpretation" />
                            </Tabs>

                            {/* Tab Content */}
                            {activeTab === 0 && (
                              <Box sx={{ mt: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="h6">Analysis Results</Typography>
                                  <Button
                                    variant="contained"
                                    startIcon={<DownloadIcon />}
                                    onClick={handleDownloadCSV}
                                    sx={{ bgcolor: '#187955' }}
                                  >
                                    Download CSV
                                  </Button>
                                </Box>
                                
                                <TableContainer component={Paper}>
                                  <Table>
                                    <TableHead>
                                      <TableRow>
                                        {getResultColumns().map((col) => (
                                          <TableCell key={col.field}>{col.label}</TableCell>
                                        ))}
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {getMockData().map((row, idx) => (
                                        <TableRow key={idx}>
                                          {getResultColumns().map((col) => (
                                            <TableCell key={col.field}>
                                              {col.type === 'currency' && row[col.field] ? 
                                                row[col.field].toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) :
                                                col.type === 'percentage' && row[col.field] !== undefined ?
                                                  `${row[col.field]}%` :
                                                  col.type === 'date' && row[col.field] ?
                                                    new Date(row[col.field]).toLocaleDateString() :
                                                    row[col.field] || '-'
                                              }
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            )}

                            {activeTab === 1 && (
                              <Box sx={{ mt: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="h6">Revenue By IPA: This Year Vs Last Year</Typography>
                                  <Box sx={{ display: 'flex', gap: 2 }}>
                                    <FormControl size="small">
                                      <Select
                                        value={chartType}
                                        onChange={(e) => setChartType(e.target.value)}
                                      >
                                        <MenuItem value="Bar Chart">Bar Chart</MenuItem>
                                        <MenuItem value="Line Chart">Line Chart</MenuItem>
                                        <MenuItem value="Pie Chart">Pie Chart</MenuItem>
                                      </Select>
                                    </FormControl>
                                    <Button
                                      variant="contained"
                                      startIcon={<DownloadIcon />}
                                      onClick={handleDownloadPowerPoint}
                                      sx={{ bgcolor: '#187955' }}
                                    >
                                      Download PowerPoint
                                    </Button>
                                  </Box>
                                </Box>
                                
                                <Paper sx={{ p: 2 }}>
                                  <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={mockChartData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip formatter={(value) => value.toLocaleString()} />
                                      <Legend />
                                      <Bar dataKey="thisYear" fill="#187955" name="This Year" />
                                      <Bar dataKey="lastYear" fill="#82ca9d" name="Last Year" />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </Paper>
                              </Box>
                            )}

                            {activeTab === 2 && (
                              <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Interpretation</Typography>
                                <Paper sx={{ p: 3 }}>
                                  <Typography variant="body1" paragraph>
                                    <strong>Key Insights:</strong>
                                  </Typography>
                                  <Typography variant="body2" paragraph>
                                    • IG division leads with $2.46B in revenue, showing 15.7% growth year-over-year
                                  </Typography>
                                  <Typography variant="body2" paragraph>
                                    • CP division experienced a decline of -11.1% compared to last year ($1.99B vs $2.23B)
                                  </Typography>
                                  <Typography variant="body2" paragraph>
                                    • HC division shows strong performance with 13.4% growth ($1.88B vs $1.65B)
                                  </Typography>
                                  <Typography variant="body2" paragraph>
                                    • European markets (EU) show consistent but lower volumes across TC, LP, and SP divisions
                                  </Typography>
                                  <Typography variant="body2" paragraph>
                                    • Total portfolio revenue increased by 8.3% year-over-year, driven primarily by IG and HC divisions
                                  </Typography>
                                </Paper>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}

                {/* Analyzing State */}
                {isAnalyzing && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#187955' }}>
                      AI Analysis In Progress...
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                      <CircularProgress size={24} sx={{ color: '#187955', mr: 2 }} />
                      <Typography>Gathering Data</Typography>
                    </Box>
                    <LinearProgress 
                      sx={{ 
                        width: '50%', 
                        mx: 'auto',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#187955'
                        }
                      }} 
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* Input Area */}
            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Ask a question about your data..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
                <IconButton 
                  color="primary" 
                  onClick={() => handleSendMessage()}
                  sx={{ 
                    bgcolor: '#187955',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#0e5f3f'
                    }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default ConversationPage;