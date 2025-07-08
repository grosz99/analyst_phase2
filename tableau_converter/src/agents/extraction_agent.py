"""
AI Extraction Agent - Uses Claude to intelligently parse Tableau XML and extract components
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import xml.etree.ElementTree as ET
from dotenv import load_dotenv
import anthropic

load_dotenv()
logger = logging.getLogger(__name__)


@dataclass
class ExtractedComponent:
    """Represents an extracted Tableau component"""
    type: str
    name: str
    properties: Dict[str, Any]
    dependencies: List[str]
    xml_source: str


class ExtractionAgent:
    """AI-powered agent for extracting Tableau components"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.getenv('ANTHROPIC_API_KEY')
        )
    
    def extract_calculations_with_ai(self, xml_content: str) -> Dict[str, Any]:
        """Use AI to extract and understand calculations from Tableau XML"""
        
        prompt = """
        You are a Tableau expert analyzing XML content. Extract ALL calculated fields and their dependencies.
        
        For each calculation, provide:
        1. Name and formula
        2. Data type and aggregation
        3. Dependencies (fields referenced)
        4. Whether it's a LOD expression
        5. Complexity level (simple, medium, complex)
        
        Focus on formulas that contain:
        - Mathematical operations
        - Conditional logic (IF/THEN/ELSE)
        - LOD expressions ({FIXED}, {INCLUDE}, {EXCLUDE})
        - Table calculations
        - Date/time functions
        - String manipulations
        
        Return structured JSON with detailed analysis.
        
        XML Content (first 15000 chars):
        """ + xml_content[:15000]
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse AI response
            ai_analysis = json.loads(response.content[0].text)
            logger.info(f"AI extracted {len(ai_analysis.get('calculations', []))} calculations")
            
            return ai_analysis
            
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return {"calculations": [], "error": str(e)}
    
    def analyze_worksheet_dependencies(self, worksheet_xml: str) -> Dict[str, List[str]]:
        """Analyze worksheet dependencies using AI"""
        
        prompt = """
        Analyze this Tableau worksheet XML and identify:
        1. All calculated fields used
        2. Data source dependencies
        3. Filter dependencies
        4. Parameter dependencies
        5. Chart type and encoding mappings
        
        Return JSON with clear dependency mapping.
        
        XML Content:
        """ + worksheet_xml[:10000]
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return json.loads(response.content[0].text)
            
        except Exception as e:
            logger.error(f"Dependency analysis failed: {e}")
            return {"dependencies": [], "error": str(e)}
    
    def understand_dashboard_layout(self, dashboard_xml: str) -> Dict[str, Any]:
        """Use AI to understand dashboard layout and structure"""
        
        prompt = """
        Analyze this Tableau dashboard XML and provide:
        1. Layout structure (zones, positions, sizes)
        2. Worksheet references and their purposes
        3. Filter relationships
        4. Interactive elements
        5. Sizing and positioning details
        
        Focus on understanding the visual hierarchy and user interaction patterns.
        
        XML Content:
        """ + dashboard_xml[:10000]
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return json.loads(response.content[0].text)
            
        except Exception as e:
            logger.error(f"Layout analysis failed: {e}")
            return {"layout": {}, "error": str(e)}
    
    def translate_formula_with_context(self, formula: str, context: Dict[str, Any]) -> Dict[str, str]:
        """Translate formula with full context understanding"""
        
        prompt = f"""
        Translate this Tableau formula to Python/Pandas with context:
        
        Formula: {formula}
        Context: {json.dumps(context, indent=2)}
        
        Provide translations for:
        1. Pure Python expression
        2. Pandas/NumPy expression
        3. SQL equivalent
        4. Explanation of logic
        5. Potential edge cases
        
        Consider data types, null handling, and performance.
        
        Return structured JSON with all translations.
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return json.loads(response.content[0].text)
            
        except Exception as e:
            logger.error(f"Formula translation failed: {e}")
            return {"error": str(e)}
    
    def generate_calculation_test_cases(self, formula: str, dependencies: List[str]) -> List[Dict[str, Any]]:
        """Generate test cases for calculation validation"""
        
        prompt = f"""
        Generate comprehensive test cases for this Tableau calculation:
        
        Formula: {formula}
        Dependencies: {dependencies}
        
        Create test cases that cover:
        1. Normal cases with typical data
        2. Edge cases (nulls, zeros, extremes)
        3. Data type variations
        4. Boundary conditions
        
        For each test case, provide:
        - Input data samples
        - Expected output
        - Test description
        - Edge case rationale
        
        Return JSON array of test cases.
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return json.loads(response.content[0].text)
            
        except Exception as e:
            logger.error(f"Test case generation failed: {e}")
            return []
    
    def optimize_formula_performance(self, formula: str, data_context: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest performance optimizations for formulas"""
        
        prompt = f"""
        Analyze this Tableau formula for performance optimization:
        
        Formula: {formula}
        Data Context: {json.dumps(data_context, indent=2)}
        
        Provide optimization suggestions:
        1. Vectorization opportunities
        2. Caching strategies
        3. Alternative approaches
        4. Memory usage considerations
        5. Scalability improvements
        
        Return structured recommendations.
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return json.loads(response.content[0].text)
            
        except Exception as e:
            logger.error(f"Performance optimization failed: {e}")
            return {"optimizations": [], "error": str(e)}


class CalculationDependencyMapper:
    """Maps calculation dependencies and execution order"""
    
    def __init__(self):
        self.dependency_graph = {}
        self.execution_order = []
    
    def build_dependency_graph(self, calculations: Dict[str, Any]) -> Dict[str, List[str]]:
        """Build dependency graph from calculations"""
        
        graph = {}
        
        for calc_name, calc_info in calculations.items():
            dependencies = calc_info.get('dependencies', [])
            graph[calc_name] = dependencies
        
        self.dependency_graph = graph
        return graph
    
    def calculate_execution_order(self) -> List[str]:
        """Calculate optimal execution order using topological sort"""
        
        # Topological sort implementation
        visited = set()
        temp_visited = set()
        order = []
        
        def visit(node):
            if node in temp_visited:
                raise ValueError(f"Circular dependency detected involving {node}")
            
            if node not in visited:
                temp_visited.add(node)
                
                for dependency in self.dependency_graph.get(node, []):
                    if dependency in self.dependency_graph:
                        visit(dependency)
                
                temp_visited.remove(node)
                visited.add(node)
                order.append(node)
        
        for node in self.dependency_graph:
            if node not in visited:
                visit(node)
        
        self.execution_order = order
        return order
    
    def get_calculation_tier(self, calc_name: str) -> int:
        """Get execution tier for a calculation"""
        if calc_name in self.execution_order:
            return self.execution_order.index(calc_name)
        return -1
    
    def validate_dependencies(self) -> List[str]:
        """Validate that all dependencies exist"""
        errors = []
        
        for calc_name, dependencies in self.dependency_graph.items():
            for dep in dependencies:
                if dep not in self.dependency_graph and not dep.startswith('['):
                    errors.append(f"Missing dependency: {dep} for calculation {calc_name}")
        
        return errors