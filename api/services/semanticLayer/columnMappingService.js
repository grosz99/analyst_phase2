/**
 * Unified Column Mapping Service
 * 
 * Centralized service for handling column name resolution across all data sources.
 * Prevents issues like the ship_mode detection problem by providing consistent
 * column mapping logic for both Anthropic and Cortex services.
 */

class ColumnMappingService {
  constructor() {
    // Core semantic mappings - these are the logical concepts we support
    this.semanticMappings = {
      // Customer dimensions
      customer: {
        primaryColumn: 'CUSTOMER_NAME',
        variations: ['CUSTOMER_NAME', 'customer_name', 'Customer', 'customer', 'CLIENT_NAME', 'client'],
        patterns: ['customer', 'client', 'buyer']
      },
      
      // Product dimensions  
      product: {
        primaryColumn: 'PRODUCT_NAME',
        variations: ['PRODUCT_NAME', 'product_name', 'Product', 'product', 'ITEM_NAME', 'item'],
        patterns: ['product', 'item', 'goods']
      },
      
      // Category dimensions
      category: {
        primaryColumn: 'CATEGORY',
        variations: ['CATEGORY', 'category', 'Category', 'PRODUCT_CATEGORY', 'product_category'],
        patterns: ['category', 'type', 'class']
      },
      
      // CRITICAL: Ship mode - the problematic one we just fixed
      ship_mode: {
        primaryColumn: 'SHIP_MODE', 
        variations: ['SHIP_MODE', 'ship_mode', 'Ship_Mode', 'SHIPPING_MODE', 'shipping_mode', 'DELIVERY_METHOD', 'delivery_method'],
        patterns: ['ship', 'shipping', 'delivery', 'transport']
      },
      
      // Sub-category dimensions
      sub_category: {
        primaryColumn: 'SUB_CATEGORY',
        variations: ['SUB_CATEGORY', 'sub_category', 'Sub_Category', 'SUBCATEGORY', 'subcategory'],
        patterns: ['sub', 'subcategory']
      },
      
      // Geographic dimensions
      region: {
        primaryColumn: 'REGION',
        variations: ['REGION', 'region', 'Region', 'AREA', 'area'],
        patterns: ['region', 'area', 'territory']
      },
      
      state: {
        primaryColumn: 'STATE',
        variations: ['STATE', 'state', 'State', 'PROVINCE', 'province'],
        patterns: ['state', 'province']
      },
      
      city: {
        primaryColumn: 'CITY',
        variations: ['CITY', 'city', 'City', 'TOWN', 'town'],
        patterns: ['city', 'town', 'municipality']
      },
      
      country: {
        primaryColumn: 'COUNTRY',
        variations: ['COUNTRY', 'country', 'Country', 'NATION', 'nation'],
        patterns: ['country', 'nation']
      },
      
      // Customer segments
      segment: {
        primaryColumn: 'SEGMENT',
        variations: ['SEGMENT', 'segment', 'Segment', 'CUSTOMER_SEGMENT', 'customer_segment'],
        patterns: ['segment', 'type']
      },
      
      // Financial metrics
      sales: {
        primaryColumn: 'SALES',
        variations: ['SALES', 'sales', 'Sales', 'REVENUE', 'revenue', 'AMOUNT', 'amount'],
        patterns: ['sales', 'revenue', 'amount', 'total']
      },
      
      profit: {
        primaryColumn: 'PROFIT',
        variations: ['PROFIT', 'profit', 'Profit', 'NET_PROFIT', 'net_profit', 'MARGIN_AMOUNT', 'margin'],
        patterns: ['profit', 'margin', 'earning']
      },
      
      discount: {
        primaryColumn: 'DISCOUNT',
        variations: ['DISCOUNT', 'discount', 'Discount', 'DISCOUNT_AMOUNT', 'discount_amount'],
        patterns: ['discount', 'rebate', 'reduction']
      },
      
      // Quantity metrics
      quantity: {
        primaryColumn: 'QUANTITY',
        variations: ['QUANTITY', 'quantity', 'Quantity', 'QTY', 'qty', 'UNITS', 'units'],
        patterns: ['quantity', 'qty', 'units', 'count']
      },
      
      // Date dimensions
      date: {
        primaryColumn: 'ORDER_DATE',
        variations: ['ORDER_DATE', 'order_date', 'Date', 'date', 'SHIP_DATE', 'ship_date', 'CREATED_DATE'],
        patterns: ['date', 'time', 'created', 'order', 'ship']
      },
      
      // Order identifiers
      order: {
        primaryColumn: 'ORDER_ID',
        variations: ['ORDER_ID', 'order_id', 'Order_ID', 'ORDER_NUMBER', 'order_number'],
        patterns: ['order', 'id', 'number']
      }
    };
    
    // Cache for resolved mappings to improve performance
    this.mappingCache = new Map();
  }

  /**
   * Main method to resolve a logical column name to actual column name
   * @param {Array} availableColumns - Array of actual column names from the data source
   * @param {string} logicalColumn - The logical column name we're looking for
   * @returns {string|null} - The actual column name or null if not found
   */
  resolveColumn(availableColumns, logicalColumn) {
    // Create cache key
    const cacheKey = `${availableColumns.join(',')}_${logicalColumn}`;
    
    // Check cache first
    if (this.mappingCache.has(cacheKey)) {
      return this.mappingCache.get(cacheKey);
    }
    
    const mapping = this.semanticMappings[logicalColumn];
    if (!mapping) {
      console.warn(`⚠️ No semantic mapping defined for: ${logicalColumn}`);
      return null;
    }
    
    let resolvedColumn = null;
    
    // Strategy 1: Exact match with primary column
    if (availableColumns.includes(mapping.primaryColumn)) {
      resolvedColumn = mapping.primaryColumn;
    }
    
    // Strategy 2: Exact match with variations
    if (!resolvedColumn) {
      for (const variation of mapping.variations) {
        if (availableColumns.includes(variation)) {
          resolvedColumn = variation;
          break;
        }
      }
    }
    
    // Strategy 3: Pattern-based fuzzy matching
    if (!resolvedColumn) {
      for (const pattern of mapping.patterns) {
        const found = availableColumns.find(col => 
          col.toLowerCase().includes(pattern.toLowerCase())
        );
        if (found) {
          resolvedColumn = found;
          break;
        }
      }
    }
    
    // Cache the result
    this.mappingCache.set(cacheKey, resolvedColumn);
    
    if (resolvedColumn) {
      console.log(`✅ Column resolved: ${logicalColumn} → ${resolvedColumn}`);
    } else {
      console.warn(`❌ Column not found: ${logicalColumn} in [${availableColumns.join(', ')}]`);
    }
    
    return resolvedColumn;
  }

  /**
   * Resolve multiple columns at once
   * @param {Array} availableColumns - Array of actual column names from the data source
   * @param {Array} logicalColumns - Array of logical column names to resolve
   * @returns {Object} - Object mapping logical names to actual names
   */
  resolveColumns(availableColumns, logicalColumns) {
    const resolved = {};
    
    for (const logicalColumn of logicalColumns) {
      const actualColumn = this.resolveColumn(availableColumns, logicalColumn);
      if (actualColumn) {
        resolved[logicalColumn] = actualColumn;
      }
    }
    
    return resolved;
  }

  /**
   * Get all possible logical columns that could be mapped
   * @returns {Array} - Array of all supported logical column names
   */
  getSupportedLogicalColumns() {
    return Object.keys(this.semanticMappings);
  }

  /**
   * Analyze available columns and suggest logical mappings
   * @param {Array} availableColumns - Array of actual column names from the data source
   * @returns {Object} - Object with suggestions for each logical column
   */
  suggestMappings(availableColumns) {
    const suggestions = {};
    
    for (const [logicalColumn, mapping] of Object.entries(this.semanticMappings)) {
      const actualColumn = this.resolveColumn(availableColumns, logicalColumn);
      suggestions[logicalColumn] = {
        actualColumn,
        confidence: this.calculateConfidence(availableColumns, logicalColumn, actualColumn),
        alternatives: this.findAlternatives(availableColumns, mapping)
      };
    }
    
    return suggestions;
  }

  /**
   * Calculate confidence score for a mapping
   * @private
   */
  calculateConfidence(availableColumns, logicalColumn, actualColumn) {
    if (!actualColumn) return 0;
    
    const mapping = this.semanticMappings[logicalColumn];
    
    // Exact primary match = 100%
    if (actualColumn === mapping.primaryColumn) return 1.0;
    
    // Exact variation match = 80%
    if (mapping.variations.includes(actualColumn)) return 0.8;
    
    // Pattern match = 60%
    return 0.6;
  }

  /**
   * Find alternative column names that could match
   * @private
   */
  findAlternatives(availableColumns, mapping) {
    const alternatives = [];
    
    for (const pattern of mapping.patterns) {
      const matches = availableColumns.filter(col => 
        col.toLowerCase().includes(pattern.toLowerCase()) &&
        !mapping.variations.includes(col)
      );
      alternatives.push(...matches);
    }
    
    return [...new Set(alternatives)]; // Remove duplicates
  }

  /**
   * Clear the mapping cache (useful when schema changes)
   */
  clearCache() {
    this.mappingCache.clear();
    console.log('🧹 Column mapping cache cleared');
  }

  /**
   * Clear old cache entries to prevent memory leaks
   */
  cleanupCache() {
    // If cache gets too large (>100 entries), clear half of it
    if (this.mappingCache.size > 100) {
      const entries = Array.from(this.mappingCache.entries());
      const entriesToKeep = entries.slice(entries.length / 2); // Keep newest half
      this.mappingCache.clear();
      entriesToKeep.forEach(([key, value]) => {
        this.mappingCache.set(key, value);
      });
      console.log(`🧹 Column mapping cache cleaned up: ${entriesToKeep.length} entries kept`);
    }
  }

  /**
   * Add or update a semantic mapping
   * @param {string} logicalColumn - The logical column name
   * @param {Object} mapping - The mapping configuration
   */
  addSemanticMapping(logicalColumn, mapping) {
    this.semanticMappings[logicalColumn] = mapping;
    this.clearCache(); // Clear cache since mappings changed
    console.log(`➕ Added semantic mapping for: ${logicalColumn}`);
  }

  /**
   * Validate that a data source has the minimum required columns
   * @param {Array} availableColumns - Array of actual column names
   * @param {Array} requiredLogicalColumns - Array of required logical column names
   * @returns {Object} - Validation result with missing columns
   */
  validateDataSource(availableColumns, requiredLogicalColumns) {
    const resolved = this.resolveColumns(availableColumns, requiredLogicalColumns);
    const missing = requiredLogicalColumns.filter(col => !resolved[col]);
    
    return {
      isValid: missing.length === 0,
      resolved,
      missing,
      availableColumns,
      requiredLogicalColumns
    };
  }
}

module.exports = ColumnMappingService;