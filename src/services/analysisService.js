// Mock analysis service

const mockResponses = {
  'default': {
    answer: 'Here are the top regions by revenue:',
    tableData: [
      { Region: 'EMESA', 'Actuals ($K)': 6020 },
      { Region: 'North America', 'Actuals ($K)': 3600 },
      { Region: 'Asia Pacific', 'Actuals ($K)': 3290 },
      { Region: 'Northeast Asia', 'Actuals ($K)': 1720 },
      { Region: 'ANZ', 'Actuals ($K)': 850 },
      { Region: 'India', 'Actuals ($K)': 720 },
    ],
    chartData: {
      labels: ['EMESA', 'North America', 'Asia Pacific', 'Northeast Asia', 'ANZ', 'India'],
      datasets: [
        {
          label: 'Actuals ($K)',
          data: [6020, 3600, 3290, 1720, 850, 720],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
      ],
    },
    followUpQuestions: ['Show me the revenue trend for EMESA.', 'Which region had the lowest actuals?', 'Compare the actuals of North America and Asia Pacific.']
  },
  'trend': {
    answer: 'The revenue for EMESA has been trending upwards.',
    tableData: [
      { Month: 'January', 'Revenue ($K)': 1200 },
      { Month: 'February', 'Revenue ($K)': 1550 },
      { Month: 'March', 'Revenue ($K)': 1620 },
      { Month: 'April', 'Revenue ($K)': 1880 },
    ],
    chartData: {
      labels: ['January', 'February', 'March', 'April'],
      datasets: [
        {
          label: 'Revenue ($K)',
          data: [1200, 1550, 1620, 1880],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
      ],
    },
    followUpQuestions: ['What caused the growth in April?', 'Show me the profit margin for this trend.', 'Are other regions showing similar growth?']
  },
  'products': {
    answer: 'Here are the top products sold in North America:',
    tableData: [
      { Product: 'Widget A', 'Units Sold': 1200 },
      { Product: 'Widget B', 'Units Sold': 950 },
      { Product: 'Widget C', 'Units Sold': 800 },
    ],
    chartData: {
      labels: ['Widget A', 'Widget B', 'Widget C'],
      datasets: [
        {
          label: 'Units Sold',
          data: [1200, 950, 800],
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        },
      ],
    },
    followUpQuestions: ['What is the profitability of Widget A?', 'Which other regions buy Widget A?', 'Show me the sales trend for Widget B.']
  }
};

const getAnalysis = async (question, context, sessionId, dataSource) => {
  console.log('Sending analysis request:', { question, context, sessionId, dataSource });

  // Try API first, fallback to mock
  try {
    return await getAnalysisFromAPI(question, context, sessionId);
  } catch (apiError) {
    console.warn('API analysis failed, using mock response:', apiError.message);
    return getMockAnalysis(question, context, sessionId, dataSource);
  }
};

const getAnalysisFromAPI = async (question, context, sessionId) => {
  const baseURL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
  
  // Extract dataset ID from context/session
  const datasetId = extractDatasetId(context, sessionId);
  
  const response = await fetch(`${baseURL}/api/ai-query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: question,
      datasetId: datasetId || 'sales_data' // Default fallback
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'AI query failed');
  }

  // Transform API response to frontend format
  const analysisResult = result.result;
  
  return {
    answer: analysisResult.summary || 'Analysis complete',
    tableData: analysisResult.data || [],
    chartData: transformToChartData(analysisResult.data, analysisResult.chart_type),
    followUpQuestions: analysisResult.insights?.map(insight => 
      `Tell me more about: ${insight}`
    ) || ['Show me more details', 'What caused this pattern?', 'How does this compare to last period?'],
    pythonCode: result.python_code,
    executionTime: result.execution_time,
    cached: result.cached,
    source: 'api'
  };
};

const getMockAnalysis = async (question, context, sessionId, dataSource) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mocked response logic
  if (question.toLowerCase().includes('error')) {
    throw new Error('This is a mock error from the analysis service.');
  }

  // More dynamic mock logic
  if (dataSource && Array.isArray(dataSource) && (question.toLowerCase().includes('top 3') || question.toLowerCase().includes('top three'))) {
    const top3Data = dataSource.slice(0, 3);
    return {
      answer: `Here are the top 3 results from your previous query.`, 
      tableData: top3Data,
      chartData: { // Regenerate chart data for the subset
        labels: top3Data.map(d => Object.values(d)[0]),
        datasets: [{
          label: Object.keys(top3Data[0])[1],
          data: top3Data.map(d => Object.values(d)[1]),
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
        }]
      },
      followUpQuestions: ['Summarize these results.', 'Why are these at the top?'],
      source: 'mock'
    };
  }

  let responseKey = 'default';
  if (question.toLowerCase().includes('trend')) {
    responseKey = 'trend';
  } else if (question.toLowerCase().includes('product')) {
    responseKey = 'products';
  }

  return {
    ...mockResponses[responseKey],
    source: 'mock'
  };
};

const extractDatasetId = (context, sessionId) => {
  // Try to extract dataset ID from context or session
  // This is a simplified implementation
  if (context && context.dataset_id) {
    return context.dataset_id;
  }
  
  // Default mapping based on common patterns
  return 'sales_data';
};

const transformToChartData = (data, chartType = 'bar') => {
  if (!data || data.length === 0) {
    return { labels: [], datasets: [] };
  }

  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  
  // Assume first column is labels, rest are data
  const labelKey = keys[0];
  const dataKeys = keys.slice(1);
  
  const colors = [
    'rgb(75, 192, 192)',
    'rgb(255, 99, 132)', 
    'rgb(54, 162, 235)',
    'rgb(153, 102, 255)',
    'rgb(255, 205, 86)'
  ];

  return {
    labels: data.map(row => row[labelKey]),
    datasets: dataKeys.map((key, index) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      data: data.map(row => row[key]),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.5)'),
      fill: chartType === 'area'
    }))
  };
};

const analysisService = {
  getAnalysis,
};

export default analysisService;
