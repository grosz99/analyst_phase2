import React, { useState } from 'react';

const QuestionStep = ({ onAnalysis }) => {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Ask a Question About Your Data</h1>
        <p className="text-gray-500 mt-2">Formulate your question clearly for the best analysis results.</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <label htmlFor="question" className="block text-md font-semibold text-gray-700 mb-2">
            Your Question
          </label>
          <textarea
            id="question"
            rows="4"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            placeholder="e.g., What is the average revenue by region? Show me the top 5 products by sales."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <p className="mt-2 text-sm text-gray-500">
            Be specific. Clearly mention the metrics and dimensions you want to analyze.
          </p>
        </div>
        
        <div>
          <label htmlFor="context" className="block text-md font-semibold text-gray-700 mb-2">
            Additional Context <span className="text-sm font-normal text-gray-500">(Optional)</span>
          </label>
          <textarea
            id="context"
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            placeholder="e.g., Focus on trends over the last quarter. The audience for this analysis is the executive team."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
           <p className="mt-2 text-sm text-gray-500">
            Provide any extra information that might help interpret the data or the question.
          </p>
        </div>

        <div className="text-right">
          <button
            onClick={() => onAnalysis(question, context)}
            disabled={!question}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300 disabled:cursor-not-allowed"
          >
            Run Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionStep;
