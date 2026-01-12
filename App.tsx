
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { KEY_PERSONNEL, SYSTEM_PROMPT_TEMPLATE } from './constants';
import { Message, UserProfile } from './types';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showEnter, setShowEnter] = useState(false);
  const [step, setStep] = useState<'profile' | 'dashboard' | 'chat'>('profile');
  const [profile, setProfile] = useState<UserProfile>({
    name: '', age: '', appearance: '', personality: '', role: ''
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 로딩 화면 시뮬레이션
  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setShowEnter(true);
            return 100;
          }
          return prev + 10;
        });
      }, 30);
      return () => clearInterval(timer);
    }
  }, [loading]);

  // 채팅 스크롤 하단 고정
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiLoading]);

  const handleEnter = () => setLoading(false);

  const handleKeySetup = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio && aiStudio.openSelectKey) {
      try {
        await aiStudio.openSelectKey();
        setApiError(null);
      } catch (err) {
        console.error("Key selection failed", err);
      }
    } else {
      alert("Google AI Studio 환경이 아니거나 API_KEY가 설정되지 않았습니다.");
    }
  };

  const callGemini = async (prompt: string) => {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey.includes("API_KEY") || apiKey.trim() === "") {
      setApiError("API_KEY_MISSING");
      throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT_TEMPLATE(profile),
          temperature: 0.8,
          topP: 0.95,
        }
      });
      return response.text;
    } catch (e: any) {
      console.error("Gemini API Error:", e);
      const errorStr = e.message?.toLowerCase() || "";
      if (errorStr.includes("not found") || errorStr.includes("403") || errorStr.includes("permission")) {
        setApiError("PERMISSION_DENIED");
        throw new Error("PERMISSION_DENIED");
      }
      throw e;
    }
  };

  const startStory = async () => {
    setStep('chat');
    setIsAiLoading(true);
    setApiError(null);
    try {
      const initialPrompt = `시스템 기동. ${profile.name}의 배경 설정을 바탕으로 모스크바 외곽의 차가운 지하 아지트에서 시작되는 첫 시퀀스를 생성하라. 분위기는 매우 압도적이고 위협적이어야 한다.`;
      const text = await callGemini(initialPrompt);
      setMessages([{ 
        role: 'assistant', 
        content: text || "데이터 수신에 실패했습니다.", 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } catch (e: any) {
      setMessages([{ 
        role: 'system', 
        content: "[ERROR] 통신 모듈 치명적 결함. API 키 또는 네트워크 상태를 확인하십시오.", 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isAiLoading) return;

    const text = userInput;
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toLocaleTimeString() }]);
    setIsAiLoading(true);

    try {
      const aiText = await callGemini(text);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: aiText || "...", 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } catch (e: any) {
      // callGemini에서 apiError를 설정하므로 여기서는 추가 처리 생략
    } finally {
      setIsAiLoading(false);
    }
  };

  const goToDashboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      alert("이름은 필수 항목입니다.");
      return;
    }
    setStep('dashboard');
  };

  const resetApp = () => {
    if (confirm("모든 아카이브 기록이 영구 삭제됩니다. 계속하시겠습니까?")) {
      setStep('profile');
      setMessages([]);
      setApiError(null);
      setProfile({ name: '', age: '', appearance: '', personality: '', role: '' });
    }
  };

  // 초기 로딩 화면
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-[100]">
        <div className="font-noir text-3xl text-white mb-8 tracking-[0.3em] uppercase animate-pulse">Initialising Archive</div>
        {!showEnter ? (
          <div className="w-64 h-1 bg-neutral-900 rounded-full overflow-hidden">
            <div className="h-full bg-red-900 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        ) : (
          <button 
            onClick={handleEnter} 
            className="group relative border border-red-900 bg-black text-red-600 px-16 py-4 font-noir tracking-[0.4em] text-sm uppercase hover:bg-red-900 hover:text-white transition-all shadow-[0_0_30px_rgba(139,0,0,0.3)]"
          >
            [ ACCESS SYSTEM ]
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-300 selection:bg-red-900/30">
      {/* API 에러 안내 모달 */}
      {apiError && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="max-w-md w-full border border-red-900/50 p-10 bg-black shadow-[0_0_80px_rgba(139,0,0,0.2)] text-center">
            <div className="w-16 h-16 border-2 border-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-red-600 text-3xl font-bold">!</span>
            </div>
            <h2 className="font-noir text-red-700 text-2xl mb-6 tracking-widest uppercase italic">System Corruption</h2>
            <div className="font-mono text-[11px] text-neutral-400 space-y-4 mb-10 leading-relaxed text-left">
              {apiError === "API_KEY_MISSING" ? (
                <>
                  <p className="border-l-2 border-red-900 pl-4">1. Cloudflare Pages 설정 &rarr; Variables에서 <span className="text-white">API_KEY</span>를 추가하십시오.</p>
                  <p className="border-l-2 border-red-900 pl-4">2. 혹은 하단 버튼을 통해 AI Studio 키를 직접 연결하십시오.</p>
                </>
              ) : (
                <p className="border-l-2 border-red-900 pl-4">현재 API 키로는 이 모델에 접근할 수 없습니다. 유료 티어 프로젝트의 키를 사용하거나, 다른 키를 선택해 주십시오.</p>
              )}
            </div>
            <div className="space-y-4">
              <button onClick={handleKeySetup} className="w-full bg-red-900 text-white font-noir py-4 text-xs tracking-[0.2em] uppercase hover:bg-red-800 transition-all shadow-lg">Link Secure Key</button>
              <button onClick={() => setApiError(null)} className="w-full border border-neutral-800 text-neutral-600 font-noir py-4 text-xs tracking-[0.2em] uppercase hover:text-neutral-400 transition-all">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {step === 'profile' && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-neutral-800 bg-neutral-950/40 p-12 border-l-4 border-l-red-900 shadow-2xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="font-noir text-6xl text-white">狼</span>
            </div>
            <h1 className="font-noir text-3xl text-white mb-2 tracking-widest uppercase italic">Identity Dossier</h1>
            <p className="font-mono text-[10px] text-neutral-600 mb-10 uppercase tracking-[0.3em] italic">Confidential Bratva Registry // Volchya Staya</p>
            
            <form onSubmit={goToDashboard} className="space-y-8">
              <div className="group">
                <label className="block text-[10px] font-noir text-neutral-500 uppercase tracking-widest mb-2 group-focus-within:text-red-700 transition-colors">Codename *</label>
                <input 
                  className="w-full bg-black/50 border border-neutral-800 p-4 text-sm focus:border-red-900 outline-none font-typewriter text-white transition-all focus:bg-black shadow-inner"
                  placeholder="IDENTIFICATION NAME" 
                  value={profile.name} 
                  onChange={e => setProfile({...profile, name: e.target.value})} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-noir text-neutral-500 uppercase tracking-widest mb-2">Age / Bio</label>
                  <input className="w-full bg-black/50 border border-neutral-800 p-4 text-sm focus:border-red-900 outline-none font-typewriter text-white transition-all" placeholder="28" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-noir text-neutral-500 uppercase tracking-widest mb-2">Rank / Role</label>
                  <input className="w-full bg-black/50 border border-neutral-800 p-4 text-sm focus:border-red-900 outline-none font-typewriter text-white transition-all" placeholder="INFILTRATOR" value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-noir text-neutral-500 uppercase tracking-widest mb-2">Detailed Appearance & Personality</label>
                <textarea 
                  className="w-full bg-black/50 border border-neutral-800 p-4 text-sm focus:border-red-900 outline-none h-32 font-typewriter text-white resize-none transition-all shadow-inner" 
                  placeholder="Describe your subject's physical traits, aura, and behavioral patterns..." 
                  value={profile.appearance} 
                  onChange={e => setProfile({...profile, appearance: e.target.value})} 
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-red-950 text-white font-noir py-5 text-sm tracking-[0.4em] hover:bg-red-800 transition-all uppercase shadow-lg border border-red-900/50 hover:border-red-600"
              >
                Establish Identity
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 'dashboard' && (
        <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col">
          <header className="mb-12 border-b border-neutral-900 pb-8 flex justify-between items-end">
            <div>
              <h1 className="text-5xl font-noir text-white tracking-tighter uppercase italic">Volchya <span className="text-red-700">Staya</span></h1>
              <p className="text-[11px] text-neutral-500 tracking-[0.5em] uppercase mt-3 font-noir italic">The Winter of Moscow // Bratva Syndicate</p>
            </div>
            <button onClick={resetApp} className="text-[10px] font-mono text-neutral-700 hover:text-red-600 uppercase transition-colors underline underline-offset-8">[ TERMINATE_SESSION ]</button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20 flex-1">
            {KEY_PERSONNEL.map((p, i) => (
              <div key={i} className="group border border-neutral-900 bg-black/40 hover:border-red-900/60 transition-all overflow-hidden relative shadow-2xl">
                <div className="aspect-[3/4] grayscale group-hover:grayscale-0 transition-all duration-1000 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-60"></div>
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={p.name} />
                </div>
                <div className="p-6 border-t border-neutral-900 relative z-20 bg-black/80">
                  <p className="font-noir text-[9px] text-red-800 tracking-[0.3em] mb-2 uppercase font-bold">{p.alias}</p>
                  <h3 className="font-noir text-white text-lg tracking-wider">{p.name}</h3>
                  <div className="mt-4 h-[1px] w-full bg-neutral-900 group-hover:bg-red-900/50 transition-colors"></div>
                  <p className="text-[11px] text-neutral-500 mt-4 font-typewriter line-clamp-2 italic opacity-80 leading-relaxed">"{p.description}"</p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto w-full text-center border border-neutral-900 p-16 bg-neutral-950/40 backdrop-blur-lg relative border-t-4 border-t-red-900 shadow-[0_0_100px_rgba(0,0,0,0.8)] mb-10">
            <h2 className="font-noir text-2xl text-white mb-6 italic tracking-widest uppercase">Archive Synchronized</h2>
            <p className="font-script text-2xl text-neutral-400 mb-10 italic">"Trust no one. Not even the cold."</p>
            <button 
              onClick={startStory} 
              className="group relative px-20 py-5 bg-white text-black font-noir font-bold text-sm tracking-[0.4em] hover:bg-red-900 hover:text-white transition-all uppercase overflow-hidden"
            >
              <span className="relative z-10">Enter the Pack</span>
              <div className="absolute inset-0 bg-red-800 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>
        </div>
      )}

      {step === 'chat' && (
        <div className="h-screen flex flex-col relative">
          <header className="p-5 border-b border-neutral-900 flex justify-between items-center bg-black/95 backdrop-blur-xl z-30 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="font-noir text-sm tracking-[0.3em] text-white uppercase italic">Volchya <span className="text-red-700 font-bold">Staya</span></div>
              <div className="h-4 w-[1px] bg-neutral-800"></div>
              <div className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest animate-pulse">Session: {profile.name.toUpperCase()}</div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleKeySetup} className="text-[9px] font-mono text-red-900 hover:text-red-500 uppercase tracking-tighter border border-red-900/30 px-3 py-1 rounded-sm transition-all hover:bg-red-900/10">Reconnect</button>
              <button onClick={resetApp} className="text-[9px] font-mono text-neutral-600 hover:text-red-700 uppercase transition-colors">[ EXIT ]</button>
            </div>
          </header>

          <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-16 max-w-5xl mx-auto w-full z-10 scroll-smooth custom-scrollbar"
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] sm:max-w-[75%] ${msg.role === 'user' ? 'bg-neutral-900/40 p-6 border border-neutral-800 font-typewriter text-sm text-neutral-200' : 'w-full'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="text-neutral-300 font-light leading-relaxed text-base whitespace-pre-wrap">
                      {msg.content.split('\n').map((line, li) => {
                        if (line.includes('|')) {
                          const [name, rest] = line.split('|');
                          return (
                            <div key={li} className="my-8 border-l-2 border-red-900/60 pl-6 bg-red-950/5 py-3 shadow-sm">
                              <span className="font-noir text-red-700 text-[11px] tracking-[0.3em] block mb-2 font-bold uppercase">{name.trim()}</span>
                              <span className="text-white italic font-medium leading-loose">{rest}</span>
                            </div>
                          );
                        }
                        return <p key={li} className="mb-5">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <div className={msg.role === 'system' ? 'text-red-800 italic font-mono text-[11px] border border-red-900/40 p-5 bg-red-950/10 tracking-tight' : ''}>
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex gap-4 p-4 items-center opacity-70">
                <div className="w-2 h-2 bg-red-800 rounded-full animate-bounce"></div>
                <div className="text-[10px] font-mono text-red-800 tracking-[0.4em] uppercase font-bold italic">Decrypting Transmission...</div>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-10 bg-black/90 border-t border-neutral-900 z-30 backdrop-blur-md">
            <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-4">
              <input 
                className="flex-1 bg-neutral-950 border border-neutral-800 p-5 text-sm text-white focus:border-red-900 outline-none font-typewriter placeholder-neutral-800 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,1)]"
                placeholder="CONSTRUCT YOUR ACTION OR RESPONSE..." 
                value={userInput} 
                onChange={e => setUserInput(e.target.value)} 
                disabled={isAiLoading}
              />
              <button 
                className="px-8 sm:px-16 bg-neutral-900 text-white font-noir text-[11px] tracking-[0.3em] hover:bg-red-950 disabled:opacity-30 transition-all uppercase border border-neutral-800 font-bold" 
                disabled={isAiLoading}
              >
                Execute
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
