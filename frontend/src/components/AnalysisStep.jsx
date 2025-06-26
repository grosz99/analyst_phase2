import React from 'react';

const AnalysisStep = ({ analysisHistory, datasetSession, onReset }) => {
  const [activeTab, setActiveTab] = React.useState('summary');
  const [copied, setCopied] = React.useState(false);

  if (!analysisHistory || analysisHistory.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
        <p className="text-gray-500 mt-2">No analysis has been performed yet. Go back to the previous step to ask a question.</p>
      </div>
    );
  }

  const latestAnalysis = analysisHistory[analysisHistory.length - 1];

  const handleCopy = () => {
    navigator.clipboard.writeText(latestAnalysis.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TabButton = ({ tabName, children }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${activeTab === tabName ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {children}
    </button>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analysis Complete</h1>
          <p className="text-gray-500 mt-1">Review the summary, code, and data from the latest analysis.</p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 transition-all duration-150 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3a7 7 0 100 14 7 7 0 000-14zM2 10a8 8 0 1116 0 8 8 0 01-16 0z"/><path d="M13.53 6.47a.75.75 0 00-1.06-1.06L10 8.94 7.53 6.47a.75.75 0 00-1.06 1.06L8.94 10l-2.47 2.47a.75.75 0 101.06 1.06L10 11.06l2.47 2.47a.75.75 0 101.06-1.06L11.06 10l2.47-2.47z"/></svg>
          Start New Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-400 uppercase">Question</h3>
            <p className="text-lg font-semibold text-gray-800 mt-1">{latestAnalysis.question}</p>
          </div>
          
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-2 border border-gray-200 rounded-lg p-1">
                <TabButton tabName="summary">Summary</TabButton>
                <TabButton tabName="code">Generated Code</TabButton>
                <TabButton tabName="data">Result Data</TabButton>
              </div>
              {datasetSession && (
                <div className="text-xs text-gray-500 font-mono">Session: {datasetSession.id}</div>
              )}
            </div>

            <div className="prose max-w-none">
              {activeTab === 'summary' && <p>{latestAnalysis.answer}</p>}
              {activeTab === 'code' && (
                <div className="relative">
                  <button onClick={handleCopy} className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-xs font-semibold rounded hover:bg-gray-600">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <pre className="bg-gray-800 text-gray-200 p-4 rounded-lg overflow-x-auto text-sm"><code>{latestAnalysis.code}</code></pre>
                </div>
              )}
              {activeTab === 'data' && (
                typeof latestAnalysis.visualization === 'string' ? (
                  <p>{latestAnalysis.visualization}</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>{Object.keys(latestAnalysis.visualization[0] || {}).map(key => <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</th>)}</tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {latestAnalysis.visualization.map((row, i) => <tr key={i}>{Object.values(row).map((value, j) => <td key={j} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{String(value)}</td>)}</tr>)}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Session History</h3>
            <p className="text-sm text-gray-500 mt-1">Previous questions in this session.</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {analysisHistory.length > 1 ? (
                analysisHistory.slice(0, -1).reverse().map((item, index) => (
                  <div key={index} className="p-4 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">{item.question}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{item.answer}</p>
                  </div>
                ))
            ) : (
                <p className="p-4 text-sm text-gray-500">No previous questions in this session.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisStep;
