import React from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './ResultsTable.css';

const ResultsTable = ({ data, title = 'Analysis Results' }) => {
  if (!data || data.length === 0) {
    return <p>No results to display.</p>;
  }

  const headers = Object.keys(data[0]);

  const exportToExcel = () => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Add some styling to headers
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: '059669' } },
          alignment: { horizontal: 'center' }
        };
      }
      
      // Auto-size columns
      const cols = headers.map((header) => ({
        wch: Math.max(header.length, ...data.map(row => String(row[header]).length)) + 2
      }));
      ws['!cols'] = cols;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Results');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.xlsx`;
      
      // Save file
      saveAs(blob, filename);
      
      console.log('✅ Excel export successful');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  return (
    <div className="results-table-container">
      <div className="table-actions">
        <button onClick={exportToExcel} className="export-excel-btn">
          📊 Export to Excel
        </button>
      </div>
      <table className="results-table">
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {headers.map(header => (
                <td key={header}>{row[header]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;
