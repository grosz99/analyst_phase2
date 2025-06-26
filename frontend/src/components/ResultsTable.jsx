import React from 'react';
import './ResultsTable.css';

const ResultsTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <p>No results to display.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="results-table-container">
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
