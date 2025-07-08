"""
Tableau Formula Translator - Converts Tableau calculations to Python/Pandas expressions
"""
import re
import logging
import pandas as pd
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TranslatedFormula:
    """Result of formula translation"""
    python_expression: str
    pandas_expression: str
    sql_expression: Optional[str]
    dependencies: List[str]
    requires_aggregation: bool
    is_window_function: bool
    

class TableauFormulaTranslator:
    """Translates Tableau formulas to Python/Pandas/SQL"""
    
    def __init__(self):
        # Mapping of Tableau functions to Python/Pandas equivalents
        self.function_map = {
            # Aggregation functions
            'SUM': ('sum', 'sum()', 'SUM'),
            'AVG': ('mean', 'mean()', 'AVG'),
            'COUNT': ('count', 'count()', 'COUNT'),
            'COUNTD': ('nunique', 'nunique()', 'COUNT(DISTINCT'),
            'MIN': ('min', 'min()', 'MIN'),
            'MAX': ('max', 'max()', 'MAX'),
            'MEDIAN': ('median', 'median()', 'MEDIAN'),
            'STDEV': ('std', 'std()', 'STDDEV'),
            'VAR': ('var', 'var()', 'VARIANCE'),
            
            # Mathematical functions
            'ABS': ('abs', 'abs', 'ABS'),
            'ROUND': ('round', 'round', 'ROUND'),
            'CEILING': ('ceil', 'ceil', 'CEIL'),
            'FLOOR': ('floor', 'floor', 'FLOOR'),
            'SQRT': ('sqrt', 'sqrt', 'SQRT'),
            'POWER': ('pow', 'pow', 'POWER'),
            'EXP': ('exp', 'exp', 'EXP'),
            'LOG': ('log', 'log', 'LOG'),
            'LN': ('log', 'log', 'LN'),
            
            # String functions
            'LEN': ('len', 'str.len()', 'LENGTH'),
            'LOWER': ('lower', 'str.lower()', 'LOWER'),
            'UPPER': ('upper', 'str.upper()', 'UPPER'),
            'TRIM': ('strip', 'str.strip()', 'TRIM'),
            'LTRIM': ('lstrip', 'str.lstrip()', 'LTRIM'),
            'RTRIM': ('rstrip', 'str.rstrip()', 'RTRIM'),
            'CONTAINS': ('in', 'str.contains', 'LIKE'),
            'STARTSWITH': ('startswith', 'str.startswith', 'LIKE'),
            'ENDSWITH': ('endswith', 'str.endswith', 'LIKE'),
            'REPLACE': ('replace', 'str.replace', 'REPLACE'),
            'SPLIT': ('split', 'str.split', 'SPLIT_PART'),
            'LEFT': (None, 'str[:n]', 'LEFT'),
            'RIGHT': (None, 'str[-n:]', 'RIGHT'),
            'MID': (None, 'str[start:end]', 'SUBSTRING'),
            
            # Date functions
            'TODAY': ('date.today()', 'pd.Timestamp.today()', 'CURRENT_DATE'),
            'NOW': ('datetime.now()', 'pd.Timestamp.now()', 'CURRENT_TIMESTAMP'),
            'YEAR': ('year', 'dt.year', 'YEAR'),
            'MONTH': ('month', 'dt.month', 'MONTH'),
            'DAY': ('day', 'dt.day', 'DAY'),
            'QUARTER': ('quarter', 'dt.quarter', 'QUARTER'),
            'WEEK': ('week', 'dt.week', 'WEEK'),
            'DATEPART': (None, 'dt.', 'DATE_PART'),
            'DATEADD': (None, 'pd.DateOffset', 'DATEADD'),
            'DATEDIFF': (None, None, 'DATEDIFF'),
            'DATETRUNC': (None, 'dt.floor', 'DATE_TRUNC'),
            
            # Logical functions
            'IF': ('if', None, 'CASE WHEN'),
            'IIF': ('if', None, 'CASE WHEN'),
            'CASE': ('match', None, 'CASE'),
            'AND': ('and', '&', 'AND'),
            'OR': ('or', '|', 'OR'),
            'NOT': ('not', '~', 'NOT'),
            'ISNULL': ('is None', 'isna()', 'IS NULL'),
            'IFNULL': ('or', 'fillna', 'COALESCE'),
            'ZN': ('or 0', 'fillna(0)', 'COALESCE'),
            
            # Window functions
            'RUNNING_SUM': (None, 'cumsum()', 'SUM() OVER'),
            'RUNNING_AVG': (None, 'expanding().mean()', 'AVG() OVER'),
            'WINDOW_SUM': (None, 'rolling().sum()', 'SUM() OVER'),
            'WINDOW_AVG': (None, 'rolling().mean()', 'AVG() OVER'),
            'RANK': (None, 'rank()', 'RANK() OVER'),
            'INDEX': (None, 'index', 'ROW_NUMBER() OVER'),
            'FIRST': (None, 'first()', 'FIRST_VALUE() OVER'),
            'LAST': (None, 'last()', 'LAST_VALUE() OVER'),
        }
        
    def translate(self, tableau_formula: str) -> TranslatedFormula:
        """Translate a Tableau formula to Python/Pandas/SQL"""
        logger.info(f"Translating formula: {tableau_formula}")
        
        # Clean formula
        formula = self._clean_formula(tableau_formula)
        
        # Extract dependencies
        dependencies = self._extract_dependencies(formula)
        
        # Check formula type
        requires_aggregation = self._requires_aggregation(formula)
        is_window_function = self._is_window_function(formula)
        
        # Translate to different targets
        python_expr = self._translate_to_python(formula)
        pandas_expr = self._translate_to_pandas(formula)
        sql_expr = self._translate_to_sql(formula)
        
        return TranslatedFormula(
            python_expression=python_expr,
            pandas_expression=pandas_expr,
            sql_expression=sql_expr,
            dependencies=dependencies,
            requires_aggregation=requires_aggregation,
            is_window_function=is_window_function
        )
    
    def _clean_formula(self, formula: str) -> str:
        """Clean and normalize Tableau formula"""
        # Remove extra whitespace
        formula = ' '.join(formula.split())
        
        # Normalize function names to uppercase
        for func in self.function_map:
            formula = re.sub(rf'\b{func}\b', func, formula, flags=re.IGNORECASE)
        
        return formula
    
    def _extract_dependencies(self, formula: str) -> List[str]:
        """Extract field dependencies from formula"""
        # Pattern to match [FieldName]
        pattern = r'\[([^\]]+)\]'
        matches = re.findall(pattern, formula)
        return list(set(matches))
    
    def _requires_aggregation(self, formula: str) -> bool:
        """Check if formula requires aggregation"""
        agg_functions = ['SUM', 'AVG', 'COUNT', 'COUNTD', 'MIN', 'MAX', 'MEDIAN', 'STDEV', 'VAR']
        return any(func in formula.upper() for func in agg_functions)
    
    def _is_window_function(self, formula: str) -> bool:
        """Check if formula uses window functions"""
        window_functions = ['RUNNING_', 'WINDOW_', 'RANK', 'INDEX', 'FIRST', 'LAST']
        return any(func in formula.upper() for func in window_functions)
    
    def _translate_to_python(self, formula: str) -> str:
        """Translate to pure Python expression"""
        result = formula
        
        # Replace field references
        result = re.sub(r'\[([^\]]+)\]', r"data['\1']", result)
        
        # Replace functions
        for tableau_func, (python_func, _, _) in self.function_map.items():
            if python_func and tableau_func in result:
                result = result.replace(tableau_func, python_func)
        
        # Handle IF statements
        result = self._translate_if_statements(result, 'python')
        
        # Handle LOD expressions
        result = self._translate_lod_expressions(result, 'python')
        
        return result
    
    def _translate_to_pandas(self, formula: str) -> str:
        """Translate to Pandas expression"""
        result = formula
        
        # Replace field references
        result = re.sub(r'\[([^\]]+)\]', r"df['\1']", result)
        
        # Replace functions
        for tableau_func, (_, pandas_func, _) in self.function_map.items():
            if pandas_func and tableau_func in result:
                if '()' in pandas_func:
                    # Method call
                    result = re.sub(rf'{tableau_func}\s*\(([^)]*)\)', 
                                  rf"df['\1'].{pandas_func}", result)
                else:
                    # Property or operator
                    result = result.replace(tableau_func, pandas_func)
        
        # Handle IF statements
        result = self._translate_if_statements(result, 'pandas')
        
        # Handle LOD expressions
        result = self._translate_lod_expressions(result, 'pandas')
        
        return result
    
    def _translate_to_sql(self, formula: str) -> Optional[str]:
        """Translate to SQL expression"""
        result = formula
        
        # Replace field references
        result = re.sub(r'\[([^\]]+)\]', r'"\1"', result)
        
        # Replace functions
        for tableau_func, (_, _, sql_func) in self.function_map.items():
            if sql_func and tableau_func in result:
                result = result.replace(tableau_func, sql_func)
        
        # Handle IF statements
        result = self._translate_if_statements(result, 'sql')
        
        # Handle LOD expressions
        result = self._translate_lod_expressions(result, 'sql')
        
        return result
    
    def _translate_if_statements(self, formula: str, target: str) -> str:
        """Translate IF/THEN/ELSE statements"""
        # Pattern for IF statements
        if_pattern = r'IF\s+(.+?)\s+THEN\s+(.+?)\s+(?:ELSEIF\s+(.+?)\s+THEN\s+(.+?)\s+)*ELSE\s+(.+?)\s+END'
        
        def replace_if(match):
            groups = match.groups()
            condition = groups[0]
            then_value = groups[1]
            else_value = groups[-1]
            
            if target == 'python':
                return f"({then_value} if {condition} else {else_value})"
            elif target == 'pandas':
                return f"np.where({condition}, {then_value}, {else_value})"
            elif target == 'sql':
                return f"CASE WHEN {condition} THEN {then_value} ELSE {else_value} END"
            
        result = re.sub(if_pattern, replace_if, formula, flags=re.IGNORECASE | re.DOTALL)
        return result
    
    def _translate_lod_expressions(self, formula: str, target: str) -> str:
        """Translate Level of Detail (LOD) expressions"""
        # Pattern for LOD expressions
        lod_pattern = r'\{(FIXED|INCLUDE|EXCLUDE)\s+([^:]+):\s+(.+?)\}'
        
        def replace_lod(match):
            lod_type = match.group(1)
            dimensions = match.group(2).strip()
            expression = match.group(3).strip()
            
            # Clean dimension list
            dims = [d.strip() for d in dimensions.split(',')]
            dims = [re.sub(r'\[([^\]]+)\]', r'\1', d) for d in dims]
            
            if target == 'pandas':
                if lod_type == 'FIXED':
                    return f"df.groupby({dims}).transform(lambda x: x{expression})"
                elif lod_type == 'INCLUDE':
                    current_dims = "current_groupby_dims"  # This would need context
                    all_dims = list(set(dims + [current_dims]))
                    return f"df.groupby({all_dims}).transform(lambda x: x{expression})"
                else:  # EXCLUDE
                    return f"df.transform(lambda x: x{expression})"  # Simplified
            
            elif target == 'sql':
                if lod_type == 'FIXED':
                    dim_list = ', '.join([f'"{d}"' for d in dims])
                    return f"{expression} OVER (PARTITION BY {dim_list})"
                else:
                    return expression  # Simplified for now
            
            else:  # python
                return f"calculate_lod('{lod_type}', {dims}, lambda data: data{expression})"
        
        result = re.sub(lod_pattern, replace_lod, formula, flags=re.IGNORECASE)
        return result


class CalculationValidator:
    """Validates that translated calculations produce same results as Tableau"""
    
    def __init__(self, snowflake_connection):
        self.connection = snowflake_connection
        
    def validate_calculation(self, 
                           original_formula: str,
                           translated_formula: str,
                           test_data: pd.DataFrame,
                           expected_result: pd.Series) -> Tuple[bool, Optional[str]]:
        """Validate that translated formula produces same results"""
        try:
            # Execute translated formula
            result = eval(translated_formula, {'df': test_data, 'pd': pd, 'np': __import__('numpy')})
            
            # Compare results
            if isinstance(result, pd.Series):
                # Numeric comparison with tolerance
                if result.dtype in ['float64', 'float32']:
                    matches = result.round(6).equals(expected_result.round(6))
                else:
                    matches = result.equals(expected_result)
                
                if not matches:
                    diff_count = (result != expected_result).sum()
                    return False, f"Results differ in {diff_count} rows"
                
            return True, None
            
        except Exception as e:
            return False, f"Execution error: {str(e)}"