// Saved Queries Service
// For demo purposes, using localStorage to simulate database persistence
// In production, this would connect to a real database API

const STORAGE_KEY = 'beacon_saved_queries';

class SavedQueriesService {
  constructor() {
    this.queries = this.loadQueries();
  }

  // Load queries from storage
  loadQueries() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading saved queries:', error);
      return [];
    }
  }

  // Save queries to storage
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queries));
    } catch (error) {
      console.error('Error saving queries:', error);
    }
  }

  // Get all saved queries
  getAllQueries() {
    return [...this.queries].sort((a, b) => 
      new Date(b.lastUsed || b.createdAt) - new Date(a.lastUsed || a.createdAt)
    );
  }

  // Get queries by category
  getQueriesByCategory(category) {
    return this.queries.filter(q => q.category === category);
  }

  // Save a new query
  saveQuery(queryData) {
    const newQuery = {
      id: Date.now().toString(),
      question: queryData.question,
      description: queryData.description || '',
      category: queryData.category || 'General',
      dataSource: queryData.dataSource || null,
      filters: queryData.filters || {},
      tags: queryData.tags || [],
      createdAt: new Date().toISOString(),
      createdBy: queryData.createdBy || 'Current User',
      usageCount: 0,
      lastUsed: null,
      isFavorite: false,
      results: queryData.results || null // Optional: store sample results
    };

    this.queries.push(newQuery);
    this.saveToStorage();
    return newQuery;
  }

  // Update an existing query
  updateQuery(queryId, updates) {
    const index = this.queries.findIndex(q => q.id === queryId);
    if (index !== -1) {
      this.queries[index] = { ...this.queries[index], ...updates };
      this.saveToStorage();
      return this.queries[index];
    }
    return null;
  }

  // Delete a query
  deleteQuery(queryId) {
    const index = this.queries.findIndex(q => q.id === queryId);
    if (index !== -1) {
      const deleted = this.queries.splice(index, 1);
      this.saveToStorage();
      return deleted[0];
    }
    return null;
  }

  // Mark query as used
  markAsUsed(queryId) {
    const query = this.queries.find(q => q.id === queryId);
    if (query) {
      query.usageCount = (query.usageCount || 0) + 1;
      query.lastUsed = new Date().toISOString();
      this.saveToStorage();
      return query;
    }
    return null;
  }

  // Toggle favorite status
  toggleFavorite(queryId) {
    const query = this.queries.find(q => q.id === queryId);
    if (query) {
      query.isFavorite = !query.isFavorite;
      this.saveToStorage();
      return query;
    }
    return null;
  }

  // Search queries
  searchQueries(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.queries.filter(q => 
      q.question.toLowerCase().includes(term) ||
      q.description.toLowerCase().includes(term) ||
      q.tags.some(tag => tag.toLowerCase().includes(term)) ||
      q.category.toLowerCase().includes(term)
    );
  }

  // Get popular queries
  getPopularQueries(limit = 5) {
    return [...this.queries]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }

  // Get recent queries
  getRecentQueries(limit = 5) {
    return [...this.queries]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  // Get favorite queries
  getFavoriteQueries() {
    return this.queries.filter(q => q.isFavorite);
  }

  // Initialize with demo data
  initializeDemoData() {
    const demoQueries = [
      {
        question: "What are the top 10 most profitable customers?",
        description: "Identifies customers with highest profit margins for targeted sales strategies",
        category: "Sales Analysis",
        dataSource: "ORDERS",
        tags: ["profitability", "customers", "top performers"],
        createdBy: "Sales Team"
      },
      {
        question: "How do different ship modes compare in terms of cost and delivery time?",
        description: "Analyzes shipping efficiency and cost-effectiveness across different shipping methods",
        category: "Operations",
        dataSource: "ORDERS",
        tags: ["shipping", "logistics", "cost analysis"],
        createdBy: "Operations Team"
      },
      {
        question: "Which regions show the highest sales growth year-over-year?",
        description: "Tracks regional performance trends to identify growth opportunities",
        category: "Sales Analysis",
        dataSource: "ORDERS",
        tags: ["regional analysis", "growth", "trends"],
        createdBy: "Sales Team"
      },
      {
        question: "What products have the highest return rates?",
        description: "Identifies problematic products that may need quality improvements",
        category: "Quality Control",
        dataSource: "PRODUCTS",
        tags: ["returns", "quality", "product analysis"],
        createdBy: "Quality Team"
      },
      {
        question: "Show me customer distribution by segment and region",
        description: "Provides demographic breakdown for targeted marketing campaigns",
        category: "Customer Analytics",
        dataSource: "CUSTOMERS",
        tags: ["demographics", "segmentation", "regional"],
        createdBy: "Marketing Team"
      }
    ];

    // Only initialize if no queries exist
    if (this.queries.length === 0) {
      demoQueries.forEach((query, index) => {
        this.saveQuery({
          ...query,
          usageCount: Math.floor(Math.random() * 20) + 1,
          lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        // Make some favorites
        if (index < 2) {
          this.toggleFavorite(this.queries[this.queries.length - 1].id);
        }
      });
    }
  }

  // Get categories
  getCategories() {
    const categories = new Set(this.queries.map(q => q.category));
    return Array.from(categories).sort();
  }

  // Get all tags
  getAllTags() {
    const tags = new Set();
    this.queries.forEach(q => {
      q.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }
}

// Create singleton instance
const savedQueriesService = new SavedQueriesService();

// Initialize with demo data
savedQueriesService.initializeDemoData();

export default savedQueriesService;