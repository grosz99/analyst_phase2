import React, { useState, useEffect } from 'react';
import './SimpleDateRangeFilter.css';

const SimpleDateRangeFilter = ({ filterType, onDateRangeChange }) => {
  // Initialize with reasonable defaults
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentDay = String(currentDate.getDate()).padStart(2, '0');

  const [fromDate, setFromDate] = useState(`${currentYear - 1}-${currentMonth}-${currentDay}`);
  const [toDate, setToDate] = useState(`${currentYear}-${currentMonth}-${currentDay}`);

  // Update parent component when date range changes
  useEffect(() => {
    onDateRangeChange({
      filterType,
      from: fromDate,
      to: toDate
    });
  }, [fromDate, toDate, filterType, onDateRangeChange]);

  // Quick presets for common date ranges
  const applyPreset = (preset) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = String(today.getDate()).padStart(2, '0');

    switch (preset) {
      case 'last30days':
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        setFromDate(`${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`);
        setToDate(`${currentYear}-${currentMonth}-${currentDay}`);
        break;
      case 'last90days':
        const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        setFromDate(`${ninetyDaysAgo.getFullYear()}-${String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(ninetyDaysAgo.getDate()).padStart(2, '0')}`);
        setToDate(`${currentYear}-${currentMonth}-${currentDay}`);
        break;
      case 'ytd':
        setFromDate(`${currentYear}-01-01`);
        setToDate(`${currentYear}-${currentMonth}-${currentDay}`);
        break;
      case 'lastYear':
        setFromDate(`${currentYear - 1}-01-01`);
        setToDate(`${currentYear - 1}-12-31`);
        break;
    }
  };

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Validation to ensure from date is not after to date
  const isValidDateRange = () => {
    return new Date(fromDate) <= new Date(toDate);
  };

  const getFilterTitle = () => {
    return filterType === 'snapshot_date' ? 'Snapshot Date Range' : 'Open Date Range';
  };

  const getFilterDescription = () => {
    return filterType === 'snapshot_date' 
      ? 'Select the snapshot date range for pipeline data'
      : 'Select the open date range for pipeline opportunities';
  };

  return (
    <div className="simple-date-range-filter-container">
      <div className="simple-date-range-header">
        <h3>{getFilterTitle()}</h3>
        {!isValidDateRange() && (
          <span className="validation-error">From date must be before to date</span>
        )}
      </div>

      <p className="filter-description">{getFilterDescription()}</p>

      {/* Quick Presets */}
      <div className="simple-date-presets">
        <span className="preset-label">Quick select:</span>
        <button onClick={() => applyPreset('last30days')} className="preset-button">
          Last 30 Days
        </button>
        <button onClick={() => applyPreset('last90days')} className="preset-button">
          Last 90 Days
        </button>
        <button onClick={() => applyPreset('ytd')} className="preset-button">
          Year to Date
        </button>
        <button onClick={() => applyPreset('lastYear')} className="preset-button">
          Last Year
        </button>
      </div>

      <div className="simple-date-selectors">
        {/* From Date */}
        <div className="date-input-group">
          <label className="date-input-label">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="date-input"
          />
          <div className="formatted-date">{formatDateForDisplay(fromDate)}</div>
        </div>

        <div className="date-range-arrow">→</div>

        {/* To Date */}
        <div className="date-input-group">
          <label className="date-input-label">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="date-input"
          />
          <div className="formatted-date">{formatDateForDisplay(toDate)}</div>
        </div>
      </div>

      {/* Selected Range Summary */}
      <div className="selected-range-summary">
        <strong>Selected Range:</strong> {formatDateForDisplay(fromDate)} to {formatDateForDisplay(toDate)}
      </div>

      {/* Demo Notice */}
      <div className="demo-notice">
        <small>📝 Note: This is a demo filter for display purposes</small>
      </div>
    </div>
  );
};

export default SimpleDateRangeFilter;