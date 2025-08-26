import React, { useState, useRef, useEffect } from 'react';
import AIAnalysisResults from './AIAnalysisResults.jsx';
import SavedQueries from './SavedQueries.jsx';
import SaveQueryButton from './SaveQueryButton.jsx';
import InlineProgressIndicator from './InlineProgressIndicator.jsx';
import streamingAnalysisService from '../services/streamingAnalysisService.js';
import './ConversationContainer.css';

const ConversationContainer = ({ 
  conversationId,
  initialData,
  cachedDataset,
  sessionId,
  aiAnalysisService,
  onClose,
  isActive,
  onActivate,
  selectedDataSource
}) => {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [questionToSave, setQuestionToSave] = useState(null);
  const [resultsToSave, setResultsToSave] = useState(null);
  const [streamingProgress, setStreamingProgress] = useState({
    isVisible: false,
    currentStep: 'discovering',
    progress: 0,
    estimatedTimeRemaining: 0,
    statusMessage: '',
    currentQuestion: ''
  });
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  
  console.log('🔄 ConversationContainer render:', {
    conversationId,
    hasInitialData: !!initialData,
    initialDataRows: initialData?.length,
    hasCachedDataset: !!cachedDataset,
    cachedDatasetRows: cachedDataset?.length,
    sessionId,
    hasAiAnalysisService: !!aiAnalysisService,
    isActive,
    messagesCount: messages?.length || 0
  });

  // Auto-focus on input when active
  useEffect(() => {
    if (isActive && !isCollapsed && inputRef.current) {
      console.log('🎯 Auto-focusing input for active conversation');
      inputRef.current.focus();
    }
  }, [isActive, isCollapsed]);

  // Generate suggested questions when conversation is created
  useEffect(() => {
    if (messages.length === 0 && initialData && initialData.length > 0) {
      console.log('💡 Generating suggested questions for conversation');
      try {
        const suggestions = aiAnalysisService.generateSuggestedQuestions(initialData);
        console.log('✅ Generated suggestions:', suggestions);
        setSuggestedQuestions(suggestions);
      } catch (error) {
        console.error('❌ Error generating suggestions:', error);
        setSuggestedQuestions([]);
      }
    }
  }, [initialData, messages.length, aiAnalysisService]);

  // Listen for suggested questions (from external sources)
  useEffect(() => {
    const handleSuggestedQuestion = (event) => {
      if (isActive) {
        console.log('🎯 External suggested question received:', event.detail);
        setCurrentQuestion(event.detail);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    };

    window.addEventListener('suggestedQuestion', handleSuggestedQuestion);
    return () => window.removeEventListener('suggestedQuestion', handleSuggestedQuestion);
  }, [isActive]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current && !isCollapsed) {
      console.log('📜 Scrolling to bottom, messages count:', messages.length);
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isCollapsed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isAnalyzing) {
      console.warn('⚠️ Cannot submit:', {
        hasQuestion: !!currentQuestion.trim(),
        isAnalyzing
      });
      return;
    }

    const question = currentQuestion.trim();
    console.log('📝 Starting streaming analysis for question:', question);
    
    setCurrentQuestion('');
    setIsAnalyzing(true);

    // Show streaming loading view
    setStreamingProgress({
      isVisible: true,
      currentStep: 'discovering',
      progress: 0,
      estimatedTimeRemaining: 15,
      statusMessage: 'Initializing AI analysis...',
      currentQuestion: question
    });

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const dataToAnalyze = cachedDataset || initialData;
      
      // Build context from previous messages
      const conversationContext = messages
        .filter(m => m.type === 'user' || m.type === 'assistant')
        .slice(-5) // Last 5 exchanges for context
        .map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content || m.question}`)
        .join('\n');

      const contextPrompt = messages.length > 0 
        ? `Previous conversation:\n${conversationContext}\n\nCurrent question: ${question}`
        : null;

      // Get dataset ID for specialized AI context
      const datasetId = selectedDataSource?.toLowerCase() || null;
      
      // Progress callback for streaming updates
      const onProgress = (step, progress, estimatedTime, message) => {
        setStreamingProgress({
          isVisible: true,
          currentStep: step,
          progress: Math.round(progress),
          estimatedTimeRemaining: estimatedTime,
          statusMessage: message,
          currentQuestion: question
        });
      };

      // Cancel callback
      const onCancel = () => {
        setStreamingProgress({ ...streamingProgress, isVisible: false });
        setIsAnalyzing(false);
        console.log('🚫 Analysis cancelled by user');
      };
      
      const result = await streamingAnalysisService.analyzeDataWithStreaming(
        dataToAnalyze,
        question,
        {
          analysisType: 'general',
          sessionId,
          onProgress,
          onCancel,
          contextPrompt,
          datasetId
        }
      );
      
      console.log('📊 Analysis result received:', {
        success: result?.success,
        hasAnalysis: !!result?.analysis,
        hasResultsTable: !!result?.results_table,
        resultsTableData: result?.results_table?.data?.length,
        hasVisualization: !!result?.visualization,
        visualizationData: result?.visualization?.data?.length,
        hasPythonCode: !!result?.python_code,
        hasRefinedQuestions: !!result?.refined_questions,
        error: result?.error
      });

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        question: question,
        result: result,
        timestamp: new Date().toISOString()
      };
      
      console.log('💬 Creating assistant message:', {
        messageId: assistantMessage.id,
        question: assistantMessage.question,
        resultSuccess: assistantMessage.result?.success,
        resultKeys: Object.keys(assistantMessage.result || {})
      });
      
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('❌ Analysis error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: error.message || 'Analysis failed. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Hide streaming progress and reset analyzing state
      setStreamingProgress({
        isVisible: false,
        currentStep: 'discovering',
        progress: 0,
        estimatedTimeRemaining: 0,
        statusMessage: '',
        currentQuestion: ''
      });
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestedQuestionClick = (question) => {
    console.log('💡 Suggested question clicked:', question);
    setCurrentQuestion(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSelectSavedQuery = async (savedQuery) => {
    console.log('💾 Saved query selected:', savedQuery);
    setShowSavedQueries(false);
    
    // If we have saved Python code, execute it directly with current data
    if (savedQuery.results?.pythonCode) {
      console.log('🐍 Executing saved Python code with current data');
      
      // Check if we have data to analyze
      const dataToAnalyze = cachedDataset || initialData;
      if (!dataToAnalyze || dataToAnalyze.length === 0) {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: `⚠️ No data available to execute saved query. Please load a dataset first.

**Saved Query:** ${savedQuery.question}`,
          timestamp: new Date(),
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
      
      // Set up the analysis with saved code
      setIsAnalyzing(true);
      
      // Add user message to conversation
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: savedQuery.question,
        timestamp: new Date(),
        fromSavedQuery: true
      };
      setMessages(prev => [...prev, userMessage]);
      
      try {
        const dataToAnalyze = cachedDataset || initialData;
        const datasetId = selectedDataSource?.toLowerCase() || null;
        
        // Create context prompt that includes the saved Python code
        const contextPrompt = `
REUSING SAVED ANALYSIS:
This is a saved query being re-executed with current data.

Original Question: ${savedQuery.question}
Original Python Code:
${savedQuery.results.pythonCode}

INSTRUCTIONS:
1. Use the same analysis approach as the saved Python code above
2. Apply it to the current dataset 
3. Ensure the code works with any changes in data structure
4. Provide updated results using the same methodology
        `;
        
        const result = await aiAnalysisService.analyzeData(
          dataToAnalyze,
          savedQuery.question,
          'general',
          sessionId,
          'anthropic',
          contextPrompt,
          datasetId
        );
        
        if (result.success) {
          const assistantMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: `Re-executed saved query with current data`,
            result: result,
            question: savedQuery.question,
            timestamp: new Date(),
            fromSavedQuery: true
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error(result.error || 'Analysis failed');
        }
      } catch (error) {
        console.error('Failed to execute saved query:', error);
        const errorMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: `⚠️ Could not execute saved query with AI analysis. This might be because the AI service is not available or missing API keys. 

**Saved Query:** ${savedQuery.question}

**Options:**
- Check if the backend API is running (localhost:3001)
- Verify Anthropic API key is set
- Try running the query manually by typing it in the input field

**Original saved code:**
\`\`\`python
${savedQuery.results?.pythonCode || 'No saved code available'}
\`\`\``,
          timestamp: new Date(),
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // Fallback: just set the question text if no saved code
      console.log('📝 No saved code found, setting question text');
      setCurrentQuestion(savedQuery.question);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const getConversationTitle = () => {
    if (messages.length === 0) return 'New Conversation';
    const firstUserMessage = messages.find(m => m.type === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.length > 50 
        ? firstUserMessage.content.substring(0, 50) + '...'
        : firstUserMessage.content;
    }
    return 'New Conversation';
  };

  return (
    <div className={`conversation-container ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="conversation-header" onClick={() => onActivate(conversationId)}>
        <button 
          className="collapse-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
        <h3 className="conversation-title">{getConversationTitle()}</h3>
        <span className="message-count">{messages.length} messages</span>
        <button 
          className="close-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Close this conversation?')) {
              onClose(conversationId);
            }
          }}
        >
          ✕
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="conversation-messages" ref={containerRef}>
            {messages.length === 0 && (
              <div className="empty-conversation">
                <p>Start a new conversation by asking a question about your data.</p>
                
                {/* Suggested Questions */}
                {suggestedQuestions.length > 0 && (
                  <div className="suggested-questions-container">
                    <h4>💡 Suggested Questions:</h4>
                    <div className="suggested-questions-grid">
                      {suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          className="suggested-question-btn"
                          onClick={() => handleSuggestedQuestionClick(question)}
                          disabled={isAnalyzing}
                        >
                          <span className="question-number">{index + 1}.</span>
                          <span className="question-text">{question}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {messages.map((message, index) => {
              // Count how many user messages came before this one
              const questionNumber = messages.slice(0, index + 1).filter(m => m.type === 'user').length;
              
              return (
                <div key={message.id} className={`message message-${message.type}`}>
                  {message.type === 'user' && (
                    <div className="user-message">
                      <div className="question-number-badge">#{questionNumber}</div>
                      <span className="message-icon">👤</span>
                      <div className="message-content">
                        <div className="user-question-container">
                          <span className="user-question-text">{message.content}</span>
                          <button 
                            className="save-question-btn"
                            onClick={() => {
                              // Find the corresponding analysis result for this question
                              const nextMessage = messages[index + 1];
                              const analysisResult = nextMessage && nextMessage.type === 'assistant' ? nextMessage.result : null;
                              
                              setQuestionToSave(message.content);
                              setResultsToSave(analysisResult);
                              setShowSaveModal(true);
                            }}
                            title="Save this question"
                          >
                            🔒
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {message.type === 'assistant' && (
                    <div className="assistant-message">
                      <div className="question-number-badge">#{questionNumber}</div>
                      <div className="message-icon">
                        <img src="/logo.svg" alt="Beacon" className="beacon-logo-icon" />
                      </div>
                    <div className="message-content">
                      {/* Debug logging for props being passed to AIAnalysisResults */}
                      {(() => {
                        console.log('🔍 ConversationContainer passing to AIAnalysisResults:', {
                          messageId: message.id,
                          question: message.question,
                          analysisResult: message.result,
                          resultSuccess: message.result?.success,
                          resultKeys: Object.keys(message.result || {}),
                          hasOriginalData: !!initialData,
                          originalDataRows: initialData?.length,
                          sessionId
                        });
                        return null;
                      })()}
                      <AIAnalysisResults
                        analysisResult={message.result}
                        originalData={initialData}
                        question={message.question}
                        isLoading={false}
                        showCompactInput={false}
                        showContextControl={false}
                        selectedBackend="anthropic"
                        sessionId={sessionId}
                        selectedDataSource={selectedDataSource}
                      />
                      {/* Save Query Button */}
                      {message.result?.success && (
                        <div style={{ marginTop: '12px', textAlign: 'right' }}>
                          <SaveQueryButton
                            question={message.question}
                            results={message.result}
                            dataSource="ORDERS"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {message.type === 'error' && (
                  <div className="error-message">
                    <span className="message-icon">❌</span>
                    <div className="message-content">{message.content}</div>
                  </div>
                )}
              </div>
              );
            })}
            
            {isAnalyzing && (
              <div className="message message-loading">
                <div className="message-icon">
                  <img src="/logo.svg" alt="Beacon" className="beacon-logo-icon" />
                </div>
                <div className="message-content">
                  <InlineProgressIndicator
                    isVisible={streamingProgress.isVisible}
                    currentStep={streamingProgress.currentStep}
                    progress={streamingProgress.progress}
                    estimatedTimeRemaining={streamingProgress.estimatedTimeRemaining}
                    statusMessage={streamingProgress.statusMessage}
                    userQuestion={streamingProgress.currentQuestion}
                    selectedFilters={null}
                  />
                </div>
              </div>
            )}
          </div>

          <form className="conversation-input-form" onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <button 
                type="button"
                className="saved-queries-button"
                onClick={() => setShowSavedQueries(true)}
                disabled={isAnalyzing}
                title="Browse saved queries"
              >
                📖
              </button>
              <textarea
                ref={inputRef}
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your data..."
                className="conversation-input"
                rows="1"
                disabled={isAnalyzing}
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!currentQuestion.trim() || isAnalyzing}
              >
                {isAnalyzing ? '⏳' : '➤'}
              </button>
            </div>
          </form>
        </>
      )}
      
      {/* Saved Queries Modal */}
      {showSavedQueries && (
        <SavedQueries
          onSelectQuery={handleSelectSavedQuery}
          onClose={() => setShowSavedQueries(false)}
        />
      )}
      
      {/* Save Query Modal */}
      {showSaveModal && questionToSave && (
        <div style={{ position: 'relative' }}>
          <SaveQueryButton
            question={questionToSave}
            results={resultsToSave}
            dataSource="ORDERS"
            autoOpen={true}
            onClose={() => {
              setShowSaveModal(false);
              setQuestionToSave(null);
              setResultsToSave(null);
            }}
          />
        </div>
      )}

    </div>
  );
};

export default ConversationContainer;