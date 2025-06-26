import React from 'react';

const DataSourcesStep = ({
  mockDataSources,
  selectedDataSource,
  setSelectedDataSource,
  mockDataPreviews
}) => {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Explore Your Data Sources</h1>
        <p className="text-gray-500 mt-2">Select from the available mock data sources to begin.</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Mock Data Sources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockDataSources.map(source => {
            const isSelected = selectedDataSource === source;
            const data = mockDataPreviews[source] || [];
            const columns = data.length > 0 ? Object.keys(data[0]) : [];

            return (
              <div
                key={source}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500' : 'bg-white hover:border-emerald-400'}`}
                onClick={() => {
                  setSelectedDataSource(source);
                }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-800">{source}</h3>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-emerald-600' : 'border-2 border-gray-300'}`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{data.length} records</p>
                <p className="text-xs text-gray-400 mt-1 truncate" title={columns.join(', ')}>{columns.join(', ')}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DataSourcesStep;
