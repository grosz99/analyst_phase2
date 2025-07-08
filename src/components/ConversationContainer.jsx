import React, { useState, useRef, useEffect } from 'react';
import AIAnalysisResults from './AIAnalysisResults.jsx';
import './ConversationContainer.css';

const ConversationContainer = ({ 
  conversationId,
  initialData,
  cachedDataset,
  sessionId,
  selectedBackend,
  aiAnalysisService,
  onClose,
  isActive,
  onActivate
}) => {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus on input when active
  useEffect(() => {
    if (isActive && !isCollapsed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, isCollapsed]);

  // Listen for suggested questions
  useEffect(() => {
    const handleSuggestedQuestion = (event) => {
      if (isActive) {
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
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isCollapsed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isAnalyzing) return;

    const question = currentQuestion.trim();
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
      
      // Build context from previous messages
      const conversationContext = messages
        .filter(m => m.type === 'user' || m.type === 'assistant')
        .slice(-5) // Last 5 exchanges for context
        .map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content || m.question}`)
        .join('\n');

      const contextPrompt = messages.length > 0 
        ? `Previous conversation:\n${conversationContext}\n\nCurrent question: ${question}`
        : null;

      const result = await aiAnalysisService.analyzeData(
        dataToAnalyze,
        question,
        'general',
        sessionId,
        selectedBackend,
        contextPrompt
      );

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        question: question,
        result: result,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Analysis error:', error);
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
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`message message-${message.type}`}>
                {message.type === 'user' && (
                  <div className="user-message">
                    <span className="message-icon">👤</span>
                    <div className="message-content">{message.content}</div>
                  </div>
                )}
                
                {message.type === 'assistant' && (
                  <div className="assistant-message">
                    <span className="message-icon">🤖</span>
                    <div className="message-content">
                      <AIAnalysisResults
                        analysisResult={message.result}
                        originalData={initialData}
                        question={message.question}
                        isLoading={false}
                        showCompactInput={false}
                        showContextControl={false}
                        selectedBackend={selectedBackend}
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
            ))}
            
            {isAnalyzing && (
              <div className="message message-loading">
                <span className="message-icon">🤖</span>
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