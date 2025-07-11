# Beacon Chart and Export Implementation Patterns

## Chart Implementation

### Library: Recharts
Beacon uses **Recharts** (v2.7.2) as the primary charting library.

### Key Features:
1. **Multiple Chart Types**:
   - Bar Chart
   - Line Chart
   - Area Chart
   - Pie Chart
   - Scatter Plot

2. **Chart Configuration**:
   - Dynamic chart type switching
   - Customizable X and Y axes
   - BCG green color palette (#187955 as primary)
   - Responsive container for automatic resizing

3. **Example Implementation** (from VisualizationPanel.jsx):
```javascript
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from 'recharts';

// Color palette
const COLORS = ['#187955', '#20c997', '#17a2b8', '#6610f2', '#6f42c1'];

// Chart component
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="value" fill="#187955" />
  </BarChart>
</ResponsiveContainer>
```

## Data Export Implementation

### 1. CSV Export (from TreeTable.jsx)

**Features**:
- Export all data
- Export current view only
- Proper CSV formatting with escaped characters
- Browser-based download

**Implementation**:
```javascript
// Convert to CSV
const convertToCSV = (dataArray, headers) => {
  const array = [headers, ...dataArray];
  return array.map(row => {
    return headers.map(header => {
      let cell = row[header] === null || row[header] === undefined ? '' : row[header];
      cell = String(cell).replace(/"/g, '""'); // Escape double quotes
      if (cell.search(/(",|\n|\r|")/g) >= 0) cell = `"${cell}"`; // Enclose in quotes
      return cell;
    }).join(',');
  }).join('\n');
};

// Download CSV
const downloadCSV = (csvString, filename) => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

### 2. PowerPoint Export (PowerPointExportService.js)

**Library**: pptxgenjs (v3.12.0)

**Features**:
- Export charts as native, editable PowerPoint charts
- Support for multiple chart types
- Custom styling and colors
- Automatic file download

**Implementation**:
```javascript
import pptxgen from 'pptxgenjs';

export const exportToPowerPointDirect = async (chartConfig) => {
  const { chartType, chartData, chartOptions, filename } = chartConfig;
  
  // Create presentation
  const pptx = new pptxgen();
  const slide = pptx.addSlide();
  
  // Add title
  if (chartOptions.title) {
    slide.addText(chartOptions.title, {
      x: 0.5, y: 0.5,
      fontSize: 24, bold: true,
      color: '363636'
    });
  }
  
  // Add chart
  slide.addChart(
    getMappedChartType(chartType),
    formattedData,
    {
      x: 0.5, y: 1.25, w: 9, h: 5,
      showLegend: true,
      chartColors: ['187955', '20c997', '17a2b8'],
      showDataLabels: true,
      dataLabelFontSize: 10
    }
  );
  
  // Save file
  await pptx.writeFile({ fileName: filename });
};
```

### 3. Excel Export (Not Implemented)
While the analyst_phase2 project includes xlsx (v0.18.5) in package.json, Beacon doesn't have Excel export implemented. This could be added using:

```javascript
import * as XLSX from 'xlsx';

const exportToExcel = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
```

## Integration Recommendations for analyst_phase2

1. **Use Recharts** for consistency with Beacon patterns
2. **Implement CSV export** using the convertToCSV/downloadCSV pattern
3. **Add PowerPoint export** for charts using pptxgenjs
4. **Leverage existing xlsx dependency** for Excel export
5. **Apply BCG green color palette** consistently across all visualizations

## Key Libraries Already in analyst_phase2:
- ✅ recharts (v2.12.7) - Chart rendering
- ✅ pptxgenjs (v3.12.0) - PowerPoint export
- ✅ xlsx (v0.18.5) - Excel export
- ✅ file-saver (v2.0.5) - File downloads
- ✅ html2canvas (v1.4.1) - Screenshot capability