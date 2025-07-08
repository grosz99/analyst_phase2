# Split-Screen Data Discovery UX Design

## Layout Concept: Two-Panel Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│  Data Sources                                                       │
│  ○ Browse Data Sources    ● Find Right Data                         │
│                                                                     │
├──────────────────────────────┬──────────────────────────────────────┤
│         LEFT PANEL           │           RIGHT PANEL                │
│        (40% width)           │          (60% width)                 │
│                              │                                      │
│  MODE 1: Browse Sources      │  📋 Available Columns                │
│  ┌─────────────────────────┐ │  ┌─────────────────────────────────┐ │
│  │ 📊 CUSTOMERS_DATA      │ │  │ CUSTOMER_ID (Primary Key)       │ │
│  │ 150K rows • Updated 2h  │ │  │ CUSTOMER_NAME                   │ │
│  │ [Select]               │ │  │ CUSTOMER_SEGMENT                │ │
│  └─────────────────────────┘ │  │ CUSTOMER_EMAIL                  │ │
│                              │  │ REGISTRATION_DATE               │ │
│  ┌─────────────────────────┐ │  │ LIFETIME_VALUE                  │ │
│  │ 📈 SALES_DATA          │ │  │ REGION                          │ │
│  │ 2.4M rows • Active      │ │  └─────────────────────────────────┘ │
│  │ [Select]               │ │                                      │
│  └─────────────────────────┘ │  🔍 Sample Data (5 rows)            │
│                              │  ┌─────────────────────────────────┐ │
│  MODE 2: Search Fields      │  │ ID │ NAME    │ SEGMENT │ EMAIL   │ │
│  ┌─────────────────────────┐ │  │ 1  │ John... │ Corp    │ j@...   │ │
│  │ 🔍 customer, sales...   │ │  │ 2  │ Jane... │ Consumer│ ja@...  │ │
│  └─────────────────────────┘ │  └─────────────────────────────────┘ │
│                              │                                      │
│  Results:                    │  [ 📊 Start Analysis ]               │
│  • CUSTOMERS_DATA (3 matches)│                                      │
│  • SALES_DATA (2 matches)   │                                      │
│                              │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
```

## Radio Button Modes

### **Mode 1: "Browse Data Sources"** (Traditional)
- **Left Panel**: Grid/list of available datasets
- **Right Panel**: Shows columns + sample data for selected dataset
- **Interaction**: Click dataset → See its schema and preview
- **Use Case**: "I want to explore what data is available"

### **Mode 2: "Find Right Data"** (Search-First)
- **Left Panel**: Search interface + smart results
- **Right Panel**: Shows columns from ALL matching datasets
- **Interaction**: Search field name → See which tables contain it
- **Use Case**: "I need customer data but don't know which table"

## Detailed UX Specifications

### **Left Panel - Browse Mode:**
```
┌─ Data Sources Available ─────────────────────┐
│                                              │
│ 🔍 [Filter sources...]                      │
│                                              │
│ ┌─ 📊 CUSTOMERS_DATA ──────────────────────┐ │
│ │ Customer demographics & segments          │ │
│ │ 📊 150,000 rows • Updated 2 hours ago    │ │
│ │ 👥 Last used by Marketing Team           │ │
│ │ [Select This Dataset]                    │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌─ 📈 SALES_TRANSACTIONS ─────────────────┐ │
│ │ Individual sales records & orders         │ │
│ │ 📊 2,400,000 rows • Updated 15 min ago  │ │
│ │ 🔥 Currently active                      │ │
│ │ [Select This Dataset]                    │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### **Left Panel - Search Mode:**
```
┌─ Find Your Data ─────────────────────────────┐
│                                              │
│ 🔍 Search fields, concepts, business terms   │
│ ┌──────────────────────────────────────────┐ │
│ │ customer revenue profit region...        │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ 💡 Popular Searches:                        │
│ [customer_id] [sales] [region] [profit]     │
│                                              │
│ 📋 Results for "customer":                  │
│                                              │
│ ✅ CUSTOMERS_DATA (3 matching columns)      │
│    • CUSTOMER_ID, CUSTOMER_NAME...          │
│                                              │
│ ✅ SALES_TRANSACTIONS (2 matching columns)  │
│    • CUSTOMER_ID, CUSTOMER_SEGMENT...       │
│                                              │
│ ✅ ORDER_HISTORY (1 matching column)        │
│    • CUSTOMER_ID                            │
│                                              │
└──────────────────────────────────────────────┘
```

### **Right Panel - Universal:**
```
┌─ Dataset Details ────────────────────────────────────────┐
│                                                          │
│ 📋 Columns in CUSTOMERS_DATA                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ ✓ CUSTOMER_ID        │ Number  │ Primary Key         │ │
│ │ ✓ CUSTOMER_NAME      │ Text    │ Full name           │ │
│ │ ✓ CUSTOMER_SEGMENT   │ Text    │ Business/Consumer   │ │
│ │ ✓ CUSTOMER_EMAIL     │ Text    │ Contact email       │ │
│ │ ✓ REGISTRATION_DATE  │ Date    │ Account created     │ │
│ │ ✓ LIFETIME_VALUE     │ Number  │ Total spent         │ │
│ │ ✓ REGION            │ Text    │ Geographic area     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ 🔍 Sample Data (5 records preview)                      │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ ID │ NAME        │ SEGMENT   │ EMAIL        │ VALUE │ │
│ │ 1  │ John Smith  │ Corporate │ js@corp.com  │ 5200  │ │
│ │ 2  │ Jane Doe    │ Consumer  │ jane@em.com  │ 890   │ │
│ │ 3  │ Bob Johnson │ Corporate │ bob@biz.com  │ 12400 │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [ 📊 Start Analysis with This Data ]                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Advanced Features

### **Smart Cross-Reference (Search Mode)**
When user searches "customer", the right panel shows:
- **Columns found**: All customer-related columns across ALL datasets
- **Join opportunities**: "CUSTOMER_ID appears in 3 tables - can be joined"
- **Relationship map**: Visual showing how tables connect via this field

### **Progressive Disclosure**
- **Basic view**: Just column names and types
- **Detailed view**: Descriptions, sample values, data quality metrics
- **Advanced view**: Lineage, usage statistics, related fields

## Implementation Benefits

### **User Choice & Flexibility**
- Accommodates both discovery styles (browse vs search)
- Familiar radio button pattern sets clear expectations
- Users can switch modes based on their current need

### **Information Architecture**
- Left panel: Navigation/filtering
- Right panel: Details/preview  
- Clear separation of concerns
- Consistent layout regardless of mode

### **Progressive Enhancement**
- Start with basic browse mode (existing functionality)
- Add search mode as enhancement
- Right panel provides consistent preview experience

## Technical Implementation

```jsx
const DataDiscoveryPage = () => {
  const [mode, setMode] = useState('browse'); // 'browse' | 'search'
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  return (
    <div className="data-discovery-container">
      <div className="mode-selector">
        <input 
          type="radio" 
          id="browse" 
          checked={mode === 'browse'}
          onChange={() => setMode('browse')}
        />
        <label htmlFor="browse">Browse Data Sources</label>
        
        <input 
          type="radio" 
          id="search" 
          checked={mode === 'search'}
          onChange={() => setMode('search')}
        />
        <label htmlFor="search">Find Right Data</label>
      </div>

      <div className="split-panel-container">
        <div className="left-panel">
          {mode === 'browse' ? (
            <DataSourcesBrowser onSelect={setSelectedDataset} />
          ) : (
            <FieldSearchInterface onResults={setSearchResults} />
          )}
        </div>

        <div className="right-panel">
          <DatasetDetailsPanel 
            dataset={selectedDataset}
            searchResults={mode === 'search' ? searchResults : null}
          />
        </div>
      </div>
    </div>
  );
};
```

This approach gives users the best of both worlds - traditional browsing for exploration and smart search for targeted discovery.