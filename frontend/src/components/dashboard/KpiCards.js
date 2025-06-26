import React from 'react';

function formatNumber(num) {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

function formatPercentage(value) {
  return `${value.toFixed(1)}%`;
}

function calculatePercentageChange(current, previous) {
  if (!previous) return { value: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change),
    isPositive: change >= 0
  };
}

function KpiCards({ data, selectedChartKPI, setSelectedChartKPI }) {
  // Aggregate values from filtered data
  const aggregateData = data.reduce((acc, item) => {
    acc.revenue += item.revenue;
    acc.unitsSold += item.unitsSold;
    acc.billability += item.billability;
    acc.projectedWork += item.projectedWork;
    acc.revenueLW += item.revenueLW;
    acc.revenueLY += item.revenueLY;
    acc.unitsSoldLW += item.unitsSoldLW;
    acc.unitsSoldLY += item.unitsSoldLY;
    acc.billabilityLW += item.billabilityLW;
    acc.billabilityLY += item.billabilityLY;
    acc.projectedWorkLW += item.projectedWorkLW;
    acc.projectedWorkLY += item.projectedWorkLY;
    acc.count += 1;
    return acc;
  }, {
    revenue: 0, unitsSold: 0, billability: 0, projectedWork: 0,
    revenueLW: 0, revenueLY: 0, unitsSoldLW: 0, unitsSoldLY: 0,
    billabilityLW: 0, billabilityLY: 0, projectedWorkLW: 0, projectedWorkLY: 0,
    count: 0
  });

  // Average the billability since it's a percentage
  if (aggregateData.count > 0) {
    aggregateData.billability /= aggregateData.count;
    aggregateData.billabilityLW /= aggregateData.count;
    aggregateData.billabilityLY /= aggregateData.count;
  }

  const kpis = [
    {
      label: "Revenue",
      value: formatNumber(aggregateData.revenue),
      changeLW: calculatePercentageChange(aggregateData.revenue, aggregateData.revenueLW),
      changeLY: calculatePercentageChange(aggregateData.revenue, aggregateData.revenueLY)
    },
    {
      label: "Units Sold",
      value: aggregateData.unitsSold.toLocaleString(),
      changeLW: calculatePercentageChange(aggregateData.unitsSold, aggregateData.unitsSoldLW),
      changeLY: calculatePercentageChange(aggregateData.unitsSold, aggregateData.unitsSoldLY)
    },
    {
      label: "Billability",
      value: formatPercentage(aggregateData.billability),
      changeLW: calculatePercentageChange(aggregateData.billability, aggregateData.billabilityLW),
      changeLY: calculatePercentageChange(aggregateData.billability, aggregateData.billabilityLY)
    },
    {
      label: "Projected Work",
      value: aggregateData.projectedWork.toLocaleString(),
      changeLW: calculatePercentageChange(aggregateData.projectedWork, aggregateData.projectedWorkLW),
      changeLY: calculatePercentageChange(aggregateData.projectedWork, aggregateData.projectedWorkLY)
    }
  ];

  return (
    <div className="kpi-cards"> 
      {kpis.map(kpi => (
        <div
          key={kpi.label}
          className={`kpi-card ${selectedChartKPI === kpi.label ? 'active' : ''}`}
          onClick={() => setSelectedChartKPI(kpi.label)}
        >
          <h3>{kpi.label}</h3>
          <div className="value">{kpi.value}</div>
          <div className="comparisons">
            <span className={kpi.changeLW.isPositive ? 'positive-change' : 'negative-change'}>
              LW: {kpi.changeLW.isPositive ? '+' : '-'}{formatPercentage(kpi.changeLW.value)}
            </span>
            <span className={kpi.changeLY.isPositive ? 'positive-change' : 'negative-change'}>
              LY: {kpi.changeLY.isPositive ? '+' : '-'}{formatPercentage(kpi.changeLY.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default KpiCards;
