
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeAnalysis, InterviewConfig, EvaluationResult } from "../types";

// Fix: Always use new GoogleGenAI({ apiKey: process.env.API_KEY }) as per strict guidelines.
// Using a factory function to ensure fresh instances if needed.
const createAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    skillMap: {
      type: Type.OBJECT,
      properties: {
        dsa: { type: Type.INTEGER },
        systemDesign: { type: Type.INTEGER },
        communication: { type: Type.INTEGER }
      },
      required: ["dsa", "systemDesign", "communication"]
    }
  },
  required: ["missingSkills", "followUpQuestions", "skillMap"]
};

const EVALUATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    feedback: { type: Type.STRING },
    improvement_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
    model_answer_outline: { type: Type.STRING }
  },
  required: ["score", "feedback", "improvement_tips", "model_answer_outline"]
};

export async function analyzeResume(
  resume: { text?: string; file?: { data: string; mimeType: string } },
  targetRole: string
): Promise<ResumeAnalysis> {
  const prompt = `Analyze this resume for a ${targetRole} position. Identify missing key skills, 3 likely follow-up questions based on their experience gaps, and score their skills (0-100) in DSA, System Design, and Communication based on their profile text/projects.`;
  
  const parts: any[] = [{ text: prompt }];
  if (resume.file) parts.push({ inlineData: { data: resume.file.data, mimeType: resume.file.mimeType } });
  else if (resume.text) parts.push({ text: resume.text });

  // Fix: Create instance right before call and use gemini-3-pro-preview for complex reasoning tasks
  const ai = createAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts },
    config: { responseMimeType: "application/json", responseSchema: ANALYSIS_SCHEMA },
  });

  // Fix: Access text property directly (not a method)
  return JSON.parse(response.text!) as ResumeAnalysis;
}

export async function getNextInterviewerMessage(
  config: InterviewConfig,
  history: { role: string; text: string }[],
  role: string,
  resume: string
): Promise<string> {
  const systemInstruction = `You are an elite interviewer from a ${config.style} company. 
  Difficulty: ${config.difficulty}. Category: ${config.category}. 
  Role: ${role}. Resume Summary: ${resume.substring(0, 1000)}.
  Stay in character. Ask probing questions one at a time. If it's the start, greet and ask the first question. 
  Be professional and slightly ${config.style === 'faang' ? 'intense' : config.style === 'startup' ? 'dynamic' : 'methodical'}.`;

  // Fix: Create instance right before call and use gemini-3-pro-preview for complex reasoning tasks
  const ai = createAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: history.map(h => ({ role: h.role === 'interviewer' ? 'model' : 'user', parts: [{ text: h.text }] })),
    config: { systemInstruction, temperature: 0.7 }
  });

  // Fix: Access text property directly
  return response.text || "I apologize, could you repeat that?";
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  role: string
): Promise<EvaluationResult> {
  const prompt = `Question: ${question}\nUser Answer: ${answer}\nTarget Role: ${role}\nEvaluate the answer. Provide a score (0-10), feedback, and improvement tips.`;
  
  // Fix: Create instance right before call and use gemini-3-pro-preview for complex reasoning tasks
  const ai = createAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: EVALUATION_SCHEMA },
  });

  // Fix: Access text property directly
  return JSON.parse(response.text!) as EvaluationResult;
}
