import React, { useState } from 'react';

const AnalysisContextControlSimple = ({ 
  onModeChange, 
  lastQuestion,
  originalDataCount,
  activeFilters 
}) => {
  const [mode, setMode] = useState('fresh');

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const getFilterSummary = () => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) {
      return null;
    }
    
    const filterCount = Object.keys(activeFilters).length;
    return `${filterCount} filter${filterCount > 1 ? 's' : ''} active`;
  };

  return (
    <div style={{
      marginBottom: '20px',
      background: '#f8f9fa',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #e9ecef'
    }}>
      {/* Mode Selector */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <button 
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            background: mode === 'continue' ? '#e6f2ff' : 'white',
            border: mode === 'continue' ? '2px solid #0066cc' : '2px solid #dee2e6',
            borderRadius: '8px',
            cursor: lastQuestion ? 'pointer' : 'not-allowed',
            opacity: lastQuestion ? 1 : 0.5,
            transition: 'all 0.2s ease'
          }}
          onClick={() => lastQuestion && handleModeChange('continue')}
          disabled={!lastQuestion}
        >
          <span style={{ fontSize: '24px' }}>🔍</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '600', fontSize: '16px', color: '#212529' }}>
              Continue Analysis
            </div>
            <div style={{ fontSize: '13px', color: '#6c757d' }}>
              Build on current results & context
            </div>
          </div>
        </button>
        
        <button 
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            background: mode === 'fresh' ? '#e6f2ff' : 'white',
            border: mode === 'fresh' ? '2px solid #0066cc' : '2px solid #dee2e6',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleModeChange('fresh')}
        >
          <span style={{ fontSize: '24px' }}>✨</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '600', fontSize: '16px', color: '#212529' }}>
              Fresh Start
            </div>
            <div style={{ fontSize: '13px', color: '#6c757d' }}>
              Analyze full dataset, no assumptions
            </div>
          </div>
        </button>
      </div>

      {/* Context Indicator */}
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #cce5ff',
        background: mode === 'continue' ? '#e8f4f8' : '#f0f8ff',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          fontSize: '14px',
          color: '#495057'
        }}>
          <span style={{ fontSize: '18px' }}>
            {mode === 'continue' ? '📊' : '🆕'}
          </span>
          <strong>
            {mode === 'continue' ? 'Continuing Analysis From:' : 'Fresh Analysis Mode'}
          </strong>
        </div>
        <div style={{ marginLeft: '26px' }}>
          {mode === 'continue' && lastQuestion ? (
            <>
              <div style={{
                fontStyle: 'italic',
                color: '#212529',
                fontSize: '14px',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '4px',
                borderLeft: '3px solid #0066cc'
              }}>
                "{lastQuestion}"
              </div>
              {originalDataCount && (
                <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '6px' }}>
                  Working with {originalDataCount.toLocaleString()} records
                  {getFilterSummary() && ` (${getFilterSummary()})`}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: '14px', color: '#212529' }}>
                Starting with complete dataset
                {getFilterSummary() && ` (${getFilterSummary()})`}
              </div>
              {originalDataCount && (
                <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '6px' }}>
                  {originalDataCount.toLocaleString()} total records available
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Benefits Indicator */}
      <div style={{
        padding: '12px 16px',
        background: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '6px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          color: '#155724'
        }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <span>
            {mode === 'continue' 
              ? 'AI maintains context from previous analysis, reducing hallucinations about unrelated data'
              : 'AI starts fresh without assumptions, preventing context contamination'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisContextControlSimple;