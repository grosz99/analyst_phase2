import snowflake.connector
import pandas as pd
import redis
import json
import hashlib
import time
import os
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class SnowflakeDataService:
    def __init__(self):
        self.redis_client = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
        self.session_ttl = 3600  # 1 hour dataset cache
        
    def _get_snowflake_connection(self):
        """Create Snowflake connection"""
        return snowflake.connector.connect(
            user=os.getenv('SNOWFLAKE_USER'),
            password=os.getenv('SNOWFLAKE_PASSWORD'),
            account=os.getenv('SNOWFLAKE_ACCOUNT'),
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
            database=os.getenv('SNOWFLAKE_DATABASE'),
            schema=os.getenv('SNOWFLAKE_SCHEMA')
        )
    
    def _generate_cache_key(self, sources: List[str], dimensions: List[str], 
                          metrics: List[str], filters: Dict) -> str:
        """Generate unique cache key for dataset configuration"""
        content = f"{sorted(sources)}-{sorted(dimensions)}-{sorted(metrics)}-{sorted(filters.items())}"
        return f"dataset:{hashlib.md5(content.encode()).hexdigest()}"
    
    def _build_snowflake_query(self, sources: List[str], dimensions: List[str], 
                             metrics: List[str], filters: Dict) -> str:
        """Build optimized SQL query for Snowflake"""
        all_columns = list(set(dimensions + metrics))
        
        # Handle multiple sources with UNION
        if len(sources) == 1:
            base_query = f"SELECT {', '.join(all_columns)} FROM {sources[0]}"
        else:
            union_queries = []
            for source in sources:
                union_queries.append(f"SELECT {', '.join(all_columns)} FROM {source}")
            base_query = f"({') UNION ALL ('.join(union_queries)})"
        
        # Add filters
        where_clauses = []
        for key, value in filters.items():
            if value:  # Only add non-empty filters
                where_clauses.append(f"{key} = '{value}'")
        
        if where_clauses:
            base_query += f" WHERE {' AND '.join(where_clauses)}"
        
        # Add reasonable limit to prevent huge datasets
        base_query += " LIMIT 50000"
        
        return base_query
    
    async def load_dataset(self, sources: List[str], dimensions: List[str], 
                          metrics: List[str], filters: Dict) -> Dict:
        """Load dataset from Snowflake and cache it"""
        
        # Generate cache key
        cache_key = self._generate_cache_key(sources, dimensions, metrics, filters)
        
        # Check if already cached
        cached_data = self.redis_client.get(cache_key)
        if cached_data:
            dataset_info = pickle.loads(cached_data)
            return {
                "dataset_key": cache_key,
                "cached": True,
                **dataset_info
            }
        
        # Build and execute Snowflake query
        sql_query = self._build_snowflake_query(sources, dimensions, metrics, filters)
        
        try:
            conn = self._get_snowflake_connection()
            df = pd.read_sql(sql_query, conn)
            conn.close()
            
            # Prepare dataset info
            dataset_info = {
                "shape": df.shape,
                "columns": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "preview": df.head(10).to_dict('records'),
                "memory_usage": int(df.memory_usage(deep=True).sum()),
                "created_at": time.time(),
                "sql_query": sql_query,
                "sources": sources,
                "dimensions": dimensions,
                "metrics": metrics,
                "filters": filters
            }
            
            # Cache the DataFrame and metadata
            cache_data = {
                **dataset_info,
                "dataframe_bytes": pickle.dumps(df)
            }
            
            self.redis_client.setex(
                cache_key, 
                self.session_ttl, 
                pickle.dumps(cache_data)
            )
            
            return {
                "dataset_key": cache_key,
                "cached": False,
                **dataset_info
            }
            
        except Exception as e:
            raise Exception(f"Snowflake query failed: {str(e)}")
    
    def get_dataframe(self, dataset_key: str) -> pd.DataFrame:
        """Retrieve cached DataFrame"""
        cached_data = self.redis_client.get(dataset_key)
        if not cached_data:
            raise ValueError("Dataset session expired or not found. Please reload your data.")
        
        dataset_info = pickle.loads(cached_data)
        return pickle.loads(dataset_info["dataframe_bytes"])
    
    def get_dataset_info(self, dataset_key: str) -> Dict:
        """Get dataset metadata without loading the full DataFrame"""
        cached_data = self.redis_client.get(dataset_key)
        if not cached_data:
            raise ValueError("Dataset session expired or not found.")
        
        dataset_info = pickle.loads(cached_data)
        # Return info without the large dataframe_bytes
        return {k: v for k, v in dataset_info.items() if k != "dataframe_bytes"}
    
    def extend_session(self, dataset_key: str) -> bool:
        """Extend dataset session TTL"""
        return self.redis_client.expire(dataset_key, self.session_ttl)
