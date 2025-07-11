import React, { useState, useRef, useEffect } from 'react';
import AIAnalysisResults from './AIAnalysisResults.jsx';
import './ConversationContainer.css';

const ConversationContainer = ({ 
  conversationId,
  initialData,
  cachedDataset,
  sessionId,
  aiAnalysisService,
  onClose,
  isActive,
  onActivate
}) => {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
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
    console.log('📝 Starting analysis for question:', question);
    console.log('📊 Data to analyze:', {
      hasCachedDataset: !!cachedDataset,
      hasInitialData: !!initialData,
      cachedDataRows: cachedDataset?.length,
      initialDataRows: initialData?.length
    });
    
    setCurrentQuestion('');
    setIsAnalyzing(true);

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
      
      console.log('🔍 Analyzing with data:', {
        rows: dataToAnalyze?.length,
        columns: dataToAnalyze?.length ? Object.keys(dataToAnalyze[0]).length : 0,
        firstRowSample: dataToAnalyze?.[0]
      });
      
      // Build context from previous messages
      const conversationContext = messages
        .filter(m => m.type === 'user' || m.type === 'assistant')
        .slice(-5) // Last 5 exchanges for context
        .map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content || m.question}`)
        .join('\n');

      const contextPrompt = messages.length > 0 
        ? `Previous conversation:\n${conversationContext}\n\nCurrent question: ${question}`
        : null;
        
      console.log('🎯 Context prompt:', contextPrompt ? contextPrompt.substring(0, 200) + '...' : 'No context');

      const result = await aiAnalysisService.analyzeData(
        dataToAnalyze,
        question,
        'general',
        sessionId,
        'anthropic',
        contextPrompt
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
      console.error('📋 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: error.message || 'Analysis failed. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
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
                      <div className="message-content">{message.content}</div>
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
                      />
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
                  <div className="loading-indicator">
                    <div className="loading-spinner"></div>
                    <span>Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="conversation-input-form" onSubmit={handleSubmit}>
            <div className="input-wrapper">
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
    </div>
  );
};

export default ConversationContainer;