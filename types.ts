
export type QuestionType = 'behavioral' | 'technical' | 'situational' | 'coding' | 'system-design' | 'culture-fit';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'unknown';

export interface InterviewQuestion {
  id: number;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  rationale: string;
  follow_ups: string[];
}

export interface GeneratorOutput {
  job_role: string;
  experience_level_hint: ExperienceLevel;
  questions: InterviewQuestion[];
}

export interface UserPreferences {
  numQuestions: number;
  mix: {
    behavioral: number;
    technical: number;
    situational: number;
    coding: number;
  };
}
