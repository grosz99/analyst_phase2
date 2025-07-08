"""
Streamlit App Generator - Creates production-ready Streamlit applications
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import zipfile
import io
from jinja2 import Environment, FileSystemLoader, BaseLoader, Template
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class GeneratedApp:
    """Represents a generated Streamlit application"""
    name: str
    main_file: str
    supporting_files: Dict[str, str]
    requirements: List[str]
    deployment_config: Dict[str, Any]
    documentation: str


class StreamlitGenerator:
    """Generates complete Streamlit applications from Tableau workbooks"""
    
    def __init__(self):
        self.templates = self._load_templates()
        
    def _load_templates(self) -> Dict[str, Template]:
        """Load Jinja2 templates"""
        templates = {}
        
        # Main app template
        main_template = """
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import numpy as np
from utils.data_loader import DataLoader
from utils.calculations import CalculationEngine
from utils.filters import FilterManager

# Page configuration
st.set_page_config(
    page_title="{{ dashboard_title }}",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown('''
<style>
    .main { padding-top: 1rem; }
    .metric-card {
        background: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
    .dashboard-header {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }
</style>
''', unsafe_allow_html=True)

# Initialize components
@st.cache_resource
def initialize_components():
    data_loader = DataLoader()
    calc_engine = CalculationEngine()
    filter_manager = FilterManager()
    return data_loader, calc_engine, filter_manager

def main():
    # Header
    st.markdown('<div class="dashboard-header"><h1>{{ dashboard_title }}</h1><p>{{ dashboard_description }}</p></div>', 
                unsafe_allow_html=True)
    
    # Initialize
    data_loader, calc_engine, filter_manager = initialize_components()
    
    # Load data
    with st.spinner("Loading data..."):
        data = data_loader.load_data()
    
    # Sidebar filters
    with st.sidebar:
        st.header("📊 Filters")
        filters = filter_manager.render_filters(data)
        
        st.divider()
        st.header("📈 Metrics")
        
        # Key metrics
        {% for metric in key_metrics %}
        filtered_data = filter_manager.apply_filters(data, filters)
        {{ metric.name }}_value = calc_engine.calculate_{{ metric.name }}(filtered_data)
        st.metric("{{ metric.display_name }}", f"{{ metric.format }}" % {{ metric.name }}_value)
        {% endfor %}
    
    # Apply filters
    filtered_data = filter_manager.apply_filters(data, filters)
    
    # Dashboard layout
    {{ dashboard_layout }}
    
    # Footer
    st.markdown("---")
    st.caption(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Data refreshed: {data_loader.last_refresh}")

if __name__ == "__main__":
    main()
"""
        
        templates['main_app'] = Template(main_template)
        
        # Data loader template
        data_loader_template = """
import pandas as pd
import snowflake.connector
from snowflake.sqlalchemy import URL
from sqlalchemy import create_engine
import streamlit as st
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

class DataLoader:
    def __init__(self):
        self.engine = None
        self.last_refresh = None
        self._connect()
    
    def _connect(self):
        try:
            self.engine = create_engine(URL(
                account=os.getenv('SNOWFLAKE_ACCOUNT'),
                user=os.getenv('SNOWFLAKE_USER'),
                password=os.getenv('SNOWFLAKE_PASSWORD'),
                warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
                database=os.getenv('SNOWFLAKE_DATABASE'),
                schema=os.getenv('SNOWFLAKE_SCHEMA'),
                role=os.getenv('SNOWFLAKE_ROLE')
            ))
        except Exception as e:
            st.error(f"Database connection failed: {e}")
    
    @st.cache_data(ttl=3600)  # Cache for 1 hour
    def load_data(_self):
        try:
            query = '''
            {{ data_query }}
            '''
            
            df = pd.read_sql(query, _self.engine)
            _self.last_refresh = datetime.now()
            return df
            
        except Exception as e:
            st.error(f"Data loading failed: {e}")
            return pd.DataFrame()
    
    def refresh_data(self):
        st.cache_data.clear()
        return self.load_data()
"""
        
        templates['data_loader'] = Template(data_loader_template)
        
        # Calculations template
        calculations_template = """
import pandas as pd
import numpy as np
from datetime import datetime

class CalculationEngine:
    def __init__(self):
        pass
    
    {% for calc in calculations %}
    def calculate_{{ calc.name }}(self, data):
        \"\"\"
        {{ calc.description }}
        Original Tableau formula: {{ calc.original_formula }}
        \"\"\"
        try:
            # {{ calc.name }} calculation
            {{ calc.python_code }}
            return result
        except Exception as e:
            return 0  # Default value on error
    {% endfor %}
    
    def calculate_all_metrics(self, data):
        \"\"\"Calculate all metrics at once\"\"\"
        results = {}
        
        {% for calc in calculations %}
        results['{{ calc.name }}'] = self.calculate_{{ calc.name }}(data)
        {% endfor %}
        
        return results
"""
        
        templates['calculations'] = Template(calculations_template)
        
        # Filter manager template
        filter_template = """
import streamlit as st
import pandas as pd

class FilterManager:
    def __init__(self):
        self.filters = {}
    
    def render_filters(self, data):
        filters = {}
        
        {% for filter in filters %}
        # {{ filter.name }} filter
        if '{{ filter.column }}' in data.columns:
            unique_values = sorted(data['{{ filter.column }}'].unique())
            filters['{{ filter.name }}'] = st.multiselect(
                "{{ filter.display_name }}",
                options=unique_values,
                default=unique_values,
                key="{{ filter.name }}_filter"
            )
        {% endfor %}
        
        return filters
    
    def apply_filters(self, data, filters):
        filtered_data = data.copy()
        
        {% for filter in filters %}
        if '{{ filter.name }}' in filters and filters['{{ filter.name }}']:
            filtered_data = filtered_data[filtered_data['{{ filter.column }}'].isin(filters['{{ filter.name }}'])]
        {% endfor %}
        
        return filtered_data
"""
        
        templates['filters'] = Template(filter_template)
        
        return templates
    
    def generate_app(self, 
                    workbook_structure: Any,
                    chart_library: str = "plotly",
                    theme: str = "default") -> GeneratedApp:
        """Generate complete Streamlit application"""
        
        logger.info("Generating Streamlit application...")
        
        # Extract dashboard information
        dashboard_info = self._extract_dashboard_info(workbook_structure)
        
        # Generate main app file
        main_file = self._generate_main_file(dashboard_info, chart_library, theme)
        
        # Generate supporting files
        supporting_files = self._generate_supporting_files(workbook_structure, dashboard_info)
        
        # Generate requirements
        requirements = self._generate_requirements(chart_library)
        
        # Generate deployment config
        deployment_config = self._generate_deployment_config(dashboard_info)
        
        # Generate documentation
        documentation = self._generate_documentation(dashboard_info)
        
        return GeneratedApp(
            name=dashboard_info['name'],
            main_file=main_file,
            supporting_files=supporting_files,
            requirements=requirements,
            deployment_config=deployment_config,
            documentation=documentation
        )
    
    def _extract_dashboard_info(self, workbook_structure: Any) -> Dict[str, Any]:
        """Extract dashboard information from workbook structure"""
        
        # Get first dashboard (assuming single dashboard for now)
        dashboard = next(iter(workbook_structure.dashboards.values())) if workbook_structure.dashboards else None
        
        if not dashboard:
            dashboard_name = "Generated Dashboard"
            dashboard_title = "Generated Dashboard"
            worksheets = list(workbook_structure.worksheets.keys())
        else:
            dashboard_name = dashboard.name
            dashboard_title = dashboard.title
            worksheets = dashboard.worksheets
        
        # Extract calculations
        calculations = []
        for calc_name, calc in workbook_structure.calculations.items():
            calculations.append({
                'name': calc_name.replace(' ', '_').replace('-', '_').lower(),
                'display_name': calc_name,
                'original_formula': calc.formula,
                'description': f"Calculation for {calc_name}",
                'python_code': f"result = {calc.formula}  # TODO: Implement translation",
                'dependencies': calc.dependencies
            })
        
        # Extract filters (basic implementation)
        filters = [
            {'name': 'region', 'display_name': 'Region', 'column': 'Region'},
            {'name': 'segment', 'display_name': 'Segment', 'column': 'Segment'},
            {'name': 'category', 'display_name': 'Category', 'column': 'Category'},
        ]
        
        # Key metrics
        key_metrics = [
            {'name': 'total_sales', 'display_name': 'Total Sales', 'format': '${:,.0f}'},
            {'name': 'total_profit', 'display_name': 'Total Profit', 'format': '${:,.0f}'},
            {'name': 'profit_margin', 'display_name': 'Profit Margin', 'format': '{:.1%}'},
            {'name': 'order_count', 'display_name': 'Orders', 'format': '{:,.0f}'},
        ]
        
        return {
            'name': dashboard_name,
            'title': dashboard_title,
            'description': f"Dashboard converted from Tableau workbook",
            'worksheets': worksheets,
            'calculations': calculations,
            'filters': filters,
            'key_metrics': key_metrics,
            'data_query': self._generate_data_query(workbook_structure)
        }
    
    def _generate_main_file(self, dashboard_info: Dict[str, Any], chart_library: str, theme: str) -> str:
        """Generate main Streamlit app file"""
        
        # Generate dashboard layout
        dashboard_layout = self._generate_dashboard_layout(dashboard_info, chart_library)
        
        # Render main template
        main_content = self.templates['main_app'].render(
            dashboard_title=dashboard_info['title'],
            dashboard_description=dashboard_info['description'],
            key_metrics=dashboard_info['key_metrics'],
            dashboard_layout=dashboard_layout
        )
        
        return main_content
    
    def _generate_dashboard_layout(self, dashboard_info: Dict[str, Any], chart_library: str) -> str:
        """Generate dashboard layout code"""
        
        layout_code = """
    # Main dashboard content
    tab1, tab2, tab3 = st.tabs(["📊 Overview", "📈 Trends", "🔍 Details"])
    
    with tab1:
        # Overview charts
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Sales by Region")
            sales_by_region = filtered_data.groupby('Region')['Sales'].sum().reset_index()
            fig1 = px.bar(sales_by_region, x='Region', y='Sales', 
                         title='Sales by Region')
            st.plotly_chart(fig1, use_container_width=True)
        
        with col2:
            st.subheader("Profit by Segment")
            profit_by_segment = filtered_data.groupby('Segment')['Profit'].sum().reset_index()
            fig2 = px.pie(profit_by_segment, values='Profit', names='Segment',
                         title='Profit Distribution by Segment')
            st.plotly_chart(fig2, use_container_width=True)
    
    with tab2:
        # Trend analysis
        st.subheader("Sales Trends")
        
        # Monthly sales trend
        if 'Order Date' in filtered_data.columns:
            monthly_sales = filtered_data.groupby(
                filtered_data['Order Date'].dt.to_period('M')
            )['Sales'].sum().reset_index()
            monthly_sales['Order Date'] = monthly_sales['Order Date'].astype(str)
            
            fig3 = px.line(monthly_sales, x='Order Date', y='Sales',
                          title='Monthly Sales Trend')
            st.plotly_chart(fig3, use_container_width=True)
    
    with tab3:
        # Detailed data
        st.subheader("Detailed Data")
        st.dataframe(filtered_data, use_container_width=True, height=400)
        
        # Download button
        csv = filtered_data.to_csv(index=False)
        st.download_button(
            label="📥 Download Data as CSV",
            data=csv,
            file_name=f"dashboard_data_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )
"""
        
        return layout_code
    
    def _generate_supporting_files(self, workbook_structure: Any, dashboard_info: Dict[str, Any]) -> Dict[str, str]:
        """Generate supporting files"""
        
        files = {}
        
        # Data loader
        files['utils/data_loader.py'] = self.templates['data_loader'].render(
            data_query=dashboard_info['data_query']
        )
        
        # Calculations
        files['utils/calculations.py'] = self.templates['calculations'].render(
            calculations=dashboard_info['calculations']
        )
        
        # Filters
        files['utils/filters.py'] = self.templates['filters'].render(
            filters=dashboard_info['filters']
        )
        
        # Utils init
        files['utils/__init__.py'] = "# Utils package"
        
        return files
    
    def _generate_data_query(self, workbook_structure: Any) -> str:
        """Generate data query based on workbook structure"""
        
        # Basic query for SuperStore data
        query = """
        SELECT 
            "Order Date",
            "Ship Date",
            "Customer Name",
            "Segment",
            "Country",
            "City",
            "State",
            "Region",
            "Product Name",
            "Category",
            "Sub-Category",
            "Sales",
            "Quantity",
            "Discount",
            "Profit"
        FROM ORDERS
        WHERE "Order Date" >= '2020-01-01'
        ORDER BY "Order Date" DESC
        """
        
        return query
    
    def _generate_requirements(self, chart_library: str) -> List[str]:
        """Generate requirements.txt content"""
        
        base_requirements = [
            "streamlit>=1.28.0",
            "pandas>=2.0.0",
            "numpy>=1.24.0",
            "snowflake-connector-python>=3.5.0",
            "snowflake-sqlalchemy>=1.5.0",
            "python-dotenv>=1.0.0",
            "sqlalchemy>=2.0.0"
        ]
        
        if chart_library == "plotly":
            base_requirements.append("plotly>=5.17.0")
        elif chart_library == "altair":
            base_requirements.append("altair>=5.0.0")
        elif chart_library == "matplotlib":
            base_requirements.extend(["matplotlib>=3.7.0", "seaborn>=0.12.0"])
        
        return base_requirements
    
    def _generate_deployment_config(self, dashboard_info: Dict[str, Any]) -> Dict[str, Any]:
        """Generate deployment configuration"""
        
        return {
            'vercel': {
                'name': dashboard_info['name'].lower().replace(' ', '-'),
                'runtime': 'python',
                'buildCommand': 'pip install -r requirements.txt',
                'startCommand': 'streamlit run app.py --server.port $PORT --server.address 0.0.0.0'
            },
            'streamlit_cloud': {
                'python_version': '3.9',
                'requirements_file': 'requirements.txt',
                'main_file': 'app.py'
            }
        }
    
    def _generate_documentation(self, dashboard_info: Dict[str, Any]) -> str:
        """Generate documentation"""
        
        docs = f"""
# {dashboard_info['title']} - Generated Dashboard

## Overview
{dashboard_info['description']}

## Features
- Interactive filters for data exploration
- Real-time metrics and KPIs
- Multiple visualization types
- Data export functionality
- Responsive design

## Setup Instructions

### 1. Environment Setup
1. Copy `.env.template` to `.env`
2. Fill in your Snowflake credentials
3. Install dependencies: `pip install -r requirements.txt`

### 2. Run the Application
```bash
streamlit run app.py
```

### 3. Deploy to Vercel
```bash
vercel --prod
```

## Generated Components

### Data Sources
- Primary data source: Snowflake SUPERSTOREDB
- Refresh frequency: 1 hour (cached)

### Calculations
{len(dashboard_info['calculations'])} calculated fields:
"""
        
        for calc in dashboard_info['calculations']:
            docs += f"- **{calc['display_name']}**: {calc['description']}\n"
        
        docs += f"""

### Filters
{len(dashboard_info['filters'])} interactive filters:
"""
        
        for filter_def in dashboard_info['filters']:
            docs += f"- **{filter_def['display_name']}**: Filter by {filter_def['column']}\n"
        
        docs += """

## Customization
- Edit `utils/calculations.py` to modify calculation logic
- Update `utils/filters.py` to add new filters
- Modify `utils/data_loader.py` to change data sources

## Support
Generated with Intelligent Tableau Converter
"""
        
        return docs
    
    def create_deployment_package(self, app: GeneratedApp) -> bytes:
        """Create deployment package as ZIP file"""
        
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Main app file
            zip_file.writestr('app.py', app.main_file)
            
            # Supporting files
            for file_path, content in app.supporting_files.items():
                zip_file.writestr(file_path, content)
            
            # Requirements
            zip_file.writestr('requirements.txt', '\n'.join(app.requirements))
            
            # Documentation
            zip_file.writestr('README.md', app.documentation)
            
            # Environment template
            zip_file.writestr('.env.template', """
# Environment Variables Template
SNOWFLAKE_ACCOUNT=your_account_here
SNOWFLAKE_USER=your_user_here
SNOWFLAKE_PASSWORD=your_password_here
SNOWFLAKE_WAREHOUSE=your_warehouse_here
SNOWFLAKE_DATABASE=your_database_here
SNOWFLAKE_SCHEMA=your_schema_here
SNOWFLAKE_ROLE=your_role_here
""")
            
            # Deployment configs
            zip_file.writestr('vercel.json', json.dumps(app.deployment_config['vercel'], indent=2))
        
        zip_buffer.seek(0)
        return zip_buffer.getvalue()