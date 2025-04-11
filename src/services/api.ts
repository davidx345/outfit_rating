// src/services/api.ts

export interface AnalysisResult {
    rating: number;
    color_analysis: {
      primary_colors: string[];
      dominant_color: string;
    };
    skin_tone_analysis: {
      tone: string;
      color: string;
    };
    suggestions: string[];
    alternative_colors: string[];
    color_compatibility: {
      complementary_colors: string[];
      avoid_colors: string[];
    };
  }
  
  export const analyzeOutfit = async (file: File): Promise<AnalysisResult> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch("http://localhost:8000/api/analyze-outfit", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  };