"""
Intelligent Tableau Dashboard Converter - Main Streamlit Application
"""
import streamlit as st
import pandas as pd
import zipfile
import io
import os
import json
import logging
from pathlib import Path
from datetime import datetime
import traceback

# Import our modules
from src.parsers.twbx_parser import TWBXParser, WorkbookStructure
from src.translators.formula_translator import TableauFormulaTranslator
from src.validation.snowflake_validator import SnowflakeValidator, SuperstoreMetrics
from src.agents.extraction_agent import ExtractionAgent
from src.generators.streamlit_generator import StreamlitGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Page config
st.set_page_config(
    page_title="Tableau Dashboard Converter",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main {
        padding-top: 2rem;
    }
    .stButton>button {
        width: 100%;
        border-radius: 0.5rem;
        height: 3rem;
        font-weight: 600;
    }
    .upload-box {
        border: 2px dashed #ccc;
        border-radius: 1rem;
        padding: 2rem;
        text-align: center;
        margin: 1rem 0;
    }
    .metric-card {
        background: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
    .success-box {
        background: #d4edda;
        border: 1px solid #c3e6cb;
        padding: 1rem;
        border-radius: 0.5rem;
        color: #155724;
    }
    .error-box {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        padding: 1rem;
        border-radius: 0.5rem;
        color: #721c24;
    }
</style>
""", unsafe_allow_html=True)


def main():
    # Header
    st.title("🎯 Intelligent Tableau Dashboard Converter")
    st.markdown("Convert Tableau workbooks to Streamlit apps with AI-powered formula extraction and data validation")
    
    # Sidebar
    with st.sidebar:
        st.header("⚙️ Configuration")
        
        output_framework = st.selectbox(
            "Output Framework",
            ["Streamlit (Current)", "React (Future)", "Tableau (Future)"],
            help="Currently testing Streamlit generation. React and Tableau coming soon!"
        )
        
        chart_library = st.selectbox(
            "Visualization Library",
            ["Plotly", "Altair", "Matplotlib"],
            help="Select chart library for visualizations"
        )
        
        validate_data = st.checkbox(
            "Validate with Snowflake",
            value=True,
            help="Compare calculations against source data"
        )
        
        st.divider()
        
        st.header("📊 About")
        st.info(
            "**Current Prototype (v1.0)**\n\n"
            "✅ **Streamlit Generation**: Extract formulas → Generate Streamlit apps\n"
            "✅ **Data Validation**: Compare against Snowflake source data\n"
            "✅ **AI Translation**: Tableau formulas → Python/Pandas\n\n"
            "🚧 **Coming Soon**: React and Tableau output options"
        )
    
    # Main content
    tabs = st.tabs(["📁 Upload Files", "🔍 Analysis", "🚀 Generate", "✅ Validation"])
    
    # Tab 1: Upload Files
    with tabs[0]:
        st.header("Step 1: Upload Your Files")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.subheader("📊 Tableau Workbook")
            twbx_file = st.file_uploader(
                "Upload .twbx file",
                type=['twbx', 'twb'],
                key="twbx_upload",
                help="Your Tableau packaged workbook"
            )
            
            if twbx_file:
                st.success(f"✓ Uploaded: {twbx_file.name}")
                file_size = len(twbx_file.getvalue()) / 1024 / 1024
                st.caption(f"Size: {file_size:.2f} MB")
        
        with col2:
            st.subheader("📂 Data Source (Optional)")
            data_file = st.file_uploader(
                "Upload data file",
                type=['csv', 'xlsx', 'json'],
                key="data_upload",
                help="Optional: Replace embedded data"
            )
            
            if data_file:
                st.success(f"✓ Uploaded: {data_file.name}")
        
        with col3:
            st.subheader("🖼️ Reference Image")
            reference_image = st.file_uploader(
                "Upload dashboard screenshot",
                type=['png', 'jpg', 'jpeg'],
                key="image_upload",
                help="For visual validation"
            )
            
            if reference_image:
                st.success(f"✓ Uploaded: {reference_image.name}")
                st.image(reference_image, width=200)
        
        # Process button
        if twbx_file:
            if st.button("🔍 Analyze Workbook", type="primary", use_container_width=True):
                process_workbook(twbx_file, data_file, reference_image, validate_data)
    
    # Tab 2: Analysis Results
    with tabs[1]:
        st.header("Step 2: Workbook Analysis")
        
        if 'workbook_structure' in st.session_state:
            display_analysis_results(st.session_state.workbook_structure)
        else:
            st.info("👆 Upload a Tableau workbook to begin analysis")
    
    # Tab 3: Generate Application
    with tabs[2]:
        st.header("Step 3: Generate Application")
        
        if 'workbook_structure' in st.session_state:
            if output_framework == "Streamlit (Current)":
                if st.button("🚀 Generate Streamlit App", type="primary", use_container_width=True):
                    generate_application(
                        st.session_state.workbook_structure,
                        "Streamlit",
                        chart_library
                    )
            else:
                st.info(f"🚧 {output_framework} generation coming in future release!")
                st.write("**Current prototype focuses on:**")
                st.write("• Formula extraction and translation")
                st.write("• Data validation against Snowflake")
                st.write("• Streamlit app generation")
                
                if st.button("🚀 Generate Streamlit App (Demo)", type="secondary", use_container_width=True):
                    generate_application(
                        st.session_state.workbook_structure,
                        "Streamlit",
                        chart_library
                    )
        else:
            st.info("👆 Complete workbook analysis first")
    
    # Tab 4: Validation Results
    with tabs[3]:
        st.header("Step 4: Data Validation")
        
        if 'validation_results' in st.session_state:
            display_validation_results(st.session_state.validation_results)
        else:
            st.info("👆 Generate application to see validation results")


def process_workbook(twbx_file, data_file, reference_image, validate_data):
    """Process uploaded Tableau workbook"""
    try:
        with st.spinner("🔍 Parsing Tableau workbook..."):
            # Initialize parser
            parser = TWBXParser()
            
            # Save uploaded file temporarily
            temp_path = Path("temp") / twbx_file.name
            temp_path.parent.mkdir(exist_ok=True)
            
            with open(temp_path, "wb") as f:
                f.write(twbx_file.getvalue())
            
            # Parse workbook
            workbook_structure = parser.parse(str(temp_path))
            
            # Store in session state
            st.session_state.workbook_structure = workbook_structure
            
            # Clean up
            temp_path.unlink()
        
        st.success("✅ Workbook parsed successfully!")
        
        # Extract and translate formulas
        with st.spinner("🧮 Extracting and translating formulas..."):
            translator = TableauFormulaTranslator()
            translated_formulas = {}
            
            for calc_name, calculation in workbook_structure.calculations.items():
                try:
                    translation = translator.translate(calculation.formula)
                    translated_formulas[calc_name] = translation
                    logger.info(f"Translated {calc_name}: {calculation.formula} -> {translation.pandas_expression}")
                except Exception as e:
                    logger.error(f"Failed to translate {calc_name}: {e}")
                    translated_formulas[calc_name] = None
            
            st.session_state.translated_formulas = translated_formulas
        
        # Validate against Snowflake if enabled
        if validate_data:
            validate_calculations(workbook_structure, translated_formulas)
        
        # Show summary
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Dashboards", len(workbook_structure.dashboards))
        with col2:
            st.metric("Worksheets", len(workbook_structure.worksheets))
        with col3:
            st.metric("Calculations", len(workbook_structure.calculations))
        with col4:
            st.metric("Data Sources", len(workbook_structure.datasources))
        
    except Exception as e:
        st.error(f"❌ Error processing workbook: {str(e)}")
        st.code(traceback.format_exc())


def display_analysis_results(workbook: WorkbookStructure):
    """Display detailed analysis results"""
    
    # Calculations section
    st.subheader("📊 Extracted Calculations")
    
    if workbook.calculations:
        calc_df = []
        for name, calc in workbook.calculations.items():
            calc_df.append({
                'Name': name,
                'Formula': calc.formula,
                'Type': calc.calculation_type,
                'Data Type': calc.data_type,
                'Is LOD': '✓' if calc.is_lod else '',
                'Dependencies': ', '.join(calc.dependencies)
            })
        
        df = pd.DataFrame(calc_df)
        st.dataframe(df, use_container_width=True, height=300)
        
        # Show translated formulas if available
        if 'translated_formulas' in st.session_state:
            st.subheader("🔄 Formula Translations")
            
            for calc_name, translation in st.session_state.translated_formulas.items():
                if translation:
                    with st.expander(f"📐 {calc_name}"):
                        col1, col2 = st.columns(2)
                        
                        with col1:
                            st.markdown("**Original Tableau Formula:**")
                            st.code(workbook.calculations[calc_name].formula, language="sql")
                        
                        with col2:
                            st.markdown("**Translated Python/Pandas:**")
                            st.code(translation.pandas_expression, language="python")
                        
                        if translation.is_window_function:
                            st.info("ℹ️ This is a window function")
                        
                        if translation.requires_aggregation:
                            st.warning("⚠️ Requires aggregation")
    
    # Worksheets section
    st.subheader("📈 Worksheets")
    
    for ws_name, worksheet in workbook.worksheets.items():
        with st.expander(f"📊 {worksheet.title}"):
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("**Calculations Used:**")
                for calc in worksheet.calculations:
                    st.write(f"• {calc.name}")
            
            with col2:
                st.markdown("**Visualizations:**")
                for mark in worksheet.marks:
                    st.write(f"• {mark.get('class', 'Unknown')} chart")
    
    # Dashboards section
    st.subheader("📱 Dashboards")
    
    for dash_name, dashboard in workbook.dashboards.items():
        with st.expander(f"🎯 {dashboard.title}"):
            st.write(f"Size: {dashboard.size['width']} x {dashboard.size['height']}")
            st.write(f"Worksheets: {', '.join(dashboard.worksheets)}")


def validate_calculations(workbook: WorkbookStructure, translated_formulas: dict):
    """Validate calculations against Snowflake"""
    try:
        with st.spinner("🔍 Validating calculations against Snowflake..."):
            validator = SnowflakeValidator()
            
            # Validate predefined metrics
            results = validator.validate_tableau_metrics(SuperstoreMetrics.METRICS)
            
            st.session_state.validation_results = results
            
            # Show quick summary
            valid_count = sum(1 for r in results if r.is_valid)
            total_count = len(results)
            
            if valid_count == total_count:
                st.success(f"✅ All {total_count} metrics validated successfully!")
            else:
                st.warning(f"⚠️ {valid_count}/{total_count} metrics passed validation")
            
            validator.close()
            
    except Exception as e:
        st.error(f"❌ Validation error: {str(e)}")
        logger.error(f"Validation failed: {traceback.format_exc()}")


def display_validation_results(results: list):
    """Display detailed validation results"""
    
    st.subheader("📊 Metric Validation Results")
    
    # Summary metrics
    col1, col2, col3 = st.columns(3)
    
    valid_count = sum(1 for r in results if r.is_valid)
    total_count = len(results)
    
    with col1:
        st.metric("Total Metrics", total_count)
    with col2:
        st.metric("Passed", valid_count, delta=f"{valid_count/total_count*100:.1f}%")
    with col3:
        st.metric("Failed", total_count - valid_count)
    
    # Detailed results
    st.subheader("📋 Detailed Results")
    
    for result in results:
        if result.is_valid:
            with st.expander(f"✅ {result.metric_name}", expanded=False):
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Expected:** {result.expected_value}")
                with col2:
                    st.write(f"**Actual:** {result.actual_value}")
                
                if result.difference is not None:
                    st.write(f"**Difference:** {result.difference:.6f}")
        else:
            with st.expander(f"❌ {result.metric_name}", expanded=True):
                st.error(f"**Error:** {result.error_message}")
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Expected:** {result.expected_value}")
                with col2:
                    st.write(f"**Actual:** {result.actual_value}")


def generate_application(workbook: WorkbookStructure, framework: str, chart_library: str):
    """Generate the output application"""
    try:
        with st.spinner(f"🚀 Generating {framework} application..."):
            # For now, show a preview
            st.info("🚧 Application generation in progress...")
            
            # Generate sample code
            sample_code = generate_sample_streamlit_code(workbook, chart_library)
            
            st.subheader("📝 Generated Code Preview")
            st.code(sample_code, language="python")
            
            # Download button
            st.download_button(
                label="📥 Download Generated App",
                data=sample_code,
                file_name="generated_dashboard.py",
                mime="text/plain"
            )
            
    except Exception as e:
        st.error(f"❌ Generation error: {str(e)}")


def generate_sample_streamlit_code(workbook: WorkbookStructure, chart_library: str) -> str:
    """Generate sample Streamlit code"""
    # This is a simplified version - full implementation would use templates
    code = f'''"""
Generated Streamlit Dashboard
Created from: {list(workbook.dashboards.values())[0].title if workbook.dashboards else "Tableau Workbook"}
Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""

import streamlit as st
import pandas as pd
import {chart_library.lower()} as viz

# Page config
st.set_page_config(
    page_title="Generated Dashboard",
    page_icon="📊",
    layout="wide"
)

# Load data (replace with your data source)
@st.cache_data
def load_data():
    # TODO: Connect to your data source
    return pd.DataFrame()

def main():
    st.title("📊 Generated Dashboard")
    
    # Load data
    df = load_data()
    
    # Sidebar filters
    st.sidebar.header("Filters")
    
    # Main content
'''

    # Add worksheets
    for ws_name, worksheet in workbook.worksheets.items():
        code += f'''
    # Worksheet: {worksheet.title}
    st.subheader("{worksheet.title}")
    
    # TODO: Implement visualization
    
'''
    
    code += '''
if __name__ == "__main__":
    main()
'''
    
    return code


if __name__ == "__main__":
    main()