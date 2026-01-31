
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Category = 'technical' | 'behavioral' | 'scenario' | 'hr-fit';
export type Duration = '15m' | '30m' | '60m';
export type InterviewerStyle = 'faang' | 'startup' | 'service-based';

export interface ChatMessage {
  role: 'interviewer' | 'user';
  text: string;
}

// Fix: Define InterviewQuestion interface expected by QuestionCard
export interface InterviewQuestion {
  text: string;
  type: 'behavioral' | 'technical' | 'situational' | 'coding' | 'system-design' | 'culture-fit' | string;
  difficulty: 'easy' | 'medium' | 'hard';
  skills: string[];
  rationale: string;
  follow_ups?: string[];
}

export interface ResumeAnalysis {
  missingSkills: string[];
  followUpQuestions: string[];
  skillMap: {
    dsa: number;
    systemDesign: number;
    communication: number;
  };
}

export interface InterviewConfig {
  difficulty: Difficulty;
  category: Category;
  duration: Duration;
  style: InterviewerStyle;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  improvement_tips: string[];
  model_answer_outline: string;
}
