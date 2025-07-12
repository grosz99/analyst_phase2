import React, { useState, useEffect } from 'react';
import savedQueriesService from '../services/savedQueriesService';
import './SavedQueries.css';

const SavedQueries = ({ onSelectQuery, onClose }) => {
  const [queries, setQueries] = useState([]);
  const [filteredQueries, setFilteredQueries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('all'); // all, favorites, popular, recent
  const [categories, setCategories] = useState(['All']);

  useEffect(() => {
    loadQueries();
    loadCategories();
  }, []);

  useEffect(() => {
    filterQueries();
  }, [queries, searchTerm, selectedCategory, viewMode]);

  const loadQueries = () => {
    const allQueries = savedQueriesService.getAllQueries();
    setQueries(allQueries);
  };

  const loadCategories = () => {
    const cats = savedQueriesService.getCategories();
    setCategories(['All', ...cats]);
  };

  const filterQueries = () => {
    let filtered = [...queries];

    // Apply view mode filter
    switch (viewMode) {
      case 'favorites':
        filtered = savedQueriesService.getFavoriteQueries();
        break;
      case 'popular':
        filtered = savedQueriesService.getPopularQueries(10);
        break;
      case 'recent':
        filtered = savedQueriesService.getRecentQueries(10);
        break;
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = savedQueriesService.searchQueries(searchTerm);
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(q => q.category === selectedCategory);
      }
    }

    setFilteredQueries(filtered);
  };

  const handleSelectQuery = (query) => {
    savedQueriesService.markAsUsed(query.id);
    onSelectQuery(query);
  };

  const handleToggleFavorite = (e, queryId) => {
    e.stopPropagation();
    savedQueriesService.toggleFavorite(queryId);
    loadQueries();
  };

  const handleDeleteQuery = (e, queryId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this saved query?')) {
      savedQueriesService.deleteQuery(queryId);
      loadQueries();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="saved-queries-overlay" onClick={onClose}>
      <div className="saved-queries-modal" onClick={(e) => e.stopPropagation()}>
        <div className="saved-queries-header">
          <h2>📚 Saved Queries Library</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="saved-queries-controls">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search saved queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-section">
            <div className="view-mode-tabs">
              <button 
                className={`tab ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                All Queries
              </button>
              <button 
                className={`tab ${viewMode === 'favorites' ? 'active' : ''}`}
                onClick={() => setViewMode('favorites')}
              >
                ⭐ Favorites
              </button>
              <button 
                className={`tab ${viewMode === 'popular' ? 'active' : ''}`}
                onClick={() => setViewMode('popular')}
              >
                🔥 Popular
              </button>
              <button 
                className={`tab ${viewMode === 'recent' ? 'active' : ''}`}
                onClick={() => setViewMode('recent')}
              >
                🕐 Recent
              </button>
            </div>

            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="saved-queries-list">
          {filteredQueries.length === 0 ? (
            <div className="empty-state">
              <p>No saved queries found</p>
              <p className="empty-hint">Try adjusting your filters or search term</p>
            </div>
          ) : (
            filteredQueries.map(query => (
              <div 
                key={query.id} 
                className="saved-query-card"
                onClick={() => handleSelectQuery(query)}
              >
                <div className="query-header">
                  <div className="query-title-section">
                    <h3 className="query-question">{query.question}</h3>
                    <div className="query-meta">
                      <span className="category-badge">{query.category}</span>
                      {query.dataSource && (
                        <span className="datasource-badge">📊 {query.dataSource}</span>
                      )}
                      <span className="usage-count">Used {query.usageCount || 0} times</span>
                    </div>
                  </div>
                  <div className="query-actions">
                    <button 
                      className={`favorite-btn ${query.isFavorite ? 'active' : ''}`}
                      onClick={(e) => handleToggleFavorite(e, query.id)}
                      title="Toggle favorite"
                    >
                      ⭐
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={(e) => handleDeleteQuery(e, query.id)}
                      title="Delete query"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {query.description && (
                  <p className="query-description">{query.description}</p>
                )}
                
                {/* Show saved analysis preview if available */}
                {query.results && (
                  <div className="query-results-preview">
                    <div className="results-indicators">
                      {query.results.hasTable && (
                        <span className="result-badge">📊 Data Table</span>
                      )}
                      {query.results.hasVisualization && (
                        <span className="result-badge">📈 Chart</span>
                      )}
                      {query.results.pythonCode && (
                        <span className="result-badge">🐍 Python Code</span>
                      )}
                    </div>
                    {query.results.pythonCode && (
                      <div className="python-code-preview">
                        <pre className="code-snippet">
                          {query.results.pythonCode.split('\n').slice(0, 3).join('\n')}
                          {query.results.pythonCode.split('\n').length > 3 && '\n...'}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="query-footer">
                  <div className="query-tags">
                    {query.tags.map((tag, index) => (
                      <span key={index} className="tag">#{tag}</span>
                    ))}
                  </div>
                  <div className="query-info">
                    <span className="created-by">By {query.createdBy}</span>
                    <span className="date">
                      {query.lastUsed 
                        ? `Last used ${formatDate(query.lastUsed)}`
                        : `Created ${formatDate(query.createdAt)}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="saved-queries-footer">
          <p className="storage-info">
            💾 {queries.length} queries saved locally • In production, these would sync to your account
          </p>
        </div>
      </div>
    </div>
  );
};

export default SavedQueries;