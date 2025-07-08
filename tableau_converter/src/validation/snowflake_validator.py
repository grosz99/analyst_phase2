"""
Snowflake Data Validator - Validates calculations against source data
"""
import os
import pandas as pd
import snowflake.connector
from snowflake.sqlalchemy import URL
from sqlalchemy import create_engine
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of data validation"""
    is_valid: bool
    metric_name: str
    expected_value: any
    actual_value: any
    difference: Optional[float] = None
    error_message: Optional[str] = None
    

class SnowflakeValidator:
    """Validates data and calculations against Snowflake source"""
    
    def __init__(self):
        self.connection = None
        self.engine = None
        self._connect()
        
    def _connect(self):
        """Establish connection to Snowflake"""
        try:
            # Create connection
            self.connection = snowflake.connector.connect(
                account=os.getenv('SNOWFLAKE_ACCOUNT'),
                user=os.getenv('SNOWFLAKE_USER'),
                password=os.getenv('SNOWFLAKE_PASSWORD'),
                warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
                database=os.getenv('SNOWFLAKE_DATABASE'),
                schema=os.getenv('SNOWFLAKE_SCHEMA'),
                role=os.getenv('SNOWFLAKE_ROLE')
            )
            
            # Create SQLAlchemy engine for pandas integration
            self.engine = create_engine(URL(
                account=os.getenv('SNOWFLAKE_ACCOUNT'),
                user=os.getenv('SNOWFLAKE_USER'),
                password=os.getenv('SNOWFLAKE_PASSWORD'),
                warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
                database=os.getenv('SNOWFLAKE_DATABASE'),
                schema=os.getenv('SNOWFLAKE_SCHEMA'),
                role=os.getenv('SNOWFLAKE_ROLE')
            ))
            
            logger.info("Successfully connected to Snowflake")
            
        except Exception as e:
            logger.error(f"Failed to connect to Snowflake: {str(e)}")
            raise
    
    def get_source_data(self, table_name: str, limit: Optional[int] = None) -> pd.DataFrame:
        """Retrieve source data from Snowflake"""
        query = f"SELECT * FROM {table_name}"
        if limit:
            query += f" LIMIT {limit}"
        
        logger.info(f"Executing query: {query}")
        return pd.read_sql(query, self.engine)
    
    def validate_calculation(self, 
                           calculation_sql: str,
                           expected_value: any,
                           tolerance: float = 0.01) -> ValidationResult:
        """Validate a single calculation against Snowflake"""
        try:
            # Execute calculation
            result = pd.read_sql(calculation_sql, self.engine)
            
            if result.empty:
                return ValidationResult(
                    is_valid=False,
                    metric_name=calculation_sql,
                    expected_value=expected_value,
                    actual_value=None,
                    error_message="Query returned no results"
                )
            
            actual_value = result.iloc[0, 0]
            
            # Compare values
            if isinstance(expected_value, (int, float)) and isinstance(actual_value, (int, float)):
                difference = abs(actual_value - expected_value)
                relative_diff = difference / max(abs(expected_value), 1e-10)
                is_valid = relative_diff <= tolerance
                
                return ValidationResult(
                    is_valid=is_valid,
                    metric_name=calculation_sql,
                    expected_value=expected_value,
                    actual_value=actual_value,
                    difference=difference
                )
            else:
                # String or other comparison
                is_valid = str(actual_value) == str(expected_value)
                return ValidationResult(
                    is_valid=is_valid,
                    metric_name=calculation_sql,
                    expected_value=expected_value,
                    actual_value=actual_value
                )
                
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                metric_name=calculation_sql,
                expected_value=expected_value,
                actual_value=None,
                error_message=str(e)
            )
    
    def validate_tableau_metrics(self, metrics: Dict[str, Dict]) -> List[ValidationResult]:
        """Validate multiple Tableau metrics against Snowflake"""
        results = []
        
        for metric_name, metric_info in metrics.items():
            # Build SQL query from metric definition
            sql = self._build_metric_sql(metric_info)
            
            # Validate
            result = self.validate_calculation(
                sql,
                metric_info.get('expected_value'),
                metric_info.get('tolerance', 0.01)
            )
            result.metric_name = metric_name
            results.append(result)
            
            logger.info(f"Validated {metric_name}: {'PASS' if result.is_valid else 'FAIL'}")
        
        return results
    
    def _build_metric_sql(self, metric_info: Dict) -> str:
        """Build SQL query from metric definition"""
        formula = metric_info.get('formula', '')
        table = metric_info.get('table', '')
        filters = metric_info.get('filters', [])
        group_by = metric_info.get('group_by', [])
        
        # Start building query
        sql = f"SELECT {formula}"
        
        if table:
            sql += f" FROM {table}"
        
        if filters:
            where_clause = " AND ".join(filters)
            sql += f" WHERE {where_clause}"
        
        if group_by:
            sql += f" GROUP BY {', '.join(group_by)}"
        
        return sql
    
    def compare_dataframes(self, 
                          tableau_df: pd.DataFrame,
                          generated_df: pd.DataFrame,
                          key_columns: List[str],
                          value_columns: List[str],
                          tolerance: float = 0.01) -> Tuple[bool, List[str]]:
        """Compare two dataframes for validation"""
        differences = []
        
        # Ensure same columns exist
        missing_cols = set(value_columns) - set(generated_df.columns)
        if missing_cols:
            differences.append(f"Missing columns: {missing_cols}")
            return False, differences
        
        # Merge on key columns
        merged = pd.merge(
            tableau_df[key_columns + value_columns],
            generated_df[key_columns + value_columns],
            on=key_columns,
            suffixes=('_expected', '_actual'),
            how='outer',
            indicator=True
        )
        
        # Check for missing rows
        missing_in_generated = merged[merged['_merge'] == 'left_only']
        missing_in_tableau = merged[merged['_merge'] == 'right_only']
        
        if not missing_in_generated.empty:
            differences.append(f"Missing {len(missing_in_generated)} rows in generated data")
        
        if not missing_in_tableau.empty:
            differences.append(f"Extra {len(missing_in_tableau)} rows in generated data")
        
        # Compare values
        both = merged[merged['_merge'] == 'both']
        
        for col in value_columns:
            expected_col = f"{col}_expected"
            actual_col = f"{col}_actual"
            
            if expected_col in both.columns and actual_col in both.columns:
                # Numeric comparison
                if both[expected_col].dtype in ['float64', 'float32']:
                    diff = abs(both[expected_col] - both[actual_col])
                    rel_diff = diff / both[expected_col].abs().clip(lower=1e-10)
                    bad_rows = both[rel_diff > tolerance]
                    
                    if not bad_rows.empty:
                        differences.append(
                            f"Column {col}: {len(bad_rows)} rows exceed tolerance of {tolerance}"
                        )
                else:
                    # Exact comparison
                    bad_rows = both[both[expected_col] != both[actual_col]]
                    if not bad_rows.empty:
                        differences.append(
                            f"Column {col}: {len(bad_rows)} rows have different values"
                        )
        
        return len(differences) == 0, differences
    
    def close(self):
        """Close Snowflake connection"""
        if self.connection:
            self.connection.close()
        if self.engine:
            self.engine.dispose()


class SuperstoreMetrics:
    """Pre-defined metrics for Superstore dashboard validation"""
    
    METRICS = {
        'total_sales': {
            'formula': 'SUM("Sales")',
            'table': 'ORDERS',
            'expected_value': 2297200.86,  # From Tableau
            'tolerance': 0.01
        },
        'total_profit': {
            'formula': 'SUM("Profit")',
            'table': 'ORDERS',
            'expected_value': 286397.02,  # From Tableau
            'tolerance': 0.01
        },
        'profit_ratio': {
            'formula': 'SUM("Profit") / SUM("Sales")',
            'table': 'ORDERS',
            'expected_value': 0.1246,  # From Tableau
            'tolerance': 0.001
        },
        'order_count': {
            'formula': 'COUNT(DISTINCT "Order ID")',
            'table': 'ORDERS',
            'expected_value': 5009,  # From Tableau
            'tolerance': 0
        },
        'customer_count': {
            'formula': 'COUNT(DISTINCT "Customer ID")',
            'table': 'ORDERS',
            'expected_value': 793,  # From Tableau
            'tolerance': 0
        },
        'avg_discount': {
            'formula': 'AVG("Discount")',
            'table': 'ORDERS',
            'expected_value': 0.1562,  # From Tableau
            'tolerance': 0.001
        },
        'sales_by_segment': {
            'formula': 'SUM("Sales")',
            'table': 'ORDERS',
            'group_by': ['"Segment"'],
            'expected_values': {
                'Consumer': 1161401.73,
                'Corporate': 706146.37,
                'Home Office': 429652.76
            },
            'tolerance': 0.01
        },
        'sales_by_region': {
            'formula': 'SUM("Sales")',
            'table': 'ORDERS',
            'group_by': ['"Region"'],
            'expected_values': {
                'West': 725457.82,
                'East': 678781.24,
                'Central': 501239.50,
                'South': 391721.91
            },
            'tolerance': 0.01
        }
    }