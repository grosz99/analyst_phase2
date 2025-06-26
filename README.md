# Enhanced Data Analysis Application

This application provides a user-friendly interface for data analysis with persistent dataset loading capabilities.

## Features

- **Data Source Selection**: Upload CSV files or use mock data sources
- **Filter Selection**: Apply filters to narrow down your dataset
- **Column Selection**: Choose dimensions and metrics for analysis
- **Persistent Dataset Loading**: Load a dataset once and ask multiple questions
- **AI-Powered Analysis**: Analyze data with Claude AI integration

## Project Structure

```
data-analysis-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalysisStep.js
│   │   │   ├── ColumnSelectionStep.js
│   │   │   ├── DataSourcesStep.js
│   │   │   ├── FiltersStep.js
│   │   │   ├── QuestionStep.js
│   │   │   └── StepIndicator.js
│   │   ├── services/
│   │   │   └── datasetService.js
│   │   ├── DataAnalysisApp.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
└── backend/ (Future Implementation)
    ├── services/
    │   ├── snowflake_service.py
    │   └── claude_service.py
    └── routes/
        └── api_routes.py
```

## Getting Started

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

## Future Enhancements

- Backend integration with Snowflake for data loading
- Redis caching for dataset persistence
- FastAPI endpoints for dataset management
- Enhanced Claude Code integration
- Session management with TTL (Time To Live)

## How to Use

1. **Select Data Sources**: Choose from available mock data or upload your CSV files
2. **Apply Filters**: Filter your data based on various criteria
3. **Select Columns**: Choose dimensions (categorical fields) and metrics (numeric fields)
4. **Ask Questions**: Enter analytical questions about your data
5. **View Analysis**: See the results, generated code, and visualizations
