from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import io
from PIL import Image
from typing import List, Dict, Optional, Tuple
import os
from dotenv import load_dotenv
import numpy as np
from sklearn.cluster import KMeans

# Load environment variables
load_dotenv()

# MongoDB connection (with error handling)
MONGODB_URI = os.getenv("MONGODB_URI")
db = None

async def connect_to_mongo():
    global db
    if MONGODB_URI:
        try:
            client = AsyncIOMotorClient(MONGODB_URI)
            await client.admin.command('ping')
            db = client.outfit_rating
            print("Successfully connected to MongoDB")
        except Exception as e:
            print(f"Could not connect to MongoDB: {str(e)}")
            db = None

# Lifespan event for MongoDB connection
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield  # Required for lifespan to work

app = FastAPI()

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def analyze_colors(image: Image.Image) -> Dict:
    """
    Analyze the colors in the image and return color information
    """
    # Convert image to RGB if it isn't
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    # Resize image to make processing faster
    image = image.resize((150, 150))
    
    # Get colors from image
    colors = image.getcolors(image.size[0] * image.size[1])
    if not colors:
        return {"error": "No colors found"}
    
    # Sort colors by count (most common first)
    colors = sorted(colors, key=lambda x: x[0], reverse=True)
    
    # Convert RGB to hex
    hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for count, (r, g, b) in colors[:5]]
    
    return {
        "primary_colors": hex_colors,
        "dominant_color": hex_colors[0] if hex_colors else "#000000"
    }

def generate_alternative_colors(hex_color: str) -> List[str]:
    """
    Generate alternative colors based on the dominant color
    """
    # Remove the # from hex color
    hex_color = hex_color.lstrip('#')
    
    # Convert hex to RGB
    r = int(hex_color[:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:], 16)
    
    # Generate alternatives (complementary, lighter, darker)
    alternatives = [
        # Complementary color
        f"#{255-r:02x}{255-g:02x}{255-b:02x}",
        # Lighter version
        f"#{min(r+50,255):02x}{min(g+50,255):02x}{min(b+50,255):02x}",
        # Darker version
        f"#{max(r-50,0):02x}{max(g-50,0):02x}{max(b-50,0):02x}",
    ]
    
    return alternatives

def detect_skin_tone(image: Image.Image) -> Tuple[str, str]:
    """
    Detect the skin tone from the image and return the tone category and hex color
    """
    # Convert image to RGB if it isn't
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    # Resize image for faster processing
    image = image.resize((150, 150))
    
    # Convert to numpy array
    img_array = np.array(image)
    
    # Reshape the image to be a list of pixels
    pixels = img_array.reshape(-1, 3)
    
    # Use K-means to find the dominant colors
    kmeans = KMeans(n_clusters=5, random_state=42)
    kmeans.fit(pixels)
    
    # Get the colors
    colors = kmeans.cluster_centers_.astype(int)
    
    # Convert to hex
    hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in colors]
    
    # Simple skin tone detection based on RGB values
    # This is a basic implementation and could be improved with more sophisticated algorithms
    skin_tone = None
    skin_color = None
    
    for color in hex_colors:
        r = int(color[1:3], 16)
        g = int(color[3:5], 16)
        b = int(color[5:7], 16)
        
        # Basic skin tone detection rules
        if (r > 60 and g > 40 and b > 20 and
            abs(r - g) < 15 and
            r > g and r > b):
            skin_color = color
            # Categorize skin tone
            brightness = (r + g + b) / 3
            if brightness > 200:
                skin_tone = "Very Light"
            elif brightness > 170:
                skin_tone = "Light"
            elif brightness > 140:
                skin_tone = "Medium"
            elif brightness > 110:
                skin_tone = "Dark"
            else:
                skin_tone = "Very Dark"
            break
    
    if not skin_tone:
        skin_tone = "Unknown"
        skin_color = "#000000"
    
    return skin_tone, skin_color

def get_color_compatibility(rating: float, skin_tone: str, outfit_colors: List[str]) -> Dict:
    """
    Adjust rating based on color compatibility with skin tone
    """
    # Define color compatibility rules
    compatibility_rules = {
        "Very Light": {
            "complementary": ["#000000", "#1a1a1a", "#333333", "#4d4d4d"],  # Dark colors
            "avoid": ["#ffffff", "#f0f0f0", "#e6e6e6"]  # Very light colors
        },
        "Light": {
            "complementary": ["#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666"],
            "avoid": ["#ffffff", "#f0f0f0"]
        },
        "Medium": {
            "complementary": ["#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080"],
            "avoid": []
        },
        "Dark": {
            "complementary": ["#ffffff", "#f0f0f0", "#e6e6e6", "#d4d4d4"],
            "avoid": ["#000000", "#1a1a1a"]
        },
        "Very Dark": {
            "complementary": ["#ffffff", "#f0f0f0", "#e6e6e6", "#d4d4d4", "#b8b8b8"],
            "avoid": ["#000000"]
        }
    }
    
    # Get rules for detected skin tone
    rules = compatibility_rules.get(skin_tone, compatibility_rules["Medium"])
    
    # Check outfit colors against compatibility rules
    complementary_count = sum(1 for color in outfit_colors if color in rules["complementary"])
    avoid_count = sum(1 for color in outfit_colors if color in rules["avoid"])
    
    # Adjust rating based on compatibility
    if complementary_count > 0:
        rating += 0.5
    if avoid_count > 0:
        rating -= 0.5
    
    return {
        "adjusted_rating": min(max(rating, 0), 10),
        "complementary_colors": rules["complementary"],
        "avoid_colors": rules["avoid"]
    }

@app.post("/api/analyze-outfit")
async def analyze_outfit(file: UploadFile = File(...)):
    try:
        # Read and process the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Analyze colors
        color_analysis = analyze_colors(image)
        
        # Detect skin tone
        skin_tone, skin_color = detect_skin_tone(image)
        
        # Generate alternative colors
        alternative_colors = generate_alternative_colors(color_analysis["dominant_color"])
        
        # Get base rating
        base_rating = 8.5  # Placeholder rating
        
        # Get color compatibility analysis
        compatibility_analysis = get_color_compatibility(
            base_rating,
            skin_tone,
            color_analysis["primary_colors"]
        )
        
        # Create response
        response = {
            "rating": compatibility_analysis["adjusted_rating"],
            "color_analysis": color_analysis,
            "skin_tone_analysis": {
                "tone": skin_tone,
                "color": skin_color
            },
            "suggestions": [
                "The color combination works well together",
                f"Try this outfit in {alternative_colors[0]} for a bold look",
                f"A lighter shade like {alternative_colors[1]} could work for summer",
                f"This outfit complements your {skin_tone} skin tone",
                f"Consider trying colors like {', '.join(compatibility_analysis['complementary_colors'][:2])} for better contrast"
            ],
            "alternative_colors": alternative_colors,
            "color_compatibility": {
                "complementary_colors": compatibility_analysis["complementary_colors"],
                "avoid_colors": compatibility_analysis["avoid_colors"]
            }
        }
        
        # Store the analysis in MongoDB if available
        if db is not None:
            try:
                await db.analyses.insert_one({
                    **response,
                    "timestamp": datetime.utcnow(),
                    "image_size": f"{image.size[0]}x{image.size[1]}"
                })
            except Exception as e:
                print(f"Error storing in MongoDB: {str(e)}")
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)