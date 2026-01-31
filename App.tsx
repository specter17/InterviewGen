
import React, { useState, useRef, useEffect } from 'react';
import { analyzeResume, getNextInterviewerMessage, evaluateAnswer } from './services/geminiService';
import { ResumeAnalysis, InterviewConfig, EvaluationResult, ChatMessage } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState('Senior Frontend Developer');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

  const [config, setConfig] = useState<InterviewConfig>({
    difficulty: 'intermediate',
    category: 'technical',
    duration: '30m',
    style: 'faang'
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
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
      setEvaluationHistory({});
      setMessages([]);
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
    let lastInterviewerMsgIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'interviewer') {
        lastInterviewerMsgIdx = i;
        break;
      }
    }
    const lastInterviewerMsg = messages[lastInterviewerMsgIdx];
    if (!lastUserMsg || !lastInterviewerMsg) return;

    setLoading(true);
    try {
      const evalData = await evaluateAnswer(lastInterviewerMsg.text, lastUserMsg.text, role);
      setEvaluation(evalData);
      setEvaluationHistory(prev => ({ ...prev, [lastInterviewerMsgIdx + 1]: evalData }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (messages.length === 0) return;
    let report = `INTERVIEWGEN PRO - SESSION REPORT\n`;
    report += `==========================================\n\n`;
    report += `Role: ${role}\nDifficulty: ${config.difficulty}\nStyle: ${config.style}\nDate: ${new Date().toLocaleString()}\n\n`;
    if (analysis) {
      report += `RESUME INSIGHTS\n---------------\nMissing Skills: ${analysis.missingSkills.join(', ')}\n\n`;
    }
    report += `TRANSCRIPT\n----------\n`;
    messages.forEach((m, idx) => {
      report += `${m.role.toUpperCase()}: ${m.text}\n`;
      if (evaluationHistory[idx]) {
        report += `[EVALUATION] Score: ${evaluationHistory[idx].score}/10 | Feedback: ${evaluationHistory[idx].feedback}\n`;
      }
      report += `\n`;
    });
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `InterviewGen_Report_${role.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 transition-colors duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.06),transparent)] pointer-events-none" />
        <div className="max-w-4xl w-full text-center space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          
          <header className="space-y-10 flex flex-col items-center">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
              <span className="text-[#101935] dark:text-white">Interview</span>
              <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">Gen</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed font-light">
              Elevate your interview game with deep AI-simulated pressure and real-time gap analysis.
            </p>
          </header>

          <div className="bg-white dark:bg-slate-800/40 backdrop-blur-3xl border border-slate-200 dark:border-slate-700/50 rounded-[3rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Target Career Path</label>
                <input 
                  type="text" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-3xl px-6 py-5 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold text-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Resume Profile</label>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-3xl px-6 py-5 text-sm font-bold transition-all flex items-center justify-center gap-4 text-slate-600 dark:text-slate-400"
                >
                  {resumeFile ? `✓ ${resumeFile.name}` : "Drop your PDF or Image here"}
                </button>
                <input type="file" ref={fileInputRef} hidden accept="application/pdf,image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setResumeFile({ data: await fileToBase64(file), mimeType: file.type, name: file.name });
                }} />
              </div>
            </div>
            <textarea 
              placeholder="Or manually describe your core experience and tech stack..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-8 py-6 h-40 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none font-medium"
            />
            <button 
              onClick={handleStart}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-500 hover:scale-[1.01] text-white font-black py-6 rounded-3xl shadow-2xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 text-xl"
            >
              {loading ? 'Crunching Global Standards...' : 'Launch AI Assessment'}
            </button>
            {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
          </div>

          <footer className="pt-12 flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale contrast-125">
             {['Google', 'Meta', 'Amazon', 'Apple', 'Netflix'].map(brand => (
               <span key={brand} className="font-black text-2xl tracking-tighter text-indigo-900 dark:text-white">{brand.toUpperCase()}</span>
             ))}
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f1f5f9] dark:bg-[#0b1120] text-slate-800 dark:text-slate-200 flex overflow-hidden">
      {/* Configuration Sidebar */}
      <aside className="w-80 bg-white dark:bg-[#101935] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-black tracking-tighter dark:text-white">
            Interview<span className="text-indigo-600">Gen</span>
          </h2>
        </div>

        <div className="p-8 space-y-10 overflow-y-auto no-scrollbar">
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Difficulty Matrix</h3>
            <div className="space-y-2">
              {['beginner', 'intermediate', 'advanced'].map(d => (
                <button key={d} onClick={() => setConfig(prev => ({...prev, difficulty: d as any}))}
                  className={`w-full px-5 py-3 rounded-2xl text-xs font-bold capitalize transition-all text-left ${config.difficulty === d ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-100'}`}>
                  {d}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interviewer Persona</h3>
            <div className="space-y-2">
              {['faang', 'startup', 'service-based'].map(s => (
                <button key={s} onClick={() => setConfig(prev => ({...prev, style: s as any}))}
                  className={`w-full px-6 py-5 rounded-[2rem] text-left border ${config.style === s ? 'bg-white dark:bg-slate-800 border-indigo-500/50 text-slate-900 dark:text-white shadow-2xl' : 'border-transparent text-slate-400 hover:bg-slate-50'}`}>
                  <div className="text-xs font-black capitalize">{s.replace('-', ' ')}</div>
                  <div className="text-[9px] font-medium opacity-60 leading-tight mt-1">{s === 'faang' ? 'Analytical & Probing' : s === 'startup' ? 'Dynamic & Practical' : 'Structured & Thorough'}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100 dark:border-slate-800">
          <button onClick={() => setView('landing')} className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors">← RETURN HOME</button>
        </div>
      </aside>

      {/* Main Interaction Hub */}
      <main className="flex-1 flex flex-col bg-white dark:bg-[#0b1120] relative">
        <header className="h-24 bg-white/80 dark:bg-slate-900/50 backdrop-blur-3xl border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-12 z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
              <h2 className="text-base font-black tracking-tight dark:text-white">Active Session: {role}</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{config.style} Expert Mode</span>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={handleExport} className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-2">REPORT <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round"/></svg></button>
            <button onClick={() => {setMessages([]); handleStart();}} className="px-6 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:scale-105 transition-transform">RESTART</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[70%] rounded-[2.5rem] px-10 py-6 shadow-sm ${m.role === 'user' ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-500/10' : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100'}`}>
                <p className="text-base leading-relaxed whitespace-pre-wrap font-medium">{m.text}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-full px-8 py-5 flex gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-12 bg-gradient-to-t from-white dark:from-[#0b1120] to-transparent">
          {evaluation && (
            <div className="mb-8 animate-in zoom-in-95 fade-in duration-500 relative">
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[3rem] overflow-hidden shadow-2xl">
                 <button onClick={() => setEvaluation(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round"/></svg></button>
                 <div className="flex items-center justify-between px-10 py-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Signal</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-teal-500 bg-clip-text text-transparent mr-12">{evaluation.score}/10</span>
                 </div>
                 <div className="p-10 space-y-6">
                    <p className="text-base text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">"{evaluation.feedback}"</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Optimizations</h4>
                          <ul className="space-y-3">
                             {evaluation.improvement_tips.map((t, i) => (
                               <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3">
                                  <span className="text-teal-500 font-bold">✓</span> {t}
                               </li>
                             ))}
                          </ul>
                       </div>
                       <div className="space-y-4">
                          <button onClick={() => setShowModelAnswer(!showModelAnswer)} className="text-[10px] font-black text-slate-400 hover:text-slate-900 underline">VIEW ELITE BENCHMARK ANSWER</button>
                          {showModelAnswer && <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 animate-in fade-in">{evaluation.model_answer_outline}</div>}
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          <div className="relative">
            <textarea rows={3} placeholder="Articulate your response using the STAR framework..." value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] px-10 py-8 pr-44 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none shadow-2xl font-medium" />
            <div className="absolute right-6 bottom-6 flex gap-4">
               <button onClick={handleEvaluate} disabled={loading || messages.length < 2} className="px-8 py-4 bg-white dark:bg-slate-700 hover:bg-slate-50 text-[10px] font-black rounded-2xl transition-all border border-slate-200 dark:border-slate-600 shadow-sm disabled:opacity-30">EVALUATE</button>
               <button onClick={handleSendMessage} className="px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-black rounded-2xl shadow-xl hover:scale-105 transition-all">TRANSMIT</button>
            </div>
          </div>
        </div>
      </main>

      {/* Analytics Feed */}
      <aside className="w-96 bg-white dark:bg-[#101935] border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Intelligence Analytics</h2>
        </div>

        <div className="p-8 space-y-12">
          <section className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience Gaps</h3>
                <span className="text-[9px] px-2.5 py-1 bg-red-500/10 text-red-500 rounded-full font-black">CRITICAL</span>
             </div>
             <div className="space-y-4">
               {analysis?.missingSkills.map((s, i) => (
                 <div key={i} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s}</span>
                 </div>
               ))}
             </div>
          </section>

          <section className="space-y-8">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Skill Coverage</h3>
             <div className="space-y-8">
               {[
                 { label: 'DSA Core', value: analysis?.skillMap.dsa || 0, color: 'from-blue-500 to-indigo-500' },
                 { label: 'Architecture', value: analysis?.skillMap.systemDesign || 0, color: 'from-purple-500 to-indigo-500' },
                 { label: 'Eloquence', value: analysis?.skillMap.communication || 0, color: 'from-teal-500 to-emerald-500' }
               ].map((item, i) => (
                 <div key={i} className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black">
                       <span className="text-slate-500">{item.label}</span>
                       <span className="text-slate-900 dark:text-white">{item.value}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full p-0.5">
                       <div className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${item.value}%` }} />
                    </div>
                 </div>
               ))}
             </div>
          </section>
        </div>

        <div className="mt-auto p-8 bg-indigo-500/5 dark:bg-indigo-900/10 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center border border-white/20 shadow-2xl">
                 <svg viewBox="0 0 100 100" className="w-8 h-8"><path d="M50 20 L80 50 L50 80 L20 50 Z" fill="none" stroke="white" strokeWidth="6"/><circle cx="50" cy="50" r="12" fill="white"/></svg>
              </div>
              <div className="flex flex-col">
                 <span className="text-xs font-black text-slate-900 dark:text-white uppercase">Engine: Gemini 3 Pro</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Adaptive Reasoning Verified</span>
              </div>
           </div>
        </div>
      </aside>
    </div>
  );
};

export default App;
