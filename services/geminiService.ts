
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratorOutput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    job_role: { type: Type.STRING },
    experience_level_hint: { 
      type: Type.STRING,
      description: "junior/mid/senior/unknown"
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          text: { type: Type.STRING },
          type: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          rationale: { type: Type.STRING },
          follow_ups: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["id", "text", "type", "difficulty", "rationale", "follow_ups"]
      }
    }
  },
  required: ["job_role", "experience_level_hint", "questions"]
};

export async function generateQuestions(
  resumeText: string,
  targetRole: string,
  numQuestions: number,
  mix: any
): Promise<GeneratorOutput> {
  const prompt = `
Resume: """
${resumeText}
"""

Role: "${targetRole}"
Number_of_questions: ${numQuestions}
Preferred_mix: ${JSON.stringify(mix)}

Act as an expert interview-question generator. Based on the resume and target role above, output role-specific, realistic questions that probe skills, experience, and potential gaps. 

Rules:
1. Base questions on explicit resume content where possible (skills, metrics, projects).
2. Tailor technical questions strictly to the job role.
3. Mix: at least 2 behavioral, at least 2 role-technical, and others as situational/problem-based.
4. Professional tone.
5. Question length should be approx 1 sentence. Rationale 1 sentence. 
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(resultText) as GeneratorOutput;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
