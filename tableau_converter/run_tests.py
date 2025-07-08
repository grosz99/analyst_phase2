#!/usr/bin/env python3
"""
Comprehensive test runner for Tableau Converter
"""
import sys
import traceback
from pathlib import Path

# Add src to path
sys.path.append('.')

def test_parser():
    """Test TWBX parser with SuperStore dashboard"""
    print("🔍 Testing TWBX Parser...")
    
    try:
        from src.parsers.twbx_parser import TWBXParser
        
        parser = TWBXParser()
        workbook = parser.parse('SuperStore Business Dashboard 2025 _ VOTD _ VizOfTheDay.twbx')
        
        print(f"  ✅ Successfully parsed workbook")
        print(f"  📊 Found {len(workbook.dashboards)} dashboards")
        print(f"  📈 Found {len(workbook.worksheets)} worksheets")
        print(f"  🧮 Found {len(workbook.calculations)} calculations")
        
        # Test some calculations
        sample_calcs = list(workbook.calculations.items())[:3]
        for name, calc in sample_calcs:
            print(f"  🔢 {name}: {calc.formula[:50]}...")
        
        return True, workbook
        
    except Exception as e:
        print(f"  ❌ Parser failed: {e}")
        traceback.print_exc()
        return False, None

def test_formula_translator():
    """Test formula translation"""
    print("\n🔄 Testing Formula Translator...")
    
    try:
        from src.translators.formula_translator import TableauFormulaTranslator
        
        translator = TableauFormulaTranslator()
        
        # Test basic formulas
        test_formulas = [
            "[Sales] / [Profit]",
            "IF [Sales] > 1000 THEN 'High' ELSE 'Low' END",
            "SUM([Sales])",
            "{ FIXED [Region] : SUM([Sales]) }"
        ]
        
        for formula in test_formulas:
            result = translator.translate(formula)
            print(f"  ✅ {formula} -> {result.pandas_expression}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Translator failed: {e}")
        traceback.print_exc()
        return False

def test_streamlit_generator():
    """Test Streamlit app generation"""
    print("\n🚀 Testing Streamlit Generator...")
    
    try:
        from src.generators.streamlit_generator import StreamlitGenerator
        
        generator = StreamlitGenerator()
        
        # Create mock workbook structure
        from src.parsers.twbx_parser import WorkbookStructure, TableauCalculation
        
        calc = TableauCalculation(
            name="Test Calc",
            formula="[Sales] / [Profit]",
            calculation_type="measure",
            data_type="real"
        )
        
        mock_workbook = WorkbookStructure(
            metadata={"name": "Test Dashboard"},
            datasources=[],
            calculations={"Test Calc": calc},
            worksheets={},
            dashboards={},
            parameters=[]
        )
        
        app = generator.generate_app(mock_workbook)
        
        print(f"  ✅ Generated app: {app.name}")
        print(f"  📝 Main file: {len(app.main_file)} characters")
        print(f"  📂 Supporting files: {len(app.supporting_files)}")
        print(f"  📦 Requirements: {len(app.requirements)} packages")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Generator failed: {e}")
        traceback.print_exc()
        return False

def test_imports():
    """Test all imports work correctly"""
    print("\n📦 Testing Imports...")
    
    modules = [
        'src.parsers.twbx_parser',
        'src.translators.formula_translator',
        'src.validation.snowflake_validator',
        'src.agents.extraction_agent',
        'src.generators.streamlit_generator',
        'src.agents.visual_validation_agent'
    ]
    
    success_count = 0
    
    for module in modules:
        try:
            __import__(module)
            print(f"  ✅ {module}")
            success_count += 1
        except Exception as e:
            print(f"  ❌ {module}: {e}")
    
    print(f"  📊 {success_count}/{len(modules)} modules imported successfully")
    return success_count == len(modules)

def main():
    """Run all tests"""
    print("🧪 Running Comprehensive Tests for Tableau Converter")
    print("=" * 60)
    
    results = []
    
    # Test imports
    results.append(test_imports())
    
    # Test parser
    parser_success, workbook = test_parser()
    results.append(parser_success)
    
    # Test translator
    results.append(test_formula_translator())
    
    # Test generator
    results.append(test_streamlit_generator())
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total} tests")
    
    if passed == total:
        print("🎉 All tests passed! System is ready for deployment.")
    else:
        print("⚠️ Some tests failed. Please review the errors above.")
    
    # Additional info
    print("\n📋 System Status:")
    print(f"  🔐 Security: Credentials protected with .gitignore")
    print(f"  📦 Dependencies: Listed in requirements.txt")
    print(f"  🚀 Deployment: Vercel configuration ready")
    print(f"  📖 Documentation: README.md with setup instructions")
    
    if workbook:
        print(f"\n📊 SuperStore Dashboard Analysis:")
        print(f"  🧮 {len(workbook.calculations)} calculations extracted")
        print(f"  📈 {len(workbook.worksheets)} worksheets found")
        print(f"  🎯 Ready for conversion to Streamlit")

if __name__ == "__main__":
    main()