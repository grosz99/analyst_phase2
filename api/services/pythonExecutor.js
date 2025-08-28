const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * Python Code Execution Service
 * Safely executes Python pandas code against loaded datasets
 */
class PythonExecutor {
  constructor() {
    this.tempDir = path.join(__dirname, '..', 'temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create temp directory:', error.message);
    }
  }

  /**
   * Execute Python code with data and return results
   * @param {string} pythonCode - The Python code to execute
   * @param {Array} data - The dataset as array of objects
   * @param {string} userQuestion - Original user question for context
   * @returns {Promise<Object>} Execution results
   */
  async executePythonCode(pythonCode, data, userQuestion = '') {
    const startTime = Date.now();
    
    try {
      console.log('🐍 Starting Python code execution...');
      console.log('📊 Dataset size:', data.length, 'rows');
      console.log('❓ Question:', userQuestion);
      
      // Prepare the Python script
      const scriptContent = this.buildPythonScript(pythonCode, data);
      
      // Write script and data files
      const scriptPath = path.join(this.tempDir, `analysis_${Date.now()}.py`);
      await fs.writeFile(scriptPath, scriptContent);
      
      // Execute Python script
      const result = await this.runPythonScript(scriptPath);
      
      // Clean up
      await fs.unlink(scriptPath).catch(() => {});
      
      const duration = Date.now() - startTime;
      console.log('✅ Python execution completed in', duration, 'ms');
      
      return {
        success: true,
        results: result.results,
        output: result.output,
        error: null,
        execution_time: duration,
        code_executed: pythonCode
      };

    } catch (error) {
      console.error('❌ Python execution failed:', error.message);
      
      return {
        success: false,
        results: null,
        output: null,
        error: error.message,
        execution_time: Date.now() - startTime,
        code_executed: pythonCode
      };
    }
  }

  /**
   * Build complete Python script with data loading and execution
   */
  buildPythonScript(userCode, data) {
    // Clean and prepare the user's Python code
    const cleanCode = userCode
      .replace(/```python/g, '')
      .replace(/```/g, '')
      .trim();

    return `
import pandas as pd
import numpy as np
import json
import sys
from io import StringIO

# Redirect stdout to capture output
old_stdout = sys.stdout
sys.stdout = mystdout = StringIO()

try:
    # Load the dataset
    data = ${JSON.stringify(data)}
    df = pd.DataFrame(data)
    
    # Execute user code
    ${cleanCode}
    
    # Capture any printed output
    output = mystdout.getvalue()
    
    # Try to get the result variable if it exists
    if 'result' in locals():
        if isinstance(result, pd.DataFrame):
            result_data = {
                'type': 'dataframe',
                'data': result.to_dict('records'),
                'columns': result.columns.tolist(),
                'shape': result.shape
            }
        else:
            result_data = {
                'type': 'value',
                'data': str(result),
                'value': result
            }
    else:
        result_data = {
            'type': 'output',
            'data': output
        }
    
    # Return results as JSON
    print("__RESULTS_START__")
    print(json.dumps(result_data))
    print("__RESULTS_END__")
    
except Exception as e:
    print("__ERROR_START__")
    print(f"Python execution error: {str(e)}")
    print("__ERROR_END__")
finally:
    sys.stdout = old_stdout
`;
  }

  /**
   * Run Python script and capture output
   */
  async runPythonScript(scriptPath) {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}. Error: ${stderr}`));
          return;
        }

        try {
          // Extract results from stdout
          const resultsMatch = stdout.match(/__RESULTS_START__([\s\S]*?)__RESULTS_END__/);
          const errorMatch = stdout.match(/__ERROR_START__([\s\S]*?)__ERROR_END__/);

          if (errorMatch) {
            reject(new Error(errorMatch[1].trim()));
            return;
          }

          if (resultsMatch) {
            const resultsJson = resultsMatch[1].trim();
            const results = JSON.parse(resultsJson);
            resolve({
              results: results,
              output: stdout.replace(/__RESULTS_START__[\s\S]*?__RESULTS_END__/, '').trim()
            });
          } else {
            resolve({
              results: { type: 'output', data: stdout },
              output: stdout
            });
          }
        } catch (error) {
          reject(new Error(`Failed to parse Python results: ${error.message}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Check if Python is available
   */
  async checkPythonAvailability() {
    return new Promise((resolve) => {
      const python = spawn('python3', ['--version']);
      python.on('close', (code) => {
        resolve(code === 0);
      });
      python.on('error', () => {
        resolve(false);
      });
    });
  }
}

module.exports = PythonExecutor;