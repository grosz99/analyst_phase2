import React, { useState } from 'react';
import './Tabs.css';

const Tabs = ({ children }) => {
  const [activeTab, setActiveTab] = useState(children[0].props.label);

  const handleClick = (e, newActiveTab) => {
    e.preventDefault();
    setActiveTab(newActiveTab);
  };

  return (
    <div className="tabs">
      <ul className="nav nav-tabs">
        {children.map(child => (
          <li key={child.props.label} className={activeTab === child.props.label ? 'active' : ''}>
            <a href="#" onClick={e => handleClick(e, child.props.label)}>
              {child.props.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="tab-content">
        {children.map(child => {
          if (child.props.label === activeTab) {
            return <div key={child.props.label}>{child.props.children}</div>;
          }
          return null;
        })}
      </div>
    </div>
  );
};

const Tab = ({ label, children }) => {
  return (
    <div label={label} className="tab-pane">
      {children}
    </div>
  );
};

export { Tabs, Tab };
