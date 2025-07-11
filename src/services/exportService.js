import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import pptxgen from 'pptxgenjs';

/**
 * Export data to CSV format
 */
export const exportToCSV = (data, filename = 'export') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : row[header];
        cell = String(cell).replace(/"/g, '""'); // Escape double quotes
        if (cell.search(/(",|\n|\r|")/g) >= 0) cell = `"${cell}"`; // Enclose in quotes if needed
        return cell;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

/**
 * Export data to Excel format
 */
export const exportToExcel = (data, filename = 'export', sheetName = 'Data') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Auto-size columns
  const colWidths = [];
  const headers = Object.keys(data[0]);
  headers.forEach((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...data.map(row => String(row[header] || '').length)
    );
    colWidths[i] = { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Export chart to PowerPoint
 */
export const exportChartToPowerPoint = async (chartConfig) => {
  try {
    const { chartType, chartData, title, filename = 'chart_export' } = chartConfig;
    
    // Create new presentation
    const pptx = new pptxgen();
    const slide = pptx.addSlide();
    
    // Add title
    if (title) {
      slide.addText(title, {
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        bold: true,
        color: '363636'
      });
    }
    
    // Format data for PptxGenJS
    const formattedData = formatChartDataForPPT(chartData, chartType);
    
    // Add chart
    slide.addChart(
      mapChartType(chartType),
      formattedData,
      {
        x: 0.5,
        y: title ? 1.25 : 0.5,
        w: 9,
        h: 5,
        showTitle: false,
        showLegend: true,
        legendPos: 'b',
        chartColors: ['187955', '20c997', '17a2b8', '6610f2', '6f42c1'],
        showDataLabels: true,
        dataLabelFontSize: 10,
        dataLabelColor: '363636'
      }
    );
    
    // Save file
    await pptx.writeFile({ fileName: `${filename}.pptx` });
    
    return { success: true, filename: `${filename}.pptx` };
  } catch (error) {
    console.error('PowerPoint export failed:', error);
    throw new Error(`Export failed: ${error.message}`);
  }
};

/**
 * Map chart types to PptxGenJS format
 */
const mapChartType = (chartType) => {
  const typeMap = {
    'bar': 'bar',
    'column': 'bar',
    'line': 'line',
    'pie': 'pie',
    'area': 'area',
    'scatter': 'scatter'
  };
  return typeMap[chartType.toLowerCase()] || 'bar';
};

/**
 * Format chart data for PowerPoint export
 */
const formatChartDataForPPT = (chartData, chartType) => {
  if (chartType === 'pie') {
    return [{
      name: 'Series 1',
      labels: chartData.map(item => item.name || item.label),
      values: chartData.map(item => item.value)
    }];
  }
  
  // For bar, line, area charts
  const labels = chartData.map(item => item.name || item.label);
  const values = chartData.map(item => item.value);
  
  return [{
    name: 'Data Series',
    labels: labels,
    values: values
  }];
};

/**
 * Export analysis results with multiple formats
 */
export const exportAnalysisResults = async (analysisData, format = 'excel') => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `analysis_results_${timestamp}`;
  
  try {
    switch (format.toLowerCase()) {
      case 'csv':
        exportToCSV(analysisData.data, filename);
        break;
      case 'excel':
        exportToExcel(analysisData.data, filename, 'Analysis Results');
        break;
      case 'powerpoint':
        if (analysisData.chart) {
          await exportChartToPowerPoint({
            chartType: analysisData.chart.type,
            chartData: analysisData.chart.data,
            title: analysisData.title || 'Analysis Results',
            filename: filename
          });
        } else {
          throw new Error('No chart data available for PowerPoint export');
        }
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    return { success: true, filename };
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};