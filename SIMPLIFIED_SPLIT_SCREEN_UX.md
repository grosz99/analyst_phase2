# Simplified Split-Screen Data Discovery UX

## Layout: Clean Two-Panel Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│  ○ Browse Data Sources    ● Find Right Data                         │
├─────────────────────────────┬───────────────────────────────────────┤
│       LEFT (40%)            │         RIGHT (60%)                   │
│                             │                                       │
│ BROWSE MODE (Current Grid)  │  📋 Live Preview                      │
│ ┌─ 📊 CUSTOMERS_DATA ─────┐ │  ┌─ Hover/Click to see details ────  │
│ │ Customer demographics   │ │  │                                   │
│ │ 150K rows              │ │  │     Select a dataset on the        │
│ │ Updated 2h ago         │ │  │     left to preview its            │
│ │                        │ │  │     columns and sample data        │
│ └─────────────────────────┘ │  │                                   │
│                             │  └─────────────────────────────────── │
│ ┌─ 📈 SALES_DATA ────────┐ │                                       │
│ │ Transaction records     │ │  ON HOVER: Quick column list          │
│ │ 2.4M rows             │ │  ON CLICK: Full preview + nav to       │
│ │ Updated 15m ago        │ │           filters page                │
│ └─────────────────────────┘ │                                       │
│                             │                                       │
│ SEARCH MODE                 │                                       │
│ ┌─ 🔍 Search fields...   ─┐ │                                       │
│ │ customer, sales, region │ │                                       │
│ └─────────────────────────┘ │                                       │
│                             │                                       │
│ Search Results:             │                                       │
│ ✅ CUSTOMERS_DATA (3 fields)│                                       │
│ ✅ SALES_DATA (2 fields)    │                                       │
│                             │                                       │
└─────────────────────────────┴───────────────────────────────────────┘
```

## User Interactions

### **Browse Mode (Left Panel)**
- **Current Grid**: Keep existing dataset cards exactly as they are today
- **No Changes**: Remove usage indicators, keep it clean and simple
- **Hover Effect**: Right panel shows quick column preview
- **Click Effect**: Right panel shows full details, then navigates to filters page

### **Right Panel Behavior**

#### **Default State (No Selection)**
```
┌─ Preview Panel ─────────────────────────────────────────┐
│                                                         │
│              👆 Select a dataset                        │
│                                                         │
│     Hover over a dataset to see its columns            │
│     Click to preview and proceed to analysis           │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### **On Hover (Quick Preview)**
```
┌─ CUSTOMERS_DATA ────────────────────────────────────────┐
│ 📋 Columns (7 total)                                   │
│                                                         │
│ • CUSTOMER_ID                                          │
│ • CUSTOMER_NAME                                        │
│ • CUSTOMER_SEGMENT                                     │
│ • CUSTOMER_EMAIL                                       │
│ • REGISTRATION_DATE                                    │
│ • LIFETIME_VALUE                                       │
│ • REGION                                               │
│                                                         │
│ 👆 Click to select and continue                        │
└─────────────────────────────────────────────────────────┘
```

#### **On Click (Full Preview Before Navigation)**
```
┌─ CUSTOMERS_DATA Selected ───────────────────────────────┐
│ 📊 150,000 rows • Updated 2 hours ago                  │
│                                                         │
│ 📋 Columns & Types                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ CUSTOMER_ID      │ Number  │ Primary Key            │ │
│ │ CUSTOMER_NAME    │ Text    │ Full customer name     │ │
│ │ CUSTOMER_SEGMENT │ Text    │ Business/Consumer      │ │
│ │ CUSTOMER_EMAIL   │ Text    │ Contact information    │ │
│ │ REGISTRATION_DATE│ Date    │ Account created        │ │
│ │ LIFETIME_VALUE   │ Number  │ Total customer value   │ │
│ │ REGION          │ Text    │ Geographic location    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🔍 Sample Data (3 rows)                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ID │ NAME      │ SEGMENT  │ EMAIL       │ REGION   │ │
│ │ 1  │ John S.   │ Corp     │ js@corp.com │ West     │ │
│ │ 2  │ Jane D.   │ Consumer │ jane@em.com │ East     │ │
│ │ 3  │ Bob J.    │ Corp     │ bob@biz.com │ Central  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [ 📊 Continue to Filters & Analysis ]                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Search Mode (Left Panel)**
```
┌─ Find Right Data ───────────────────────────────────────┐
│                                                         │
│ 🔍 Search for fields or concepts                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ customer revenue profit region                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 💡 Try: customer_id, sales, region, profit             │
│                                                         │
│ 📋 Results for "customer":                             │
│                                                         │
│ ✅ CUSTOMERS_DATA                                      │
│    3 matching columns                                  │
│    [👆 Click to preview]                               │
│                                                         │
│ ✅ SALES_TRANSACTIONS                                  │
│    2 matching columns                                  │
│    [👆 Click to preview]                               │
│                                                         │
│ ✅ ORDER_HISTORY                                       │
│    1 matching column                                   │
│    [👆 Click to preview]                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Flow Summary

### **Browse Mode Flow:**
1. User sees current dataset grid (no changes)
2. **Hover** → Right panel shows quick column list
3. **Click** → Right panel shows full preview with sample data
4. **"Continue"** → Navigates to filters page (existing flow)

### **Search Mode Flow:**
1. User types field names in search
2. Left panel shows matching datasets
3. **Hover** → Right panel shows which columns matched
4. **Click** → Right panel shows full preview with sample data  
5. **"Continue"** → Navigates to filters page (existing flow)

## Key Benefits

### **Minimal Changes**
- Keep existing browse grid exactly as is
- Add search mode as enhancement
- Right panel is pure addition, no disruption

### **Progressive Disclosure**
- Hover = Quick peek
- Click = Full details
- Continue = Proceed to analysis

### **Consistent Navigation**
- Both modes end at the same filters page
- No change to existing user flow after dataset selection
- Right panel just adds preview capability

## Technical Implementation

```jsx
const DataSourcesPage = () => {
  const [mode, setMode] = useState('browse');
  const [hoveredDataset, setHoveredDataset] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const handleDatasetClick = (dataset) => {
    setSelectedDataset(dataset);
    // Show full preview in right panel
  };

  const handleContinue = (dataset) => {
    // Navigate to existing filters page
    navigate(`/filters/${dataset.id}`);
  };

  return (
    <div className="split-panel-container">
      <div className="mode-selector">
        <input type="radio" checked={mode === 'browse'} onChange={() => setMode('browse')} />
        <label>Browse Data Sources</label>
        <input type="radio" checked={mode === 'search'} onChange={() => setMode('search')} />
        <label>Find Right Data</label>
      </div>

      <div className="panels">
        <div className="left-panel">
          {mode === 'browse' ? (
            <ExistingDataSourcesGrid 
              onHover={setHoveredDataset}
              onClick={handleDatasetClick}
            />
          ) : (
            <FieldSearchInterface 
              onResults={setSearchResults}
              onHover={setHoveredDataset}
              onClick={handleDatasetClick}
            />
          )}
        </div>

        <div className="right-panel">
          <DatasetPreviewPanel 
            hovered={hoveredDataset}
            selected={selectedDataset}
            onContinue={handleContinue}
          />
        </div>
      </div>
    </div>
  );
};
```

This approach keeps your existing browse experience intact while adding the smart search capability users will appreciate for the demo feedback.