# Excel Export Fix for Results Tables

## Issue
Excel export button was missing from Results tables in individual analysis results, and exports weren't unique per question.

## Root Cause
The `AIAnalysisResults.jsx` component was rendering a custom table instead of using the `ResultsTable` component that includes the Excel export functionality.

## Solution Applied

### 1. Import ResultsTable Component
```jsx
import ResultsTable from './ResultsTable';
```

### 2. Replace Custom Table with ResultsTable Component
- Modified `renderResultsTable()` function to use the actual `ResultsTable` component
- Converted data format to match ResultsTable expectations
- Added unique titles per question: `Q1: sales by region in 2016...`

### 3. Unique Export Filenames
- **Excel exports**: Now include question context in filename
- **PowerPoint exports**: Now include question number and context
- Format: `Q1_sales_by_region_in_2016_2024-07-03T14-27-00.xlsx`

### 4. Removed CSS Conflicts
- Removed duplicate `.results-table` styles from `AIAnalysisResults.css`
- Now uses styles from `ResultsTable.css` which include the export button styling

## Changes Made

### Files Modified:
1. **`src/components/AIAnalysisResults.jsx`**
   - Added ResultsTable import
   - Replaced custom table rendering with ResultsTable component
   - Added unique title generation per question
   - Updated PowerPoint export filenames

2. **`src/components/AIAnalysisResults.css`**
   - Removed conflicting results-table styles
   - Now defers to ResultsTable.css for proper styling

## Result

✅ **Excel Export Button**: Now appears in every Results table  
✅ **Unique Per Question**: Each question gets its own export with descriptive filename  
✅ **Consistent Styling**: Uses the proper ResultsTable component styling  
✅ **PowerPoint Export**: Also has unique filenames per question  

## Usage
- Each analysis result now has an "📊 Export to Excel" button in the Results tab
- Filenames include question number and content for easy identification
- Both Excel and PowerPoint exports are unique per question

## Example Filenames
- Excel: `Q1_sales_by_region_in_2016_2024-07-03T14-27-00.xlsx`
- PowerPoint: `Q1_sales_by_region_in_2016_2024-07-03T14-27-00.pptx`