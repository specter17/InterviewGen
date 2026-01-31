
import React, { useState, useRef, useEffect } from 'react';
import { analyzeResume, getNextInterviewerMessage, evaluateAnswer } from './services/geminiService';
import { ResumeAnalysis, InterviewConfig, EvaluationResult, ChatMessage } from './types';

const App: React.FC = () => {
  // Global State
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume Data
  const [role, setRole] = useState('Senior Frontend Developer');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

  // Config State
  const [config, setConfig] = useState<InterviewConfig>({
    difficulty: 'intermediate',
    category: 'technical',
    duration: '30m',
    style: 'faang'
  });

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  // Storing evaluations for export
  const [evaluationHistory, setEvaluationHistory] = useState<Record<number, EvaluationResult>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });
  };

  const handleStart = async () => {
    if (!role || (!resumeText && !resumeFile)) {
      setError("Please provide a role and a resume to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resumeInput = resumeFile ? { file: { data: resumeFile.data, mimeType: resumeFile.mimeType } } : { text: resumeText };
      const analysisData = await analyzeResume(resumeInput, role);
      setAnalysis(analysisData);
      setView('dashboard');
      
      // Reset history on new session
      setEvaluationHistory({});
      setMessages([]);

      // Start initial chat
      setIsTyping(true);
      const firstMsg = await getNextInterviewerMessage(config, [], role, resumeText || "File provided");
      setMessages([{ role: 'interviewer', text: firstMsg }]);
    } catch (err: any) {
      setError(err.message || "Failed to initialize interview.");
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    const newUserMsg: ChatMessage = { role: 'user', text: userInput };
    const currentMessages = [...messages, newUserMsg];
    setMessages(currentMessages);
    setUserInput('');
    setIsTyping(true);
    setEvaluation(null);
    setShowModelAnswer(false);

    try {
      const reply = await getNextInterviewerMessage(config, currentMessages, role, resumeText || "File provided");
      setMessages(prev => [...prev, { role: 'interviewer', text: reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEvaluate = async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const lastInterviewerMsgIdx = messages.findLastIndex(m => m.role === 'interviewer');
    const lastInterviewerMsg = messages[lastInterviewerMsgIdx];
    
    if (!lastUserMsg || !lastInterviewerMsg) return;

    setLoading(true);
    try {
      const evalData = await evaluateAnswer(lastInterviewerMsg.text, lastUserMsg.text, role);
      setEvaluation(evalData);
      // Map evaluation to the message index for later report generation
      setEvaluationHistory(prev => ({ ...prev, [lastInterviewerMsgIdx + 1]: evalData }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (messages.length === 0) return;

    let report = `AI INTERVIEW INTELLIGENCE - SESSION REPORT\n`;
    report += `==========================================\n\n`;
    report += `Role: ${role}\n`;
    report += `Difficulty: ${config.difficulty}\n`;
    report += `Interviewer Style: ${config.style}\n`;
    report += `Date: ${new Date().toLocaleString()}\n\n`;

    if (analysis) {
      report += `RESUME ANALYSIS\n`;
      report += `---------------\n`;
      report += `Missing Skills: ${analysis.missingSkills.join(', ')}\n`;
      report += `Skill Scores: DSA(${analysis.skillMap.dsa}%), System Design(${analysis.skillMap.systemDesign}%), Communication(${analysis.skillMap.communication}%)\n\n`;
    }

    report += `INTERVIEW TRANSCRIPT\n`;
    report += `--------------------\n`;
    messages.forEach((m, idx) => {
      report += `${m.role.toUpperCase()}: ${m.text}\n`;
      const evalItem = evaluationHistory[idx];
      if (evalItem) {
        report += `[EVALUATION] Score: ${evalItem.score}/10\n`;
        report += `[FEEDBACK] ${evalItem.feedback}\n`;
        report += `[TIPS] ${evalItem.improvement_tips.join(' | ')}\n`;
      }
      report += `\n`;
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Interview_Report_${role.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent)] pointer-events-none" />
        <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
              <span>Next-Gen Interview Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-indigo-200 to-indigo-500 bg-clip-text text-transparent">
              Master the Art of <br /> the Interview.
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
              Our AI simulates elite FAANG interviewers, analyzes your resume gaps, and gives you real-time feedback to land your dream role.
            </p>
          </header>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-left space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Target Role</label>
                <input 
                  type="text" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="text-left space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Resume Input</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-slate-900 border border-slate-700 hover:border-indigo-500 rounded-xl px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {resumeFile ? '✓ ' + resumeFile.name : 'Upload PDF/Image'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="application/pdf,image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const data = await fileToBase64(file);
                        setResumeFile({ data, mimeType: file.type, name: file.name });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <textarea 
              placeholder="Or paste your resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 h-32 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
            />
            <button 
              onClick={handleStart}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Initializing AI Intelligence...' : 'Get Started'}
            </button>
            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
          </div>

          <footer className="pt-8 flex items-center justify-center gap-8 opacity-40 grayscale">
             <span className="font-black text-xl tracking-tighter">FAANG</span>
             <span className="font-black text-xl tracking-tighter">STARTUP</span>
             <span className="font-black text-xl tracking-tighter">SERVICE</span>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f172a] text-slate-200 flex overflow-hidden">
      {/* Sidebar: Configuration */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white">IQ</div>
          <span className="font-bold tracking-tight">Intelligence Dashboard</span>
        </div>

        <div className="p-6 space-y-8">
          {/* Difficulty */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Difficulty Level</h3>
            <div className="grid grid-cols-1 gap-1">
              {['beginner', 'intermediate', 'advanced'].map((d) => (
                <button 
                  key={d}
                  onClick={() => setConfig(prev => ({...prev, difficulty: d as any}))}
                  className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all text-left ${config.difficulty === d ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </section>

          {/* Categories */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interview Category</h3>
            <div className="grid grid-cols-2 gap-1">
              {['technical', 'behavioral', 'scenario', 'hr-fit'].map((c) => (
                <button 
                  key={c}
                  onClick={() => setConfig(prev => ({...prev, category: c as any}))}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold capitalize transition-all text-center ${config.category === c ? 'bg-slate-700 text-white border border-slate-600' : 'bg-slate-800/30 text-slate-500 hover:bg-slate-800'}`}
                >
                  {c.replace('-', ' ')}
                </button>
              ))}
            </div>
          </section>

          {/* Duration */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session Duration</h3>
            <div className="flex bg-slate-800/50 p-1 rounded-xl">
              {['15m', '30m', '60m'].map((t) => (
                <button 
                  key={t}
                  onClick={() => setConfig(prev => ({...prev, duration: t as any}))}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.duration === t ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Style */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interviewer Persona</h3>
            <div className="space-y-1">
              {['faang', 'startup', 'service-based'].map((s) => (
                <button 
                  key={s}
                  onClick={() => setConfig(prev => ({...prev, style: s as any}))}
                  className={`w-full px-4 py-3 rounded-xl text-left transition-all border ${config.style === s ? 'bg-slate-800 border-indigo-500/50 text-white' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800/50'}`}
                >
                   <div className="text-xs font-bold capitalize">{s.replace('-', ' ')}</div>
                   <div className="text-[10px] opacity-50">{s === 'faang' ? 'Rigorous & Probing' : s === 'startup' ? 'Fast & Creative' : 'Methodical & Broad'}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
           <button 
            onClick={() => setView('landing')}
            className="w-full text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-2"
           >
             ← Return to Landing
           </button>
        </div>
      </aside>

      {/* Main Area: Interaction Zone */}
      <main className="flex-1 flex flex-col bg-[#0b1120] relative">
        {/* Chat Header */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-lg border-b border-slate-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-bold">Mock Interview Session</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleExport}
              className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors flex items-center gap-2"
            >
              <span>Download Report</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
            <button 
              onClick={() => { setMessages([]); handleStart(); }}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
            >
              Reset Session
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                m.role === 'user' 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/10' 
                : 'bg-slate-800 border border-slate-700 text-slate-200'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input & Evaluation Area */}
        <div className="p-8 bg-gradient-to-t from-[#0b1120] via-[#0b1120] to-transparent">
          {evaluation && (
            <div className="mb-6 animate-in zoom-in-95 fade-in duration-300">
               <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden shadow-2xl relative">
                 {/* Close / Minimize Button */}
                 <button 
                  onClick={() => setEvaluation(null)}
                  className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-700/50 text-slate-500 hover:text-white transition-all z-20"
                  title="Close Analysis"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>

                 <div className="flex items-center justify-between px-6 py-4 bg-slate-700/30 border-b border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Performance Analysis</span>
                    <div className="flex items-center gap-3 pr-8">
                      <span className="text-xs font-medium text-slate-500">Last Response Score:</span>
                      <span className="text-xl font-black text-indigo-400">{evaluation.score}/10</span>
                    </div>
                 </div>
                 <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-300 italic">"{evaluation.feedback}"</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-indigo-400 uppercase">Improvement Tips</h4>
                          <ul className="space-y-1">
                             {evaluation.improvement_tips.map((t, i) => (
                               <li key={i} className="text-[11px] text-slate-400 flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span> {t}
                               </li>
                             ))}
                          </ul>
                       </div>
                       <div>
                          <button 
                            onClick={() => setShowModelAnswer(!showModelAnswer)}
                            className="text-[10px] font-bold text-slate-500 hover:text-white underline mb-2"
                          >
                            {showModelAnswer ? 'Hide' : 'Show'} Ideal Answer
                          </button>
                          {showModelAnswer && (
                            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                               {evaluation.model_answer_outline}
                            </p>
                          )}
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          <div className="relative group">
            <textarea 
              rows={3}
              placeholder="Speak or type your answer here..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 pr-32 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-xl"
            />
            <div className="absolute right-4 bottom-4 flex gap-2">
               <button 
                onClick={handleEvaluate}
                disabled={loading || messages.length < 2}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-[10px] font-bold rounded-xl transition-all"
               >
                 Evaluate
               </button>
               <button 
                onClick={handleSendMessage}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl shadow-lg transition-all"
               >
                 Send
               </button>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar: Insights */}
      <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-sm font-bold tracking-tight">Real-time Analytics</h2>
        </div>

        <div className="p-6 space-y-10">
          {/* Resume Weakness */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resume Weaknesses</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold">Action Required</span>
             </div>
             <div className="space-y-3">
               {analysis?.missingSkills.map((s, i) => (
                 <div key={i} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span className="text-xs text-slate-300 font-medium">{s}</span>
                 </div>
               ))}
             </div>
          </section>

          {/* Likely Follow-ups */}
          <section className="space-y-4">
             <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expected Curveballs</h3>
             <div className="space-y-3">
               {analysis?.followUpQuestions.map((q, i) => (
                 <div key={i} className="text-[11px] text-slate-400 leading-relaxed border-l-2 border-indigo-500/30 pl-4 py-1 italic">
                    "{q}"
                 </div>
               ))}
             </div>
          </section>

          {/* Skill Coverage Map */}
          <section className="space-y-6">
             <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Skill Coverage Map</h3>
             <div className="space-y-5">
               {[
                 { label: 'DSA & Algorithms', value: analysis?.skillMap.dsa || 0, color: 'bg-blue-500' },
                 { label: 'System Design', value: analysis?.skillMap.systemDesign || 0, color: 'bg-purple-500' },
                 { label: 'Communication', value: analysis?.skillMap.communication || 0, color: 'bg-indigo-500' }
               ].map((item, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                       <span className="text-slate-400 font-bold">{item.label}</span>
                       <span className="text-white font-black">{item.value}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div 
                        className={`h-full ${item.color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]`} 
                        style={{ width: `${item.value}%` }} 
                       />
                    </div>
                 </div>
               ))}
             </div>
          </section>
        </div>

        <div className="mt-auto p-6 bg-indigo-900/10 border-t border-slate-800">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                 <span className="text-xs font-bold text-indigo-400">AI</span>
              </div>
              <div>
                 <div className="text-[11px] font-bold text-white">Gemini 3 Intelligence</div>
                 <div className="text-[10px] text-slate-500">Multimodal Neural Engine</div>
              </div>
           </div>
        </div>
      </aside>
    </div>
  );
};

export default App;
