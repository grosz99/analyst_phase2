# Claude Code Context: Intelligent Tableau Dashboard Converter

## Project Overview
Build an AI-powered Streamlit web application that converts Tableau workbooks (.twbx files) into either Streamlit or React dashboards using multi-agent LLM processing and computer vision validation. The system accepts dashboard images for visual validation and optional data sources for enhanced accuracy.

## Enhanced Workflow Implementation

### Step 1: Multi-Modal Input Interface
Create a Streamlit web application that handles:
- .twbx file uploads with validation
- Optional data source uploads (CSV/Excel/JSON)
- Dashboard reference image uploads
- Framework selection (Streamlit vs React)
- Configuration options (styling, chart libraries)

### Step 2: AI Agent Orchestration
Implement specialized Anthropic Claude agents:
- **Extraction Agent**: Parse .twbx files and extract all worksheet dependencies
- **Visual Validation Agent**: Analyze reference images and compare outputs
- **Schema Mapping Agent**: Align uploaded data with Tableau field definitions  
- **Generation Agent**: Create framework-specific applications
- **UX Optimization Agent**: Ensure visual fidelity and accessibility

### Step 3: Intelligent Output Generation
Generate production-ready applications with:
- Visual similarity validation against reference images
- Comprehensive data integration
- Framework-optimized components
- Deployment-ready packages

## Core Implementation Architecture

### Main Streamlit Application (`app.py`)
```python
import streamlit as st
import zipfile
import pandas as pd
from pathlib import Path
from agents import (
    TableauExtractionAgent, 
    VisualValidationAgent, 
    FrameworkGenerationAgent,
    UXOptimizationAgent,
    SchemaMapperAgent
)
from utils import process_twbx, validate_data_source, preprocess_image

st.set_page_config(
    page_title="Intelligent Tableau Converter",
    page_icon="📊",
    layout="wide"
)

def main():
    st.title("🎯 Intelligent Tableau Dashboard Converter")
    st.markdown("Convert Tableau dashboards to Streamlit or React with AI-powered visual validation")
    
    # Step 1: Multi-Modal Input Collection
    with st.container():
        st.header("📁 Step 1: Upload Files")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.subheader("Tableau Workbook")
            twbx_file = st.file_uploader(
                "Upload .twbx file",
                type=['twbx'],
                help="Upload your Tableau packaged workbook"
            )
        
        with col2:
            st.subheader("Data Source (Optional)")
            data_file = st.file_uploader(
                "Upload data source",
                type=['csv', 'xlsx', 'json'],
                help="Optional: Upload data to replace Tableau's embedded data"
            )
        
        with col3:
            st.subheader("Reference Image")
            reference_image = st.file_uploader(
                "Upload dashboard screenshot",
                type=['png', 'jpg', 'jpeg'],
                help="Upload a screenshot of your target dashboard for visual validation"
            )
    
    # Step 2: Configuration Options
    if twbx_file:
        st.header("⚙️ Step 2: Configuration")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            output_framework = st.selectbox(
                "Output Framework",
                ["Streamlit", "React"],
                help="Choose your preferred output framework"
            )
        
        with col2:
            chart_library = st.selectbox(
                "Chart Library",
                ["Plotly", "Altair", "Matplotlib"] if output_framework == "Streamlit" 
                else ["Recharts", "Chart.js", "D3.js"],
                help="Select visualization library"
            )
        
        with col3:
            styling_option = st.selectbox(
                "Styling",
                ["Default Theme", "Dark Theme", "Custom"] if output_framework == "Streamlit"
                else ["Tailwind CSS", "Material-UI", "Styled Components"],
                help="Choose styling approach"
            )
        
        # Step 3: Processing Pipeline
        if st.button("🚀 Start Conversion", type="primary"):
            process_conversion(
                twbx_file, data_file, reference_image,
                output_framework, chart_library, styling_option
            )

def process_conversion(twbx_file, data_file, reference_image, 
                      output_framework, chart_library, styling_option):
    """Main conversion pipeline with AI agents"""
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    # Initialize AI agents
    extraction_agent = TableauExtractionAgent()
    visual_agent = VisualValidationAgent()
    schema_agent = SchemaMapperAgent()
    generation_agent = FrameworkGenerationAgent()
    ux_agent = UXOptimizationAgent()
    
    try:
        # Phase 1: Extract Tableau Components
        status_text.text("🔍 Extracting Tableau workbook components...")
        workbook_data = extraction_agent.extract_workbook_components(twbx_file)
        progress_bar.progress(20)
        
        # Phase 2: Process Data Sources
        if data_file:
            status_text.text("🔗 Mapping data source schema...")
            data_schema = schema_agent.map_data_to_tableau_fields(data_file, workbook_data)
        else:
            data_schema = workbook_data.embedded_data
        progress_bar.progress(40)
        
        # Phase 3: Analyze Reference Image
        if reference_image:
            status_text.text("👁️ Analyzing reference image layout...")
            layout_analysis = visual_agent.analyze_reference_image(reference_image)
        else:
            layout_analysis = None
        progress_bar.progress(60)
        
        # Phase 4: Generate Application
        status_text.text(f"⚡ Generating {output_framework} application...")
        generated_app = generation_agent.generate_application(
            workbook_data, data_schema, layout_analysis,
            output_framework, chart_library, styling_option
        )
        progress_bar.progress(80)
        
        # Phase 5: Visual Validation & UX Optimization
        if reference_image:
            status_text.text("✨ Validating visual similarity and optimizing UX...")
            validation_results = visual_agent.validate_output(generated_app, reference_image)
            optimized_app = ux_agent.optimize_application(generated_app, validation_results)
        else:
            optimized_app = ux_agent.optimize_application(generated_app, None)
        
        progress_bar.progress(100)
        status_text.text("✅ Conversion completed successfully!")
        
        # Display Results
        display_results(optimized_app, validation_results if reference_image else None)
        
    except Exception as e:
        st.error(f"❌ Conversion failed: {str(e)}")
        st.exception(e)

def display_results(generated_app, validation_results):
    """Display conversion results and download options"""
    
    st.header("🎉 Conversion Results")
    
    if validation_results:
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Visual Similarity", f"{validation_results.similarity_score:.1%}")
        with col2:
            st.metric("Layout Accuracy", f"{validation_results.layout_accuracy:.1%}")
        with col3:
            st.metric("Color Matching", f"{validation_results.color_accuracy:.1%}")
    
    # Preview Generated Application
    st.subheader("📱 Application Preview")
    
    if generated_app.framework == "Streamlit":
        st.code(generated_app.preview_code, language="python")
    else:
        st.code(generated_app.preview_code, language="typescript")
    
    # Download Options
    st.subheader("📥 Download Generated Application")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.download_button(
            "📦 Download Complete Application",
            data=generated_app.package_zip,
            file_name=f"{generated_app.name}.zip",
            mime="application/zip"
        )
    
    with col2:
        st.download_button(
            "📋 Download Deployment Instructions",
            data=generated_app.deployment_guide,
            file_name="deployment_guide.md",
            mime="text/markdown"
        )

if __name__ == "__main__":
    main()
```

### AI Agent Implementation (`agents/extraction_agent.py`)
```python
import anthropic
import xml.etree.ElementTree as ET
import zipfile
import json
from dataclasses import dataclass
from typing import List, Dict, Any
import pandas as pd

@dataclass
class WorkbookStructure:
    metadata: Dict[str, Any]
    dashboards: List[Dict]
    worksheets: List[Dict]
    datasources: List[Dict]
    calculations: List[Dict]
    embedded_data: pd.DataFrame

class TableauExtractionAgent:
    def __init__(self):
        self.client = anthropic.Anthropic()
    
    def extract_workbook_components(self, twbx_file) -> WorkbookStructure:
        """Extract all components from .twbx file with AI assistance"""
        
        # Extract .twbx contents
        with zipfile.ZipFile(twbx_file, 'r') as zip_file:
            # Find the .twb file
            twb_file = None
            for filename in zip_file.namelist():
                if filename.endswith('.twb'):
                    twb_file = filename
                    break
            
            if not twb_file:
                raise ValueError("No .twb file found in .twbx package")
            
            # Extract XML content
            xml_content = zip_file.read(twb_file).decode('utf-8')
            
            # Extract embedded data files
            data_files = {}
            for filename in zip_file.namelist():
                if filename.startswith('Data/') and filename.endswith(('.csv', '.hyper')):
                    data_files[filename] = zip_file.read(filename)
        
        # Parse XML with AI assistance
        parsed_workbook = self._parse_xml_with_ai(xml_content)
        
        # Extract all dashboard dependencies
        dashboard_dependencies = self._extract_dashboard_dependencies(parsed_workbook)
        
        # Process embedded data
        embedded_data = self._process_embedded_data(data_files)
        
        return WorkbookStructure(
            metadata=parsed_workbook['metadata'],
            dashboards=parsed_workbook['dashboards'],
            worksheets=dashboard_dependencies,
            datasources=parsed_workbook['datasources'],
            calculations=parsed_workbook['calculations'],
            embedded_data=embedded_data
        )
    
    def _parse_xml_with_ai(self, xml_content: str) -> Dict[str, Any]:
        """Use Claude to intelligently parse Tableau XML"""
        
        prompt = f"""
        Parse this Tableau workbook XML and extract the key components. Focus on:
        1. Workbook metadata (name, version, author)
        2. All dashboards and their layouts
        3. All worksheets (especially those used in dashboards)
        4. Data source definitions and field mappings
        5. Calculated fields with their formulas
        6. Dashboard zone layouts and positioning
        
        Return a structured JSON with these components clearly organized.
        
        XML Content:
        {xml_content[:10000]}...  # Truncate for token limits
        """
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            return json.loads(response.content[0].text)
        except json.JSONDecodeError:
            # Fallback to manual parsing
            return self._manual_xml_parse(xml_content)
    
    def _extract_dashboard_dependencies(self, parsed_workbook: Dict) -> List[Dict]:
        """Extract all worksheets that feed into dashboards"""
        
        dashboard_worksheets = set()
        
        for dashboard in parsed_workbook.get('dashboards', []):
            for zone in dashboard.get('zones', []):
                if zone.get('type') == 'worksheet':
                    worksheet_name = zone.get('name')
                    if worksheet_name:
                        dashboard_worksheets.add(worksheet_name)
        
        # Filter worksheets to only include those used in dashboards
        relevant_worksheets = []
        for worksheet in parsed_workbook.get('worksheets', []):
            if worksheet.get('name') in dashboard_worksheets:
                relevant_worksheets.append(worksheet)
        
        return relevant_worksheets
    
    def _process_embedded_data(self, data_files: Dict) -> pd.DataFrame:
        """Process embedded data files from .twbx"""
        
        combined_data = pd.DataFrame()
        
        for filename, file_data in data_files.items():
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_data))
                combined_data = pd.concat([combined_data, df], ignore_index=True)
            elif filename.endswith('.hyper'):
                # Handle Tableau Hyper files (requires tableauhyperapi)
                # For now, skip or implement basic extraction
                pass
        
        return combined_data
```

### Visual Validation Agent (`agents/visual_validation_agent.py`)
```python
import anthropic
import cv2
import numpy as np
from PIL import Image
import base64
import io
from dataclasses import dataclass

@dataclass
class ValidationResults:
    similarity_score: float
    layout_accuracy: float
    color_accuracy: float
    recommendations: List[str]

@dataclass
class LayoutStructure:
    components: List[Dict]
    layout_grid: Dict
    color_scheme: Dict
    typography: Dict

class VisualValidationAgent:
    def __init__(self):
        self.client = anthropic.Anthropic()
    
    def analyze_reference_image(self, image_file) -> LayoutStructure:
        """Analyze reference image to extract layout structure"""
        
        # Convert image to base64 for Claude Vision
        image = Image.open(image_file)
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        prompt = """
        Analyze this Tableau dashboard image and extract:
        1. Layout structure (grid positions, component sizes)
        2. Color scheme (primary colors, backgrounds, accents)
        3. Chart types and their positions
        4. Typography (titles, labels, font sizes)
        5. Overall design patterns and spacing
        
        Return a detailed JSON structure describing the visual layout.
        """
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=3000,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": img_base64
                        }
                    }
                ]
            }]
        )
        
        analysis = json.loads(response.content[0].text)
        
        return LayoutStructure(
            components=analysis.get('components', []),
            layout_grid=analysis.get('layout_grid', {}),
            color_scheme=analysis.get('color_scheme', {}),
            typography=analysis.get('typography', {})
        )
    
    def validate_output(self, generated_app, reference_image) -> ValidationResults:
        """Compare generated application against reference image"""
        
        # Generate screenshot of the app (would need browser automation)
        generated_screenshot = self._generate_app_screenshot(generated_app)
        
        # Use computer vision for similarity comparison
        similarity_score = self._calculate_visual_similarity(
            reference_image, generated_screenshot
        )
        
        # Use Claude for detailed analysis
        recommendations = self._get_ai_recommendations(
            reference_image, generated_screenshot, generated_app
        )
        
        return ValidationResults(
            similarity_score=similarity_score,
            layout_accuracy=self._calculate_layout_accuracy(reference_image, generated_screenshot),
            color_accuracy=self._calculate_color_accuracy(reference_image, generated_screenshot),
            recommendations=recommendations
        )
    
    def _calculate_visual_similarity(self, ref_image, gen_image) -> float:
        """Calculate structural similarity between images"""
        
        # Convert to OpenCV format
        ref_cv = cv2.cvtColor(np.array(Image.open(ref_image)), cv2.COLOR_RGB2BGR)
        gen_cv = cv2.cvtColor(np.array(gen_image), cv2.COLOR_RGB2BGR)
        
        # Resize to same dimensions
        height, width = ref_cv.shape[:2]
        gen_cv = cv2.resize(gen_cv, (width, height))
        
        # Calculate SSIM (Structural Similarity Index)
        from skimage.metrics import structural_similarity as ssim
        gray_ref = cv2.cvtColor(ref_cv, cv2.COLOR_BGR2GRAY)
        gray_gen = cv2.cvtColor(gen_cv, cv2.COLOR_BGR2GRAY)
        
        similarity = ssim(gray_ref, gray_gen)
        return similarity
```

### Framework Generation Agent (`agents/generation_agent.py`)
```python
import anthropic
from jinja2 import Environment, FileSystemLoader
import os
from dataclasses import dataclass

@dataclass
class GeneratedApplication:
    framework: str
    name: str
    preview_code: str
    package_zip: bytes
    deployment_guide: str

class FrameworkGenerationAgent:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.jinja_env = Environment(loader=FileSystemLoader('templates'))
    
    def generate_application(self, workbook_data, data_schema, layout_analysis,
                           output_framework, chart_library, styling_option) -> GeneratedApplication:
        """Generate complete application based on framework choice"""
        
        if output_framework == "Streamlit":
            return self._generate_streamlit_app(
                workbook_data, data_schema, layout_analysis, chart_library, styling_option
            )
        else:
            return self._generate_react_app(
                workbook_data, data_schema, layout_analysis, chart_library, styling_option
            )
    
    def _generate_streamlit_app(self, workbook_data, data_schema, layout_analysis,
                               chart_library, styling_option) -> GeneratedApplication:
        """Generate complete Streamlit application"""
        
        # Use Claude to generate intelligent component mapping
        component_mapping = self._get_streamlit_component_mapping(
            workbook_data, chart_library
        )
        
        # Generate main app file
        main_app = self.jinja_env.get_template('streamlit_app.py.j2').render(
            workbook=workbook_data,
            components=component_mapping,
            chart_library=chart_library,
            styling=styling_option,
            layout=layout_analysis
        )
        
        # Generate utility files
        data_processing = self._generate_data_processing(workbook_data, data_schema)
        calculations = self._generate_calculations(workbook_data.calculations)
        
        # Package everything
        package_zip = self._create_streamlit_package(
            main_app, data_processing, calculations, workbook_data
        )
        
        return GeneratedApplication(
            framework="Streamlit",
            name=workbook_data.metadata.get('name', 'dashboard'),
            preview_code=main_app,
            package_zip=package_zip,
            deployment_guide=self._generate_streamlit_deployment_guide()
        )
    
    def _get_streamlit_component_mapping(self, workbook_data, chart_library) -> Dict:
        """Use AI to intelligently map Tableau components to Streamlit"""
        
        prompt = f"""
        Map these Tableau worksheet components to appropriate Streamlit components:
        
        Worksheets: {workbook_data.worksheets}
        Chart Library: {chart_library}
        
        For each worksheet, suggest:
        1. Best Streamlit component (st.plotly_chart, st.altair_chart, etc.)
        2. Data transformation needed
        3. Interactive elements (filters, selectors)
        4. Layout recommendations
        
        Return as structured JSON mapping.
        """
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return json.loads(response.content[0].text)
```

### Streamlit App Template (`templates/streamlit_app.py.j2`)
```python
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from utils.data_processing import load_and_process_data
from utils.calculations import CalculatedFields

# Page configuration
st.set_page_config(
    page_title="{{ workbook.metadata.name }}",
    page_icon="📊",
    layout="wide"
)

# Load and process data
@st.cache_data
def load_data():
    return load_and_process_data()

def main():
    st.title("{{ workbook.metadata.name }}")
    
    # Load data
    data = load_data()
    calc_fields = CalculatedFields(data)
    
    # Sidebar filters
    st.sidebar.header("Filters")
    
    {% for filter in workbook.filters %}
    {{ filter.name|lower }}_filter = st.sidebar.selectbox(
        "{{ filter.name }}",
        options=data['{{ filter.field }}'].unique(),
        key="{{ filter.name|lower }}"
    )
    {% endfor %}
    
    # Apply filters
    filtered_data = data.copy()
    {% for filter in workbook.filters %}
    if {{ filter.name|lower }}_filter:
        filtered_data = filtered_data[filtered_data['{{ filter.field }}'] == {{ filter.name|lower }}_filter]
    {% endfor %}
    
    # Dashboard layout
    {% if layout and layout.layout_grid %}
    {% for row in layout.layout_grid.rows %}
    col_specs = st.columns({{ row.columns|length }})
    {% for col_idx, component in enumerate(row.columns) %}
    with col_specs[{{ col_idx }}]:
        {% if component.type == 'chart' %}
        render_{{ component.name|replace(' ', '_')|lower }}(filtered_data, calc_fields)
        {% endif %}
    {% endfor %}
    {% endfor %}
    {% else %}
    # Default layout
    {% for worksheet in workbook.worksheets %}
    render_{{ worksheet.name|replace(' ', '_')|lower }}(filtered_data, calc_fields)
    {% endfor %}
    {% endif %}

{% for worksheet in workbook.worksheets %}
def render_{{ worksheet.name|replace(' ', '_')|lower }}(data, calc_fields):
    st.subheader("{{ worksheet.name }}")
    
    {% set component = components[worksheet.name] %}
    {% if component.chart_type == 'bar' %}
    fig = px.bar(
        data,
        x="{{ component.x_field }}",
        y="{{ component.y_field }}",
        {% if component.color_field %}color="{{ component.color_field }}",{% endif %}
        title="{{ worksheet.name }}"
    )
    st.plotly_chart(fig, use_container_width=True)
    
    {% elif component.chart_type == 'line' %}
    fig = px.line(
        data,
        x="{{ component.x_field }}",
        y="{{ component.y_field }}",
        {% if component.color_field %}color="{{ component.color_field }}",{% endif %}
        title="{{ worksheet.name }}"
    )
    st.plotly_chart(fig, use_container_width=True)
    
    {% elif component.chart_type == 'scatter' %}
    fig = px.scatter(
        data,
        x="{{ component.x_field }}",
        y="{{ component.y_field }}",
        {% if component.size_field %}size="{{ component.size_field }}",{% endif %}
        {% if component.color_field %}color="{{ component.color_field }}",{% endif %}
        title="{{ worksheet.name }}"
    )
    st.plotly_chart(fig, use_container_width=True)
    
    {% else %}
    # Table view
    st.dataframe(data, use_container_width=True)
    {% endif %}
    
{% endfor %}

if __name__ == "__main__":
    main()
```

This enhanced implementation provides:

1. **Multi-modal input handling** with .twbx, data sources, and reference images
2. **AI agent orchestration** using Anthropic Claude for intelligent processing
3. **Visual validation** using computer vision and AI analysis
4. **Dual framework support** for both Streamlit and React output
5. **Production-ready packages** with deployment guides

The system ensures high-fidelity conversion by validating against reference images and using specialized AI agents for each aspect of the conversion process.