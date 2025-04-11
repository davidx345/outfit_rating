// src/app/page.tsx
"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"take" | "upload">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const response = await fetch("http://localhost:8000/api/analyze-outfit", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError("Failed to analyze outfit. Please try again.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="py-6">
        <h1 className="text-4xl font-bold">FashionLens</h1>
      </header>

      <main className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4">Analyze Your Outfit</h2>
        <p className="text-gray-400 mb-6">
          Take a photo of your outfit to get ratings and suggestions
        </p>

        {analysisResult ? (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Analysis Results</h3>
            
            <div className="mb-4">
              <p className="text-gray-400 mb-2">Rating</p>
              <div className="text-2xl font-bold">{analysisResult.rating.toFixed(1)}/10</div>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 mb-2">Color Analysis</p>
              <div className="flex gap-2 my-2">
                {analysisResult.color_analysis.primary_colors.map((color: string, index: number) => (
                  <div 
                    key={index} 
                    className="w-8 h-8 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 mb-2">Skin Tone</p>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: analysisResult.skin_tone_analysis.color }}
                />
                <span>{analysisResult.skin_tone_analysis.tone}</span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-400 mb-2">Suggestions</p>
              <ul className="list-disc pl-5 space-y-1">
                {analysisResult.suggestions.map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <button
              onClick={resetAnalysis}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium"
            >
              Analyze Another Outfit
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
              <div className="flex">
                <button
                  className={`flex-1 py-3 flex justify-center items-center gap-2 ${
                    activeTab === "take" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400"
                  }`}
                  onClick={() => setActiveTab("take")}
                >
                  <Camera size={20} />
                  <span>Take Photo</span>
                </button>
                <button
                  className={`flex-1 py-3 flex justify-center items-center gap-2 ${
                    activeTab === "upload" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400"
                  }`}
                  onClick={() => setActiveTab("upload")}
                >
                  <svg 
                    className="w-5 h-5" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Upload Photo</span>
                </button>
              </div>

              <div
                className="p-6 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer h-80 flex items-center justify-center"
                onClick={() => document.getElementById("fileInput")?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {previewUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <div className="mb-4 flex justify-center">
                      <svg
                        className="w-16 h-16 text-gray-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <p>Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isAnalyzing}
              className={`w-full py-3 rounded-lg font-medium ${
                selectedFile && !isAnalyzing
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isAnalyzing ? "Analyzing..." : (activeTab === "take" ? "Take Photo" : "Select File")}
            </button>

            {error && (
              <div className="mt-4 text-red-400 text-center">
                {error}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}