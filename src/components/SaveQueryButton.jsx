import React, { useState } from 'react';
import savedQueriesService from '../services/savedQueriesService';
import './SaveQueryButton.css';

const SaveQueryButton = ({ question, results, dataSource }) => {
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const queryData = {
      question,
      description,
      category,
      dataSource,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      results: results ? {
        summary: results.analysis,
        hasTable: !!results.results_table,
        hasVisualization: !!results.visualization,
        timestamp: new Date().toISOString()
      } : null
    };

    savedQueriesService.saveQuery(queryData);
    setSaved(true);
    
    // Reset after a moment
    setTimeout(() => {
      setShowModal(false);
      setSaved(false);
      setDescription('');
      setTags('');
    }, 1500);
  };

  const categories = ['General', 'Sales Analysis', 'Operations', 'Customer Analytics', 'Quality Control', 'Financial Analysis'];

  return (
    <>
      <button 
        className="save-query-btn"
        onClick={() => setShowModal(true)}
        title="Save this query for future use"
      >
        💾 Save Query
      </button>

      {showModal && (
        <div className="save-query-overlay" onClick={() => setShowModal(false)}>
          <div className="save-query-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💾 Save Query for Future Use</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {!saved ? (
              <>
                <div className="modal-body">
                  <div className="query-preview">
                    <label>Query:</label>
                    <p className="query-text">{question}</p>
                  </div>

                  <div className="form-group">
                    <label>Description (optional):</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a description to help others understand this query..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Category:</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tags (comma-separated):</label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., shipping, cost analysis, monthly report"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="cancel-btn" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button className="save-btn" onClick={handleSave}>
                    Save Query
                  </button>
                </div>
              </>
            ) : (
              <div className="save-success">
                <div className="success-icon">✅</div>
                <h4>Query Saved Successfully!</h4>
                <p>You can access it from the Saved Queries library</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SaveQueryButton;