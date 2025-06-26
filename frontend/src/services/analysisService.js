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

const getAnalysis = async (question, context, sessionId, initialData) => {
  console.log('Sending analysis request:', { question, context, sessionId });

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mocked response logic
  if (question.toLowerCase().includes('error')) {
    throw new Error('This is a mock error from the analysis service.');
  }

  let responseKey = 'default';
  if (question.toLowerCase().includes('trend')) {
    responseKey = 'trend';
  } else if (question.toLowerCase().includes('product')) {
    responseKey = 'products';
  }

  return mockResponses[responseKey];
};

const analysisService = {
  getAnalysis,
};

export default analysisService;
