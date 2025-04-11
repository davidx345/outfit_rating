// src/components/AnalysisResult.tsx
import Image from "next/image";

interface AnalysisResultProps {
  result: {
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
  };
  imageUrl: string;
  onReset: () => void;
}

export default function AnalysisResult({ result, imageUrl, onReset }: AnalysisResultProps) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">Results</h3>
        
        <div className="mb-6 relative h-48 w-full">
          <Image
            src={imageUrl}
            alt="Analyzed outfit"
            fill
            className="object-contain rounded-lg"
          />
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-400">Style Rating</p>
            <div className="text-xl font-bold">{result.rating.toFixed(1)}/10</div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${(result.rating / 10) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-400 mb-2">Color Palette</p>
          <div className="flex gap-2">
            {result.color_analysis.primary_colors.slice(0, 5).map((color, index) => (
              <div
                key={index}
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-400 mb-2">Skin Tone</p>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: result.skin_tone_analysis.color }}
            />
            <span>{result.skin_tone_analysis.tone}</span>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-400 mb-2">Suggestions</p>
          <ul className="space-y-2">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-400 mb-2">Try These Colors</p>
          <div className="flex gap-2">
            {result.alternative_colors.map((color, index) => (
              <div
                key={index}
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
        
        <button
          onClick={onReset}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium"
        >
          Analyze Another Outfit
        </button>
      </div>
    </div>
  );
}