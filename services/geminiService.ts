
import { GoogleGenAI, Type } from "@google/genai";
import { DocCategory } from "../types";

export const geminiService = {
  // Suggest a document category based on filename
  async suggestCategory(fileName: string, contentPrefix?: string): Promise<DocCategory> {
    // ALWAYS use this direct initialization pattern
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Based on the file name "${fileName}" and initial content hint "${contentPrefix || 'unknown'}", 
    suggest which of these categories it belongs to: ${Object.values(DocCategory).join(', ')}. 
    Return ONLY the category name. If unsure, default to Others Documents.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      // Access the .text property directly
      const text = response.text || '';
      return (Object.values(DocCategory).find(c => text.includes(c)) as DocCategory) || DocCategory.OTHERS;
    } catch (error) {
      console.error("Gemini failed to suggest category:", error);
      return DocCategory.OTHERS;
    }
  },

  // Extract metadata and suggested name from document image
  async analyzeDocument(base64Data: string): Promise<{ suggestedName: string; category: DocCategory }> {
    // ALWAYS use this direct initialization pattern
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: "Extract a professional file name and the most suitable document category (Identity Documents, Vehicle Documents, Education Documents, Banking Documents, Insurance Documents, Others Documents) for this scanned image." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedName: { type: Type.STRING },
              category: { type: Type.STRING, enum: Object.values(DocCategory) }
            },
            required: ["suggestedName", "category"]
          }
        }
      });
      // Access the .text property directly and parse the JSON response
      const jsonStr = response.text || '{}';
      return JSON.parse(jsonStr);
    } catch (error) {
      return { suggestedName: "Scanned_Document", category: DocCategory.OTHERS };
    }
  }
};
