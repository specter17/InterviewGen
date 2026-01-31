
import React from 'react';
import { InterviewQuestion } from '../types';

interface QuestionCardProps {
  question: InterviewQuestion;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const difficultyColors = {
    easy: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    hard: 'bg-red-100 text-red-700 border-red-200',
  };

  const typeIcons = {
    behavioral: '🤝',
    technical: '⚙️',
    situational: '💡',
    coding: '💻',
    'system-design': '🏗️',
    'culture-fit': '🌟',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcons[question.type as keyof typeof typeIcons] || '❓'}</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            {question.type.replace('-', ' ')}
          </span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${difficultyColors[question.difficulty as keyof typeof difficultyColors]}`}>
          {question.difficulty.toUpperCase()}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-3 leading-snug">
        {question.text}
      </h3>

      <div className="mb-4">
        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border-l-4 border-indigo-400">
          <span className="font-semibold text-indigo-700 mr-1 italic">Rationale:</span> 
          {question.rationale}
        </p>
      </div>

      {question.follow_ups && question.follow_ups.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Follow-ups</h4>
          <ul className="space-y-2">
            {question.follow_ups.map((followUp, idx) => (
              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                {followUp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
