import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './LineChart.css';

function formatYAxis(value) {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return value;
}

function LineChartComponent({ data, selectedChartKPI, setSelectedChartKPI }) {
  const [exportStatus, setExportStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const kpiToDataKey = {
    'Revenue': 'revenue',
    'Units Sold': 'unitsSold',
    'Billability': 'billability',
    'Projected Work': 'projectedWork'
  };

  const chartData = data.reduce((acc, item) => {
    const existingEntry = acc.find(entry => entry.date === item.date);
    if (existingEntry) {
      existingEntry.revenue += item.revenue;
      existingEntry.unitsSold += item.unitsSold;
      existingEntry.billability += item.billability;
      existingEntry.projectedWork += item.projectedWork;
      existingEntry.plan += item.plan;
      existingEntry.count += 1;
    } else {
      acc.push({
        date: item.date,
        revenue: item.revenue,
        unitsSold: item.unitsSold,
        billability: item.billability,
        projectedWork: item.projectedWork,
        plan: item.plan,
        count: 1
      });
    }
    return acc;
  }, []);

  chartData.forEach(item => {
    if (item.count > 0) {
        item.revenue /= item.count;
        item.unitsSold /= item.count;
        item.billability /= item.count;
        item.projectedWork /= item.count;
        item.plan /= item.count;
    }
  });

  chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

  const exportToThinkCell = async () => {
    // Mock export functionality
    setIsExporting(true);
    setExportStatus('Generating PowerPoint...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    setExportStatus('Export complete!');
    setIsExporting(false);
    setTimeout(() => setExportStatus(''), 3000);
  };

  const dataKey = kpiToDataKey[selectedChartKPI];
  const showPlan = selectedChartKPI === 'Revenue';

  return (
    <div className="line-chart-section">
      <div className="chart-header">
        <div className="chart-selector">
          {Object.keys(kpiToDataKey).map(kpi => (
            <button
              key={kpi}
              className={selectedChartKPI === kpi ? 'active' : ''}
              onClick={() => setSelectedChartKPI(kpi)}
            >
              {kpi}
            </button>
          ))}
        </div>
        <div className="export-section">
          <button 
            onClick={exportToThinkCell}
            className="thinkcell-export-btn"
            disabled={isExporting}
          >
            {isExporting ? 'Generating...' : 'Export to PowerPoint'}
          </button>
          {exportStatus && <span className="export-status">{exportStatus}</span>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={formatYAxis} />
          <Tooltip formatter={(value) => formatYAxis(value)} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            name={selectedChartKPI}
            stroke="#8884d8" 
            strokeWidth={2}
          />
          {showPlan && (
            <Line 
              type="monotone" 
              dataKey="plan" 
              name="Plan"
              stroke="#82ca9d" 
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LineChartComponent;
