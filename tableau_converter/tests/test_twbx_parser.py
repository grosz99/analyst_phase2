"""
Test suite for TWBX Parser
"""
import pytest
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from src.parsers.twbx_parser import TWBXParser, TableauCalculation, WorkbookStructure


class TestTWBXParser:
    """Test the TWBX parser functionality"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.parser = TWBXParser()
        
    def create_mock_twbx(self, xml_content: str) -> str:
        """Create a mock .twbx file with given XML content"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.twbx')
        
        with zipfile.ZipFile(temp_file.name, 'w') as zf:
            zf.writestr('workbook.twb', xml_content)
        
        return temp_file.name
    
    def test_extract_twb_xml(self):
        """Test XML extraction from TWBX file"""
        xml_content = """<?xml version='1.0' encoding='utf-8'?>
<workbook version="18.1" xmlns:user="http://www.tableausoftware.com/xml/user">
    <datasources>
        <datasource name="Sample">
            <column name="Sales" datatype="real" role="measure" type="quantitative"/>
        </datasource>
    </datasources>
</workbook>"""
        
        twbx_path = self.create_mock_twbx(xml_content)
        
        try:
            extracted_xml = self.parser._extract_twb_xml(twbx_path)
            assert xml_content.strip() == extracted_xml.strip()
        finally:
            Path(twbx_path).unlink()
    
    def test_extract_metadata(self):
        """Test metadata extraction"""
        xml_content = """<?xml version='1.0' encoding='utf-8'?>
<workbook version="18.1" xmlns:user="http://www.tableausoftware.com/xml/user">
    <source platform="win" version="18.1.0"/>
</workbook>"""
        
        root = ET.fromstring(xml_content)
        metadata = self.parser._extract_metadata(root)
        
        assert metadata['version'] == '18.1'
        assert metadata['xmlns:user'] == 'http://www.tableausoftware.com/xml/user'
    
    def test_extract_calculations(self):
        """Test calculation extraction"""
        xml_content = """<?xml version='1.0' encoding='utf-8'?>
<workbook version="18.1">
    <datasources>
        <datasource name="Sample">
            <column name="Profit Ratio" datatype="real" role="measure" type="quantitative">
                <calculation formula="[Profit] / [Sales]"/>
            </column>
            <column name="Sales Category" datatype="string" role="dimension" type="nominal">
                <calculation formula="IF [Sales] > 1000 THEN 'High' ELSE 'Low' END"/>
            </column>
        </datasource>
    </datasources>
</workbook>"""
        
        root = ET.fromstring(xml_content)
        calculations = self.parser._extract_all_calculations(root)
        
        assert len(calculations) == 2
        assert 'Profit Ratio' in calculations
        assert 'Sales Category' in calculations
        
        profit_ratio = calculations['Profit Ratio']
        assert profit_ratio.formula == '[Profit] / [Sales]'
        assert profit_ratio.calculation_type == 'measure'
        assert profit_ratio.data_type == 'real'
    
    def test_extract_formula_dependencies(self):
        """Test formula dependency extraction"""
        formula = "[Sales] / [Profit] + [Quantity] * [Discount]"
        dependencies = self.parser._extract_formula_dependencies(formula)
        
        expected_deps = ['Sales', 'Profit', 'Quantity', 'Discount']
        assert set(dependencies) == set(expected_deps)
    
    def test_lod_expression_detection(self):
        """Test LOD expression detection"""
        xml_content = """<?xml version='1.0' encoding='utf-8'?>
<workbook version="18.1">
    <datasources>
        <datasource name="Sample">
            <column name="Regional Sales" datatype="real" role="measure" type="quantitative">
                <calculation formula="{ FIXED [Region] : SUM([Sales]) }"/>
            </column>
        </datasource>
    </datasources>
</workbook>"""
        
        root = ET.fromstring(xml_content)
        calculations = self.parser._extract_all_calculations(root)
        
        regional_sales = calculations['Regional Sales']
        assert regional_sales.is_lod == True
        assert regional_sales.lod_type == 'FIXED'
    
    def test_full_parse_workflow(self):
        """Test complete parsing workflow"""
        xml_content = """<?xml version='1.0' encoding='utf-8'?>
<workbook version="18.1">
    <datasources>
        <datasource name="SuperStore">
            <column name="Sales" datatype="real" role="measure" type="quantitative"/>
            <column name="Profit" datatype="real" role="measure" type="quantitative"/>
            <column name="Profit Ratio" datatype="real" role="measure" type="quantitative">
                <calculation formula="[Profit] / [Sales]"/>
            </column>
        </datasource>
    </datasources>
    <worksheets>
        <worksheet name="Sales Analysis">
            <datasource-dependencies datasource="SuperStore"/>
        </worksheet>
    </worksheets>
    <dashboards>
        <dashboard name="Sales Dashboard">
            <size maxheight="800" maxwidth="1200"/>
            <zones>
                <zone name="Sales Analysis" type="worksheet" x="0" y="0" w="600" h="400"/>
            </zones>
        </dashboard>
    </dashboards>
</workbook>"""
        
        twbx_path = self.create_mock_twbx(xml_content)
        
        try:
            workbook = self.parser.parse(twbx_path)
            
            # Check structure
            assert isinstance(workbook, WorkbookStructure)
            assert len(workbook.calculations) == 1
            assert len(workbook.worksheets) == 1
            assert len(workbook.dashboards) == 1
            
            # Check calculation
            assert 'Profit Ratio' in workbook.calculations
            calc = workbook.calculations['Profit Ratio']
            assert calc.formula == '[Profit] / [Sales]'
            assert 'Profit' in calc.dependencies
            assert 'Sales' in calc.dependencies
            
            # Check dashboard
            assert 'Sales Dashboard' in workbook.dashboards
            dashboard = workbook.dashboards['Sales Dashboard']
            assert dashboard.size['width'] == 1200
            assert dashboard.size['height'] == 800
            
        finally:
            Path(twbx_path).unlink()


class TestTableauCalculation:
    """Test Tableau calculation data structure"""
    
    def test_calculation_creation(self):
        """Test calculation object creation"""
        calc = TableauCalculation(
            name="Test Calc",
            formula="[Sales] * 2",
            calculation_type="measure",
            data_type="real"
        )
        
        assert calc.name == "Test Calc"
        assert calc.formula == "[Sales] * 2"
        assert calc.is_lod == False
        assert calc.dependencies == []
    
    def test_lod_calculation(self):
        """Test LOD calculation properties"""
        calc = TableauCalculation(
            name="LOD Calc",
            formula="{ FIXED [Region] : SUM([Sales]) }",
            calculation_type="measure",
            data_type="real",
            is_lod=True,
            lod_type="FIXED"
        )
        
        assert calc.is_lod == True
        assert calc.lod_type == "FIXED"


if __name__ == "__main__":
    pytest.main([__file__])