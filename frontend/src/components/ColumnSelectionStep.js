import React from 'react';

const ColumnSelectionStep = ({
  availableFields,
  selectedDimensions,
  setSelectedDimensions,
  selectedMetrics,
  setSelectedMetrics
}) => {
  const handleDimensionToggle = (field) => {
    if (selectedDimensions.includes(field.name)) {
      setSelectedDimensions(selectedDimensions.filter(d => d !== field.name));
    } else {
      setSelectedDimensions([...selectedDimensions, field.name]);
    }
  };
  
  const handleMetricToggle = (field) => {
    if (selectedMetrics.includes(field.name)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== field.name));
    } else {
      setSelectedMetrics([...selectedMetrics, field.name]);
    }
  };

  // Group fields by type
  const dimensionFields = availableFields.filter(field => 
    field.type === 'string' || field.type === 'date' || field.type === 'boolean'
  );
  
  const metricFields = availableFields.filter(field => 
    field.type === 'number' || field.type === 'integer'
  );

  const renderFieldList = (title, description, fields, selectedFields, onToggle) => (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="border-t border-gray-200">
        <div className="max-h-80 overflow-y-auto">
          {fields.length > 0 ? (
            fields.map((field, index) => {
              const isSelected = selectedFields.includes(field.name);
              return (
                <div
                  key={field.name}
                  onClick={() => onToggle(field)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors duration-150 ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'} ${index > 0 ? 'border-t border-gray-200' : ''}`}>
                  <div>
                    <p className={`font-medium ${isSelected ? 'text-emerald-800' : 'text-gray-800'}`}>{field.name}</p>
                    <p className={`text-xs ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}>
                      Type: {field.type} | Source: {field.source}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-emerald-600' : 'border-2 border-gray-300'}`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 p-6 text-center">No fields available.</p>
          )}
        </div>
      </div>
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-600">{selectedFields.length} selected</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Select Columns for Analysis</h1>
        <p className="text-gray-500 mt-2">Choose the dimensions (text or date fields) and metrics (number fields) you want to analyze.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {renderFieldList(
          'Dimensions',
          'Categorical fields to group your data (e.g., Region, Product).',
          dimensionFields,
          selectedDimensions,
          handleDimensionToggle
        )}
        {renderFieldList(
          'Metrics',
          'Numerical fields for measurement (e.g., Sales, Revenue).',
          metricFields,
          selectedMetrics,
          handleMetricToggle
        )}
      </div>
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-md font-medium mb-2">Selection Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Selected Dimensions:</h4>
            {selectedDimensions.length > 0 ? (
              <ul className="mt-1 list-disc list-inside">
                {selectedDimensions.map(dim => (
                  <li key={dim} className="text-sm">{dim}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 mt-1">None selected</p>
            )}
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Selected Metrics:</h4>
            {selectedMetrics.length > 0 ? (
              <ul className="mt-1 list-disc list-inside">
                {selectedMetrics.map(metric => (
                  <li key={metric} className="text-sm">{metric}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 mt-1">None selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnSelectionStep;
