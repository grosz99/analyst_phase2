#!/bin/bash

# Snowflake + Anthropic Integration Environment Setup Script
# This script creates a Python virtual environment and installs dependencies

set -e  # Exit on any error

echo "🚀 Setting up Python environment for Snowflake + Anthropic integration..."

# Check if Python 3.8+ is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✓ Found Python $PYTHON_VERSION"

# Check if virtual environment already exists
VENV_DIR="venv"
if [ -d "$VENV_DIR" ]; then
    echo "⚠️  Virtual environment already exists at ./$VENV_DIR"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$VENV_DIR"
        echo "🗑️  Removed existing virtual environment"
    else
        echo "ℹ️  Using existing virtual environment"
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "✓ Virtual environment created at ./$VENV_DIR"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "📈 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo "✓ Dependencies installed successfully"
else
    echo "❌ requirements.txt not found in current directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Please copy .env.example to .env and configure your credentials."
    if [ -f ".env.example" ]; then
        echo "   Run: cp .env.example .env"
    fi
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Activate the virtual environment:"
echo "   source venv/bin/activate"
echo ""
echo "2. Configure your environment variables:"
echo "   cp .env.example .env"
echo "   # Then edit .env with your actual credentials"
echo ""
echo "3. To deactivate the virtual environment later:"
echo "   deactivate"
echo ""
echo "4. To run the backend server (once implemented):"
echo "   python -m uvicorn main:app --reload"
echo ""

# Make sure we're still in the virtual environment for final checks
echo "🔍 Verifying installation..."
python -c "import snowflake.connector; import anthropic; import fastapi; print('✓ All core dependencies imported successfully')"

echo "✅ Setup verification passed!"