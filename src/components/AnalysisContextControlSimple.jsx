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
      marginBottom: '24px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: '16px',
      padding: '24px',
      border: '2px solid #e2e8f0',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s ease'
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
            gap: '14px',
            padding: '18px 24px',
            background: mode === 'continue' 
              ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' 
              : 'white',
            border: mode === 'continue' 
              ? '2px solid #059669' 
              : '2px solid #e2e8f0',
            borderRadius: '12px',
            cursor: lastQuestion ? 'pointer' : 'not-allowed',
            opacity: lastQuestion ? 1 : 0.5,
            transition: 'all 0.3s ease',
            boxShadow: mode === 'continue' 
              ? '0 4px 12px rgba(5, 150, 105, 0.15)' 
              : '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => lastQuestion && handleModeChange('continue')}
          disabled={!lastQuestion}
        >
          <span style={{ fontSize: '24px' }}>🔍</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#047857' }}>
              Continue Analysis
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Build on current results & context
            </div>
          </div>
        </button>
        
        <button 
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '18px 24px',
            background: mode === 'fresh' 
              ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' 
              : 'white',
            border: mode === 'fresh' 
              ? '2px solid #059669' 
              : '2px solid #e2e8f0',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: mode === 'fresh' 
              ? '0 4px 12px rgba(5, 150, 105, 0.15)' 
              : '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => handleModeChange('fresh')}
        >
          <span style={{ fontSize: '24px' }}>✨</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#047857' }}>
              Fresh Start
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Analyze full dataset, no assumptions
            </div>
          </div>
        </button>
      </div>

      {/* Context Indicator */}
      <div style={{
        padding: '18px',
        borderRadius: '12px',
        border: '2px solid #bbf7d0',
        background: mode === 'continue' 
          ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.08)'
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
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        border: '2px solid #6ee7b7',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          color: '#155724'
        }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <span style={{ fontWeight: '600' }}>
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