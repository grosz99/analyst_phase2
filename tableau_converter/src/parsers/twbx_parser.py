"""
TWBX Parser - Extracts Tableau workbook components with focus on calculations
"""
import zipfile
import xml.etree.ElementTree as ET
import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class TableauCalculation:
    """Represents a Tableau calculated field"""
    name: str
    formula: str
    calculation_type: str  # dimension, measure, etc.
    data_type: str  # string, integer, real, etc.
    aggregation: Optional[str] = None
    dependencies: List[str] = None
    is_lod: bool = False
    lod_type: Optional[str] = None  # FIXED, INCLUDE, EXCLUDE
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []


@dataclass
class TableauWorksheet:
    """Represents a Tableau worksheet"""
    name: str
    title: str
    calculations: List[TableauCalculation]
    datasource_dependencies: List[str]
    marks: List[Dict[str, Any]]  # Chart configurations
    filters: List[Dict[str, Any]]
    
    
@dataclass
class TableauDashboard:
    """Represents a Tableau dashboard"""
    name: str
    title: str
    worksheets: List[str]  # Worksheet names used
    zones: List[Dict[str, Any]]  # Layout information
    size: Dict[str, int]


@dataclass
class WorkbookStructure:
    """Complete workbook structure"""
    metadata: Dict[str, Any]
    datasources: List[Dict[str, Any]]
    calculations: Dict[str, TableauCalculation]  # name -> calculation
    worksheets: Dict[str, TableauWorksheet]  # name -> worksheet
    dashboards: Dict[str, TableauDashboard]  # name -> dashboard
    parameters: List[Dict[str, Any]]
    

class TWBXParser:
    """Parser for Tableau .twbx files with focus on calculation extraction"""
    
    def __init__(self):
        self.namespaces = {
            'user': 'http://www.tableausoftware.com/xml/user'
        }
        
    def parse(self, twbx_path: str) -> WorkbookStructure:
        """Parse a .twbx file and extract all components"""
        logger.info(f"Parsing TWBX file: {twbx_path}")
        
        # Extract XML from TWBX
        xml_content = self._extract_twb_xml(twbx_path)
        
        # Parse XML
        root = ET.fromstring(xml_content)
        
        # Extract components
        metadata = self._extract_metadata(root)
        datasources = self._extract_datasources(root)
        calculations = self._extract_all_calculations(root)
        worksheets = self._extract_worksheets(root, calculations)
        dashboards = self._extract_dashboards(root)
        parameters = self._extract_parameters(root)
        
        return WorkbookStructure(
            metadata=metadata,
            datasources=datasources,
            calculations=calculations,
            worksheets=worksheets,
            dashboards=dashboards,
            parameters=parameters
        )
    
    def _extract_twb_xml(self, twbx_path: str) -> str:
        """Extract the .twb XML content from .twbx file"""
        with zipfile.ZipFile(twbx_path, 'r') as zf:
            # Find the .twb file
            twb_files = [f for f in zf.namelist() if f.endswith('.twb')]
            if not twb_files:
                raise ValueError("No .twb file found in .twbx archive")
            
            # Read the XML content
            return zf.read(twb_files[0]).decode('utf-8')
    
    def _extract_metadata(self, root: ET.Element) -> Dict[str, Any]:
        """Extract workbook metadata"""
        metadata = {
            'version': root.get('version', 'unknown'),
            'xmlns:user': root.get('xmlns:user', ''),
        }
        
        # Get workbook source information
        source = root.find('.//source')
        if source is not None:
            metadata['source_platform'] = source.get('platform', '')
            metadata['source_version'] = source.get('version', '')
        
        return metadata
    
    def _extract_datasources(self, root: ET.Element) -> List[Dict[str, Any]]:
        """Extract datasource information"""
        datasources = []
        
        for ds in root.findall('.//datasource'):
            datasource = {
                'name': ds.get('name', ''),
                'caption': ds.get('caption', ''),
                'inline': ds.get('inline', 'false') == 'true',
                'connections': [],
                'columns': []
            }
            
            # Extract connection information
            for conn in ds.findall('.//connection'):
                connection = {
                    'class': conn.get('class', ''),
                    'dbname': conn.get('dbname', ''),
                    'server': conn.get('server', ''),
                    'warehouse': conn.get('warehouse', ''),
                    'schema': conn.get('schema', ''),
                }
                datasource['connections'].append(connection)
            
            # Extract column metadata
            for col in ds.findall('.//column'):
                column = {
                    'name': col.get('name', ''),
                    'datatype': col.get('datatype', ''),
                    'role': col.get('role', ''),
                    'type': col.get('type', ''),
                    'caption': col.get('caption', col.get('name', '')),
                }
                datasource['columns'].append(column)
            
            datasources.append(datasource)
        
        return datasources
    
    def _extract_all_calculations(self, root: ET.Element) -> Dict[str, TableauCalculation]:
        """Extract ALL calculated fields from the workbook"""
        calculations = {}
        
        # Find calculations in datasources
        for datasource in root.findall('.//datasource'):
            for calc in datasource.findall('.//column[@caption]'):
                if calc.find('calculation') is not None:
                    calc_elem = calc.find('calculation')
                    name = calc.get('name', '')
                    
                    calculation = TableauCalculation(
                        name=name,
                        formula=calc_elem.get('formula', ''),
                        calculation_type=calc.get('role', 'dimension'),
                        data_type=calc.get('datatype', 'string'),
                        aggregation=calc.get('aggregation', None)
                    )
                    
                    # Check if it's an LOD expression
                    formula = calculation.formula
                    if '{FIXED' in formula or '{INCLUDE' in formula or '{EXCLUDE' in formula:
                        calculation.is_lod = True
                        if '{FIXED' in formula:
                            calculation.lod_type = 'FIXED'
                        elif '{INCLUDE' in formula:
                            calculation.lod_type = 'INCLUDE'
                        else:
                            calculation.lod_type = 'EXCLUDE'
                    
                    # Extract dependencies (fields referenced in formula)
                    calculation.dependencies = self._extract_formula_dependencies(formula)
                    
                    calculations[name] = calculation
                    logger.info(f"Extracted calculation: {name} = {formula}")
        
        return calculations
    
    def _extract_formula_dependencies(self, formula: str) -> List[str]:
        """Extract field dependencies from a Tableau formula"""
        import re
        
        # Pattern to match field references [FieldName]
        pattern = r'\[([^\]]+)\]'
        matches = re.findall(pattern, formula)
        
        # Remove duplicates and return
        return list(set(matches))
    
    def _extract_worksheets(self, root: ET.Element, calculations: Dict[str, TableauCalculation]) -> Dict[str, TableauWorksheet]:
        """Extract worksheet information with calculations"""
        worksheets = {}
        
        for ws in root.findall('.//worksheet'):
            name = ws.get('name', '')
            
            # Find calculations used in this worksheet
            ws_calculations = []
            for calc_name in calculations:
                # Check if calculation is referenced in worksheet
                if self._is_field_used_in_worksheet(ws, calc_name):
                    ws_calculations.append(calculations[calc_name])
            
            # Extract marks (visualizations)
            marks = []
            for pane in ws.findall('.//pane'):
                for mark in pane.findall('.//mark'):
                    mark_info = {
                        'class': mark.get('class', ''),
                        'encodings': {}
                    }
                    
                    # Extract encodings (columns, rows, color, size, etc.)
                    for encoding in mark.findall('.//encoding'):
                        attr = encoding.get('attr', '')
                        field = encoding.get('field', '')
                        mark_info['encodings'][attr] = field
                    
                    marks.append(mark_info)
            
            # Extract filters
            filters = []
            for filter_elem in ws.findall('.//filter'):
                filter_info = {
                    'class': filter_elem.get('class', ''),
                    'column': filter_elem.get('column', ''),
                }
                filters.append(filter_info)
            
            worksheet = TableauWorksheet(
                name=name,
                title=ws.get('formatted-name', name),
                calculations=ws_calculations,
                datasource_dependencies=self._get_worksheet_datasources(ws),
                marks=marks,
                filters=filters
            )
            
            worksheets[name] = worksheet
            logger.info(f"Extracted worksheet: {name} with {len(ws_calculations)} calculations")
        
        return worksheets
    
    def _is_field_used_in_worksheet(self, worksheet: ET.Element, field_name: str) -> bool:
        """Check if a field is used in a worksheet"""
        # Search in multiple places where fields can be referenced
        search_locations = [
            './/column[@name="{}"]',
            './/field[@name="{}"]',
            './/*[@field="{}"]',
            './/*[@column="{}"]'
        ]
        
        for location_pattern in search_locations:
            if worksheet.find(location_pattern.format(field_name)) is not None:
                return True
        
        return False
    
    def _get_worksheet_datasources(self, worksheet: ET.Element) -> List[str]:
        """Get datasources used by a worksheet"""
        datasources = set()
        
        # Find all datasource dependencies
        for dep in worksheet.findall('.//datasource-dependencies'):
            ds_name = dep.get('datasource', '')
            if ds_name:
                datasources.add(ds_name)
        
        return list(datasources)
    
    def _extract_dashboards(self, root: ET.Element) -> Dict[str, TableauDashboard]:
        """Extract dashboard information"""
        dashboards = {}
        
        for dash in root.findall('.//dashboard'):
            name = dash.get('name', '')
            
            # Extract worksheet references
            worksheet_refs = []
            zones = []
            
            for zone in dash.findall('.//zone'):
                zone_info = {
                    'type': zone.get('type', ''),
                    'name': zone.get('name', ''),
                    'x': zone.get('x', ''),
                    'y': zone.get('y', ''),
                    'w': zone.get('w', ''),
                    'h': zone.get('h', ''),
                }
                zones.append(zone_info)
                
                # If it's a worksheet zone, track it
                if zone.get('type') == 'worksheet':
                    worksheet_refs.append(zone.get('name', ''))
            
            # Get dashboard size
            size_elem = dash.find('.//size')
            size = {
                'width': int(size_elem.get('width', 800)) if size_elem is not None else 800,
                'height': int(size_elem.get('height', 600)) if size_elem is not None else 600
            }
            
            dashboard = TableauDashboard(
                name=name,
                title=dash.get('formatted-name', name),
                worksheets=worksheet_refs,
                zones=zones,
                size=size
            )
            
            dashboards[name] = dashboard
            logger.info(f"Extracted dashboard: {name} with {len(worksheet_refs)} worksheets")
        
        return dashboards
    
    def _extract_parameters(self, root: ET.Element) -> List[Dict[str, Any]]:
        """Extract parameter definitions"""
        parameters = []
        
        for param in root.findall('.//parameter'):
            param_info = {
                'name': param.get('name', ''),
                'caption': param.get('caption', ''),
                'data_type': param.get('datatype', ''),
                'current_value': param.get('value', ''),
                'allowable_values': param.get('allowable-values', 'all'),
            }
            parameters.append(param_info)
        
        return parameters