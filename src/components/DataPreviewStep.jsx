import React from 'react';

const DataPreviewStep = ({ dataset, datasetInfo, isLoading }) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl font-bold text-gray-800">Compiling Your Dataset...</div>
        <p className="text-gray-500 mt-2">This may take a moment.</p>
        {/* You can add a spinner here */}
        <div className="mt-4 animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
      </div>
    );
  }

  if (!dataset || dataset.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <h2 className="text-xl font-semibold">No Data to Preview</h2>
        <p className="mt-2">Your dataset is empty. This could be due to the applied filters. Please go back and adjust your selections.</p>
      </div>
    );
  }

  const headers = Object.keys(dataset[0] || {});
  const previewRows = dataset.slice(0, 5);

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Preview Your Data</h1>
        <p className="text-gray-500 mt-2">Here's a snapshot of the dataset you've built.</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-8 max-w-4xl mx-auto">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <h3 className="font-bold text-emerald-800">Dataset Ready for Analysis</h3>
            <p className="text-sm text-emerald-700">{datasetInfo}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto overflow-x-auto">
        <div className="shadow-md rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {headers.map(header => (
                    <td key={`${rowIndex}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {String(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dataset.length > 10 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Showing first 10 rows of {dataset.length} total rows.
          </p>
        )}
      </div>
    </div>
  );
};

export default DataPreviewStep;
