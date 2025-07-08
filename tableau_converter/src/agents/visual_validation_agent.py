"""
Visual Validation Agent - Compares generated dashboards with reference images
"""
import os
import base64
import io
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from PIL import Image
import cv2
import numpy as np
from dotenv import load_dotenv
import anthropic

load_dotenv()
logger = logging.getLogger(__name__)


@dataclass
class VisualValidationResult:
    """Result of visual validation"""
    similarity_score: float
    layout_accuracy: float
    color_accuracy: float
    component_matches: List[Dict[str, Any]]
    recommendations: List[str]
    is_valid: bool
    error_message: Optional[str] = None


@dataclass
class LayoutComponent:
    """Represents a layout component from image analysis"""
    type: str  # chart, text, filter, etc.
    position: Dict[str, int]  # x, y, width, height
    properties: Dict[str, Any]
    confidence: float


class VisualValidationAgent:
    """AI-powered visual validation agent"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.getenv('ANTHROPIC_API_KEY')
        )
        self.similarity_threshold = 0.85
        self.layout_threshold = 0.80
        self.color_threshold = 0.90
    
    def analyze_reference_image(self, image_file) -> Dict[str, Any]:
        """Analyze reference image to extract layout and design elements"""
        
        # Convert image to base64
        if hasattr(image_file, 'read'):
            image_bytes = image_file.read()
        else:
            with open(image_file, 'rb') as f:
                image_bytes = f.read()
        
        img_base64 = base64.b64encode(image_bytes).decode()
        
        prompt = """
        Analyze this Tableau dashboard image and provide detailed analysis:
        
        1. **Layout Structure**:
           - Overall grid structure and zones
           - Component positions and sizes
           - Spacing and alignment patterns
           
        2. **Visual Components**:
           - Chart types and their locations
           - Text elements (titles, labels, metrics)
           - Filter controls and their positions
           - Color schemes and themes
           
        3. **Design Elements**:
           - Color palette (primary, secondary, accent colors)
           - Typography (font sizes, weights, styles)
           - Visual hierarchy and emphasis
           - Brand elements and styling
           
        4. **Interactive Elements**:
           - Buttons, dropdowns, selectors
           - Hover states and interactions
           - Navigation elements
           
        5. **Data Visualization**:
           - Chart types (bar, line, pie, scatter, etc.)
           - Axis labels and scales
           - Data encoding (color, size, position)
           - Legends and annotations
        
        Return structured JSON with precise measurements and specifications.
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": img_base64
                            }
                        }
                    ]
                }]
            )
            
            analysis = json.loads(response.content[0].text)
            logger.info("Successfully analyzed reference image")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Reference image analysis failed: {e}")
            return {"error": str(e)}
    
    def validate_generated_dashboard(self, 
                                   generated_screenshot: bytes,
                                   reference_analysis: Dict[str, Any]) -> VisualValidationResult:
        """Validate generated dashboard against reference"""
        
        try:
            # Convert screenshot to base64
            screenshot_base64 = base64.b64encode(generated_screenshot).decode()
            
            prompt = f"""
            Compare this generated dashboard screenshot with the reference analysis:
            
            Reference Analysis:
            {json.dumps(reference_analysis, indent=2)}
            
            Evaluate:
            1. **Layout Similarity**: How well does the layout match?
            2. **Component Accuracy**: Are all components present and positioned correctly?
            3. **Visual Consistency**: Colors, fonts, spacing match?
            4. **Data Accuracy**: Do charts show similar data patterns?
            5. **Interactive Elements**: Are controls in the right places?
            
            Provide scores (0-100) for each category and overall recommendations.
            Return structured JSON with validation results.
            """
            
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=3000,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": screenshot_base64
                            }
                        }
                    ]
                }]
            )
            
            validation_data = json.loads(response.content[0].text)
            
            # Extract scores
            similarity_score = validation_data.get('similarity_score', 0) / 100
            layout_accuracy = validation_data.get('layout_accuracy', 0) / 100
            color_accuracy = validation_data.get('color_accuracy', 0) / 100
            
            # Determine if valid
            is_valid = (similarity_score >= self.similarity_threshold and
                       layout_accuracy >= self.layout_threshold and
                       color_accuracy >= self.color_threshold)
            
            return VisualValidationResult(
                similarity_score=similarity_score,
                layout_accuracy=layout_accuracy,
                color_accuracy=color_accuracy,
                component_matches=validation_data.get('component_matches', []),
                recommendations=validation_data.get('recommendations', []),
                is_valid=is_valid
            )
            
        except Exception as e:
            logger.error(f"Visual validation failed: {e}")
            return VisualValidationResult(
                similarity_score=0.0,
                layout_accuracy=0.0,
                color_accuracy=0.0,
                component_matches=[],
                recommendations=[],
                is_valid=False,
                error_message=str(e)
            )
    
    def calculate_structural_similarity(self, 
                                      reference_image: bytes,
                                      generated_image: bytes) -> float:
        """Calculate structural similarity using computer vision"""
        
        try:
            # Convert bytes to numpy arrays
            ref_array = np.frombuffer(reference_image, np.uint8)
            gen_array = np.frombuffer(generated_image, np.uint8)
            
            # Decode images
            ref_img = cv2.imdecode(ref_array, cv2.IMREAD_COLOR)
            gen_img = cv2.imdecode(gen_array, cv2.IMREAD_COLOR)
            
            # Resize to same dimensions
            height, width = ref_img.shape[:2]
            gen_img = cv2.resize(gen_img, (width, height))
            
            # Convert to grayscale
            ref_gray = cv2.cvtColor(ref_img, cv2.COLOR_BGR2GRAY)
            gen_gray = cv2.cvtColor(gen_img, cv2.COLOR_BGR2GRAY)
            
            # Calculate SSIM
            from skimage.metrics import structural_similarity as ssim
            similarity = ssim(ref_gray, gen_gray)
            
            return similarity
            
        except Exception as e:
            logger.error(f"SSIM calculation failed: {e}")
            return 0.0
    
    def extract_color_palette(self, image_bytes: bytes) -> List[str]:
        """Extract dominant colors from image"""
        
        try:
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB
            image = image.convert('RGB')
            
            # Get dominant colors using k-means clustering
            from sklearn.cluster import KMeans
            
            # Reshape image data
            data = np.array(image).reshape((-1, 3))
            
            # Apply k-means clustering
            kmeans = KMeans(n_clusters=5, random_state=42)
            kmeans.fit(data)
            
            # Get dominant colors
            colors = kmeans.cluster_centers_
            
            # Convert to hex
            hex_colors = []
            for color in colors:
                hex_color = '#{:02x}{:02x}{:02x}'.format(
                    int(color[0]), int(color[1]), int(color[2])
                )
                hex_colors.append(hex_color)
            
            return hex_colors
            
        except Exception as e:
            logger.error(f"Color extraction failed: {e}")
            return []
    
    def generate_improvement_suggestions(self, 
                                       validation_result: VisualValidationResult,
                                       reference_analysis: Dict[str, Any]) -> List[str]:
        """Generate specific improvement suggestions"""
        
        suggestions = []
        
        # Layout suggestions
        if validation_result.layout_accuracy < self.layout_threshold:
            suggestions.append("📐 Adjust component positioning to better match reference layout")
            suggestions.append("📏 Check spacing and alignment between elements")
        
        # Color suggestions
        if validation_result.color_accuracy < self.color_threshold:
            suggestions.append("🎨 Update color scheme to match reference dashboard")
            suggestions.append("🌈 Ensure consistent color usage across all components")
        
        # Component suggestions
        for component in validation_result.component_matches:
            if component.get('accuracy', 1.0) < 0.8:
                suggestions.append(f"🔧 Improve {component.get('type', 'component')} accuracy")
        
        # General suggestions
        if validation_result.similarity_score < self.similarity_threshold:
            suggestions.append("⚡ Review overall dashboard structure and styling")
            suggestions.append("🎯 Focus on key visual elements that differ most")
        
        return suggestions
    
    def create_validation_report(self, 
                               validation_result: VisualValidationResult,
                               reference_analysis: Dict[str, Any]) -> str:
        """Create comprehensive validation report"""
        
        report = f"""
# Visual Validation Report

## Overall Assessment
- **Similarity Score**: {validation_result.similarity_score:.1%}
- **Layout Accuracy**: {validation_result.layout_accuracy:.1%}
- **Color Accuracy**: {validation_result.color_accuracy:.1%}
- **Status**: {'✅ PASSED' if validation_result.is_valid else '❌ NEEDS IMPROVEMENT'}

## Detailed Analysis

### Layout Validation
Layout accuracy: {validation_result.layout_accuracy:.1%}
{'✅ Layout matches reference well' if validation_result.layout_accuracy >= self.layout_threshold else '⚠️ Layout needs adjustment'}

### Color Validation
Color accuracy: {validation_result.color_accuracy:.1%}
{'✅ Color scheme matches reference' if validation_result.color_accuracy >= self.color_threshold else '⚠️ Color scheme needs adjustment'}

### Component Analysis
"""
        
        for component in validation_result.component_matches:
            status = "✅" if component.get('accuracy', 0) >= 0.8 else "⚠️"
            report += f"- {status} {component.get('type', 'Component')}: {component.get('accuracy', 0):.1%}\n"
        
        report += f"""

## Recommendations
"""
        
        for rec in validation_result.recommendations:
            report += f"- {rec}\n"
        
        if validation_result.error_message:
            report += f"""

## Errors
- {validation_result.error_message}
"""
        
        return report