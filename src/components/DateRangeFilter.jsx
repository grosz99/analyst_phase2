import React, { useState, useEffect } from 'react';
import './DateRangeFilter.css';

const DateRangeFilter = ({ onDateRangeChange, selectedDataSource }) => {
  // Initialize with current date values
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const [fromDate, setFromDate] = useState({
    year: currentYear,
    month: currentMonth,
    week: 1
  });
  
  const [toDate, setToDate] = useState({
    year: currentYear,
    month: currentMonth,
    week: 4
  });

  // Generate years (last 5 years)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  // Months with proper names
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  // Reporting weeks (typically 1-4, but can be 5 for some months)
  const weeks = [
    { value: 1, label: 'Week 1' },
    { value: 2, label: 'Week 2' },
    { value: 3, label: 'Week 3' },
    { value: 4, label: 'Week 4' },
    { value: 5, label: 'Week 5' }
  ];

  // Update parent component when date range changes
  useEffect(() => {
    onDateRangeChange({
      from: fromDate,
      to: toDate,
      fromFormatted: formatDate(fromDate),
      toFormatted: formatDate(toDate)
    });
  }, [fromDate, toDate]);

  const formatDate = (date) => {
    const monthName = months.find(m => m.value === date.month)?.label || '';
    return `${monthName} Week ${date.week}, ${date.year}`;
  };

  const handleFromChange = (field, value) => {
    setFromDate(prev => ({
      ...prev,
      [field]: parseInt(value)
    }));
  };

  const handleToChange = (field, value) => {
    setToDate(prev => ({
      ...prev,
      [field]: parseInt(value)
    }));
  };

  // Quick presets for common date ranges
  const applyPreset = (preset) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    switch (preset) {
      case 'currentMonth':
        setFromDate({ year: currentYear, month: currentMonth, week: 1 });
        setToDate({ year: currentYear, month: currentMonth, week: 4 });
        break;
      case 'lastMonth':
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        setFromDate({ year: lastMonthYear, month: lastMonth, week: 1 });
        setToDate({ year: lastMonthYear, month: lastMonth, week: 4 });
        break;
      case 'currentQuarter':
        const quarterStart = Math.floor((currentMonth - 1) / 3) * 3 + 1;
        setFromDate({ year: currentYear, month: quarterStart, week: 1 });
        setToDate({ year: currentYear, month: currentMonth, week: 4 });
        break;
      case 'ytd':
        setFromDate({ year: currentYear, month: 1, week: 1 });
        setToDate({ year: currentYear, month: currentMonth, week: 4 });
        break;
      case 'lastYear':
        setFromDate({ year: currentYear - 1, month: 1, week: 1 });
        setToDate({ year: currentYear - 1, month: 12, week: 4 });
        break;
    }
  };

  // Validation to ensure from date is not after to date
  const isValidDateRange = () => {
    if (fromDate.year > toDate.year) return false;
    if (fromDate.year === toDate.year) {
      if (fromDate.month > toDate.month) return false;
      if (fromDate.month === toDate.month && fromDate.week > toDate.week) return false;
    }
    return true;
  };

  return (
    <div className="date-range-filter-container">
      <div className="date-range-header">
        <h3>Reporting Date Range</h3>
        {!isValidDateRange() && (
          <span className="validation-error">Invalid date range</span>
        )}
      </div>

      {/* Quick Presets */}
      <div className="date-presets">
        <span className="preset-label">Quick select:</span>
        <button onClick={() => applyPreset('currentMonth')} className="preset-button">
          Current Month
        </button>
        <button onClick={() => applyPreset('lastMonth')} className="preset-button">
          Last Month
        </button>
        <button onClick={() => applyPreset('currentQuarter')} className="preset-button">
          Current Quarter
        </button>
        <button onClick={() => applyPreset('ytd')} className="preset-button">
          Year to Date
        </button>
        <button onClick={() => applyPreset('lastYear')} className="preset-button">
          Last Year
        </button>
      </div>

      <div className="date-range-selectors">
        {/* From Date Selector */}
        <div className="date-selector">
          <label className="date-label">From Reporting Date</label>
          <div className="date-inputs">
            <select 
              value={fromDate.month} 
              onChange={(e) => handleFromChange('month', e.target.value)}
              className="date-select month-select"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            
            <select 
              value={fromDate.week} 
              onChange={(e) => handleFromChange('week', e.target.value)}
              className="date-select week-select"
            >
              {weeks.map(week => (
                <option key={week.value} value={week.value}>
                  {week.label}
                </option>
              ))}
            </select>
            
            <select 
              value={fromDate.year} 
              onChange={(e) => handleFromChange('year', e.target.value)}
              className="date-select year-select"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="formatted-date">{formatDate(fromDate)}</div>
        </div>

        <div className="date-range-separator">→</div>

        {/* To Date Selector */}
        <div className="date-selector">
          <label className="date-label">To Reporting Date</label>
          <div className="date-inputs">
            <select 
              value={toDate.month} 
              onChange={(e) => handleToChange('month', e.target.value)}
              className="date-select month-select"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            
            <select 
              value={toDate.week} 
              onChange={(e) => handleToChange('week', e.target.value)}
              className="date-select week-select"
            >
              {weeks.map(week => (
                <option key={week.value} value={week.value}>
                  {week.label}
                </option>
              ))}
            </select>
            
            <select 
              value={toDate.year} 
              onChange={(e) => handleToChange('year', e.target.value)}
              className="date-select year-select"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="formatted-date">{formatDate(toDate)}</div>
        </div>
      </div>

      {/* Selected Range Summary */}
      <div className="selected-range-summary">
        <strong>Selected Range:</strong> {formatDate(fromDate)} to {formatDate(toDate)}
      </div>
    </div>
  );
};

export default DateRangeFilter;