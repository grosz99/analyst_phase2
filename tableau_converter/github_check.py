#!/usr/bin/env python3
"""
GitHub Deployment Security & Readiness Check
"""
import os
import re
from pathlib import Path

def check_for_secrets():
    """Check all files for potential secrets"""
    print("🔒 Security Check - Scanning for secrets...")
    
    dangerous_patterns = [
        r'password\s*[=:]\s*["\']?[^"\'\s]+',
        r'api[_-]?key\s*[=:]\s*["\']?[^"\'\s]+',
        r'secret\s*[=:]\s*["\']?[^"\'\s]+',
        r'token\s*[=:]\s*["\']?[^"\'\s]+',
        r'sk-[a-zA-Z0-9]{48}',  # Anthropic API key pattern
        r'[a-zA-Z0-9]{32,}',    # Long strings that might be keys
    ]
    
    issues_found = []
    safe_files = []
    
    # Check all Python files
    for py_file in Path('.').rglob('*.py'):
        if 'venv' in str(py_file) or '__pycache__' in str(py_file):
            continue
            
        try:
            content = py_file.read_text()
            
            # Skip if it's a template or example
            if 'your_' in content or 'template' in str(py_file).lower():
                safe_files.append(str(py_file))
                continue
            
            for pattern in dangerous_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    # Filter out obvious template values and safe patterns
                    real_matches = [m for m in matches if not any(
                        safe_pattern in m.lower() for safe_pattern in 
                        ['your_', 'template', 'example', 'placeholder', 'xxx', 'os.getenv', 'getenv(']
                    )]
                    
                    if real_matches:
                        issues_found.append((str(py_file), pattern, real_matches))
            
            safe_files.append(str(py_file))
            
        except Exception as e:
            print(f"  ⚠️ Could not read {py_file}: {e}")
    
    # Check other sensitive files
    for file_pattern in ['*.env', '*.json', '*.yaml', '*.yml', '*.txt']:
        for file_path in Path('.').rglob(file_pattern):
            if file_path.name in ['.env', 'secrets.json']:
                if file_path.exists():
                    issues_found.append((str(file_path), "sensitive file", ["File exists"]))
    
    # Results
    if issues_found:
        print(f"  ❌ Found {len(issues_found)} potential security issues:")
        for file_path, pattern, matches in issues_found:
            print(f"    📁 {file_path}")
            print(f"       Pattern: {pattern}")
            print(f"       Matches: {matches}")
    else:
        print(f"  ✅ No secrets found in {len(safe_files)} files")
    
    return len(issues_found) == 0

def check_gitignore():
    """Verify .gitignore is comprehensive"""
    print("\n📝 Checking .gitignore coverage...")
    
    required_patterns = [
        '.env',
        '*.env',
        '__pycache__/',
        '*.pyc',
        'venv/',
        '.vscode/',
        '.DS_Store',
        'credentials',
        'secrets',
        '*.twbx',
        '*.log'
    ]
    
    if not Path('.gitignore').exists():
        print("  ❌ .gitignore file missing!")
        return False
    
    gitignore_content = Path('.gitignore').read_text()
    
    missing_patterns = []
    for pattern in required_patterns:
        if pattern not in gitignore_content:
            missing_patterns.append(pattern)
    
    if missing_patterns:
        print(f"  ⚠️ Missing patterns: {missing_patterns}")
    else:
        print("  ✅ .gitignore comprehensive")
    
    return len(missing_patterns) == 0

def check_documentation():
    """Check documentation completeness"""
    print("\n📚 Checking documentation...")
    
    required_docs = ['README.md', 'DEPLOYMENT_GUIDE.md', 'requirements.txt']
    missing_docs = []
    
    for doc in required_docs:
        if not Path(doc).exists():
            missing_docs.append(doc)
        else:
            # Check if file has content
            if Path(doc).stat().st_size < 100:  # Less than 100 bytes
                missing_docs.append(f"{doc} (too small)")
    
    if missing_docs:
        print(f"  ❌ Missing/incomplete: {missing_docs}")
    else:
        print("  ✅ All documentation present")
    
    # Check README content
    if Path('README.md').exists():
        readme_content = Path('README.md').read_text()
        required_sections = ['setup', 'security', 'usage', 'deployment']
        
        missing_sections = []
        for section in required_sections:
            if section.lower() not in readme_content.lower():
                missing_sections.append(section)
        
        if missing_sections:
            print(f"  ⚠️ README missing sections: {missing_sections}")
        else:
            print("  ✅ README comprehensive")
    
    return len(missing_docs) == 0

def check_environment_template():
    """Check environment template exists"""
    print("\n🔧 Checking environment template...")
    
    if not Path('.env.template').exists():
        print("  ❌ .env.template missing!")
        return False
    
    template_content = Path('.env.template').read_text()
    
    required_vars = [
        'SNOWFLAKE_ACCOUNT',
        'SNOWFLAKE_USER', 
        'SNOWFLAKE_PASSWORD',
        'ANTHROPIC_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if var not in template_content:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"  ⚠️ Template missing variables: {missing_vars}")
    else:
        print("  ✅ Environment template complete")
    
    return len(missing_vars) == 0

def check_file_structure():
    """Check project structure"""
    print("\n📁 Checking project structure...")
    
    required_structure = {
        'app.py': 'Main application file',
        'src/': 'Source code directory',
        'src/parsers/': 'Parser modules',
        'src/translators/': 'Translation modules',
        'src/validation/': 'Validation modules',
        'tests/': 'Test directory',
        'requirements.txt': 'Dependencies',
        'vercel.json': 'Deployment config'
    }
    
    missing_items = []
    for item, description in required_structure.items():
        path = Path(item)
        if not path.exists():
            missing_items.append(f"{item} ({description})")
    
    if missing_items:
        print(f"  ⚠️ Missing structure: {missing_items}")
    else:
        print("  ✅ Project structure complete")
    
    return len(missing_items) == 0

def check_deployment_config():
    """Check deployment configuration"""
    print("\n🚀 Checking deployment configuration...")
    
    issues = []
    
    # Check vercel.json
    if Path('vercel.json').exists():
        print("  ✅ vercel.json present")
    else:
        issues.append("vercel.json missing")
    
    # Check streamlit config
    if Path('.streamlit/config.toml').exists():
        print("  ✅ Streamlit config present")
    else:
        issues.append("Streamlit config missing")
    
    # Check requirements
    if Path('requirements.txt').exists():
        reqs = Path('requirements.txt').read_text()
        essential_packages = ['streamlit', 'pandas', 'lxml']
        missing_packages = []
        
        for package in essential_packages:
            if package not in reqs:
                missing_packages.append(package)
        
        if missing_packages:
            issues.append(f"Missing packages: {missing_packages}")
        else:
            print("  ✅ Essential packages listed")
    
    return len(issues) == 0

def main():
    """Run all GitHub readiness checks"""
    print("🔍 GitHub Deployment Readiness Check")
    print("=" * 50)
    
    checks = [
        ("Security (No secrets)", check_for_secrets),
        ("Gitignore coverage", check_gitignore),
        ("Documentation", check_documentation),
        ("Environment template", check_environment_template),
        ("File structure", check_file_structure),
        ("Deployment config", check_deployment_config)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"  ❌ {check_name} check failed: {e}")
            results.append((check_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Readiness Summary")
    print("=" * 50)
    
    passed = 0
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {check_name}")
        if result:
            passed += 1
    
    total = len(results)
    score = (passed / total) * 100
    
    print(f"\n🎯 Overall Score: {passed}/{total} ({score:.1f}%)")
    
    if score >= 90:
        print("🚀 READY FOR GITHUB DEPLOYMENT!")
        print("   All critical checks passed. Safe to push to GitHub.")
    elif score >= 70:
        print("⚠️ MOSTLY READY - Address remaining issues before deployment")
    else:
        print("❌ NOT READY - Multiple issues need resolution")
    
    print(f"\n📋 Next Steps:")
    if score >= 90:
        print("  1. git init (if not already done)")
        print("  2. git add -A")
        print("  3. git commit -m 'Initial commit: Tableau Dashboard Converter'")
        print("  4. git remote add origin <your-github-repo-url>")
        print("  5. git push -u origin main")
    else:
        print("  1. Fix the failing checks above")
        print("  2. Re-run this script")
        print("  3. Deploy when all checks pass")

if __name__ == "__main__":
    main()