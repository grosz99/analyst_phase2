import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './LineChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: false, // Title will be handled by the result block heading
    },
  },
  scales: {
    y: {
      ticks: {
        color: '#64748b',
      },
       grid: {
        color: '#e2e8f0',
      }
    },
    x: {
      ticks: {
        color: '#64748b',
      },
      grid: {
        display: false,
      }
    }
  }
};

function LineChart({ chartData }) {
  // Add a check for chartData to prevent runtime errors
  if (!chartData || !chartData.labels || !chartData.datasets) {
    return <div className="chart-placeholder">Chart data is not available.</div>;
  }

  const data = {
    labels: chartData.labels,
    datasets: chartData.datasets,
  };

  return <div className="chart-wrapper"><Line options={options} data={data} /></div>;
}

export default LineChart;
