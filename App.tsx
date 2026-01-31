
import React, { useState, useCallback } from 'react';
import { generateQuestions } from './services/geminiService';
import { GeneratorOutput, UserPreferences } from './types';
import QuestionCard from './components/QuestionCard';

const App: React.FC = () => {
  const [resume, setResume] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratorOutput | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'json'>('cards');
  const [error, setError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<UserPreferences>({
    numQuestions: 8,
    mix: {
      behavioral: 2,
      technical: 3,
      situational: 2,
      coding: 1
    }
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume.trim() || !role.trim()) {
      setError('Please provide both a resume and a target job role.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await generateQuestions(resume, role, prefs.numQuestions, prefs.mix);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyJson = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      alert('JSON copied to clipboard!');
    }
  }, [result]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">IG</div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">InterviewGen <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-indigo-600 transition-colors">Billing Docs</a>
             {result && (
                <button 
                  onClick={() => setResult(null)} 
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Start New
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!result ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Interview Questions</h2>
                <p className="text-slate-500 mb-8">Generate tailored interview prompts by matching a resume against a job role.</p>

                <form onSubmit={handleGenerate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Target Job Role</label>
                    <input 
                      type="text"
                      placeholder="e.g., Senior Frontend Engineer (React focus)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Resume Text</label>
                    <textarea 
                      placeholder="Paste the candidate's resume here..."
                      className="w-full h-64 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                      value={resume}
                      onChange={(e) => setResume(e.target.value)}
                    ></textarea>
                    <p className="mt-2 text-xs text-slate-400">Pro tip: Remove PII (names, emails) before pasting if privacy is a concern.</p>
                  </div>

                  <button 
                    disabled={loading}
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing Resume...
                      </>
                    ) : 'Generate Interview Plan'}
                  </button>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                      {error}
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Right: Info/Tips */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 rounded-2xl p-8 text-white">
                <h3 className="text-xl font-bold mb-4">How it works</h3>
                <ul className="space-y-4">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">1</span>
                    <p className="text-slate-300 text-sm">Our AI parses the resume's skills, achievements, and technical stack.</p>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">2</span>
                    <p className="text-slate-300 text-sm">It compares the background against the specific job role requirements.</p>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">3</span>
                    <p className="text-slate-300 text-sm">It generates a balanced set of technical and behavioral questions with rationales.</p>
                  </li>
                </ul>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                <h3 className="font-bold text-indigo-900 mb-3">Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-2">Number of Questions: {prefs.numQuestions}</label>
                    <input 
                      type="range" 
                      min="5" 
                      max="10" 
                      step="1" 
                      className="w-full accent-indigo-600"
                      value={prefs.numQuestions}
                      onChange={(e) => setPrefs(prev => ({...prev, numQuestions: parseInt(e.target.value)}))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-indigo-100 text-center">
                       <p className="text-xs font-bold text-slate-400 uppercase">Behavioral</p>
                       <p className="text-lg font-bold text-slate-800">2+</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-indigo-100 text-center">
                       <p className="text-xs font-bold text-slate-400 uppercase">Technical</p>
                       <p className="text-lg font-bold text-slate-800">2+</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <button onClick={() => setResult(null)} className="hover:text-indigo-600">Home</button>
                  <span>/</span>
                  <span className="font-medium text-slate-900">Questions for {result.job_role}</span>
                </nav>
                <h2 className="text-3xl font-extrabold text-slate-900">Interview Question Set</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-100">
                    Target: {result.job_role}
                  </span>
                  <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold border border-slate-200">
                    Level: {result.experience_level_hint.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
                <button 
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Cards
                </button>
                <button 
                  onClick={() => setViewMode('json')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'json' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  JSON
                </button>
              </div>
            </div>

            {/* Questions View */}
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.questions.map((q) => (
                  <QuestionCard key={q.id} question={q} />
                ))}
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute top-4 right-4 z-10">
                   <button 
                    onClick={copyJson}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all border border-slate-700"
                   >
                     Copy JSON
                   </button>
                </div>
                <pre className="bg-slate-900 text-indigo-300 p-8 rounded-2xl overflow-x-auto text-sm font-mono border border-slate-800 shadow-xl">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-8">
               <button 
                onClick={handleGenerate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
               >
                 {loading ? 'Regenerating...' : 'Regenerate Different Questions'}
               </button>
               <button 
                onClick={() => setResult(null)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-8 py-3 rounded-xl font-bold transition-all"
               >
                 Back to Setup
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="text-center py-8 text-slate-400 text-xs">
        &copy; {new Date().getFullYear()} InterviewGen Pro • Powered by Gemini AI
      </footer>
    </div>
  );
};

export default App;
