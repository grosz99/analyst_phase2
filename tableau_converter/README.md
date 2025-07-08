# Intelligent Tableau Dashboard Converter

An AI-powered web application that converts Tableau workbooks (.twbx files) into functional web dashboards with accurate formula translation and data validation.

## 🚀 Current Version (v1.0 - Streamlit Prototype)

**What's Working Now:**
- ✅ **Streamlit App Generation**: Convert Tableau → Streamlit
- ✅ **Formula Extraction**: Extract ALL calculations from .twbx files
- ✅ **AI Translation**: Tableau formulas → Python/Pandas
- ✅ **Data Validation**: Compare results against Snowflake
- ✅ **Visual Analysis**: Reference image comparison

**Coming in Future Releases:**
- 🚧 **React Generation**: Convert Tableau → React/TypeScript
- 🚧 **Tableau Generation**: Convert Tableau → New Tableau format
- 🚧 **Advanced Visualizations**: Maps, custom charts
- 🚧 **Real-time Data**: Live database connections

## 🔐 Security First

**IMPORTANT**: This application handles sensitive data and credentials. Follow these security practices:

1. **Never commit credentials to version control**
2. **Use environment variables for all sensitive data**
3. **Review all files before pushing to GitHub**
4. **Use the provided .env.template, not the actual .env file**

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Clone the repository
git clone [your-repo-url]
cd tableau_converter

# Copy environment template
cp .env.template .env

# Edit .env with your actual credentials
nano .env
```

### 2. Fill in your credentials in .env:

```env
SNOWFLAKE_ACCOUNT=your_account_here
SNOWFLAKE_USER=your_user_here
SNOWFLAKE_PASSWORD=your_password_here
SNOWFLAKE_WAREHOUSE=your_warehouse_here
SNOWFLAKE_DATABASE=your_database_here
SNOWFLAKE_SCHEMA=your_schema_here
SNOWFLAKE_ROLE=your_role_here

ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Application

```bash
streamlit run app.py
```

## 🔧 Features

- **Formula Extraction**: Extracts ALL calculations from Tableau workbooks
- **AI Translation**: Converts Tableau formulas to Python/Pandas expressions
- **Data Validation**: Validates calculations against Snowflake source data
- **Visual Validation**: Compares generated dashboards to reference images
- **Production Ready**: Generates deployable Streamlit applications

## 📊 Supported Tableau Features

### Calculations
- ✅ Basic formulas (`[Sales] / [Profit]`)
- ✅ Conditional logic (`IF/THEN/ELSE`)
- ✅ Level of Detail (LOD) expressions
- ✅ Table calculations
- ✅ Date/time functions
- ✅ String operations
- ✅ Mathematical functions

### Visualizations
- ✅ Bar charts
- ✅ Line charts
- ✅ Scatter plots
- ✅ Tables
- 🚧 Maps (coming soon)
- 🚧 Advanced chart types

## 🧪 Testing

Run the test suite:

```bash
pytest tests/
```

## 📝 Usage

1. **Upload Files**: Upload your .twbx file, optional data source, and reference image
2. **Analysis**: Review extracted calculations and formulas
3. **Generate**: Create Streamlit application with translated formulas
4. **Validate**: Verify calculations match original Tableau results

## 🚀 Deployment

### Vercel Deployment

1. Install Vercel CLI
2. Configure environment variables in Vercel dashboard
3. Deploy with `vercel --prod`

### Security Notes for Deployment

- Never include .env files in deployment
- Use platform-specific environment variable management
- Regularly rotate API keys and passwords
- Monitor for any credential exposure

## 🔍 Architecture

```
tableau_converter/
├── app.py                    # Main Streamlit application
├── src/
│   ├── parsers/             # TWBX and XML parsing
│   ├── translators/         # Formula translation
│   ├── validation/          # Data validation
│   └── generators/          # Code generation
├── tests/                   # Test suite
└── requirements.txt         # Dependencies
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. **Ensure no credentials are committed**
4. Submit a pull request

## ⚠️ Security Checklist

Before committing:
- [ ] No credentials in code
- [ ] .env file is gitignored
- [ ] No sensitive data in comments
- [ ] All secrets use environment variables
- [ ] .gitignore includes all sensitive file patterns

## 📄 License

[Your License Here]