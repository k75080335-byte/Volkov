
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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleEnter = () => setLoading(false);

  const handleKeySetup = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio && aiStudio.openSelectKey) {
      await aiStudio.openSelectKey();
      setApiError(null);
    } else {
      alert("API 키가 설정되지 않았습니다. Cloudflare 설정에서 API_KEY를 등록해 주세요.");
    }
  };

  const callGemini = async (prompt: string) => {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey.includes("API_KEY") || apiKey === "") {
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
        }
      });
      return response.text;
    } catch (e: any) {
      console.error("API Error:", e);
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
      const text = await callGemini("신규 세션을 시작하라. 팍한의 집무실에서 주인공을 맞이하는 첫 장면을 묘사하라.");
      setMessages([{ 
        role: 'assistant', 
        content: text || "시스템 연결이 원활하지 않습니다.", 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } catch (e: any) {
      setMessages([{ 
        role: 'system', 
        content: "[SYSTEM_ERROR] 통신 모듈에 결함이 발생했습니다.", 
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
      // Error handled by callGemini setting apiError
    } finally {
      setIsAiLoading(false);
    }
  };

  const resetApp = () => {
    if (confirm("초기화하시겠습니까?")) {
      setStep('profile');
      setMessages([]);
      setApiError(null);
      setProfile({ name: '', age: '', appearance: '', personality: '', role: '' });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-[100]">
        <div className="font-noir text-3xl text-white mb-8 tracking-[0.3em] uppercase">Initialising Archive</div>
        {!showEnter ? (
          <div className="w-64 h-0.5 bg-neutral-900 rounded overflow-hidden">
            <div className="h-full bg-red-900 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        ) : (
          <button onClick={handleEnter} className="border border-red-900 bg-black text-red-600 px-12 py-3 font-noir tracking-[0.4em] text-xs uppercase hover:bg-red-900 hover:text-white transition-all shadow-[0_0_20px_rgba(139,0,0,0.2)]">
            [ ACCESS ]
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#050505] overflow-hidden bg-grain">
      {/* API 에러 안내 모달 */}
      {apiError && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="max-w-md w-full border border-red-900 p-8 bg-black shadow-[0_0_50px_rgba(139,0,0,0.3)]">
            <h2 className="font-noir text-red-700 text-xl mb-4 tracking-widest uppercase italic">Communication Failure</h2>
            <div className="font-mono text-xs text-neutral-400 space-y-4 mb-8">
              {apiError === "API_KEY_MISSING" ? (
                <>
                  <p>1. Cloudflare Pages 대시보드로 이동하세요.</p>
                  <p>2. Settings &rarr; Variables에서 <span className="text-white font-bold">API_KEY</span>를 추가하세요.</p>
                  <p>3. 혹은 아래 버튼을 눌러 AI Studio에서 키를 선택하세요.</p>
                </>
              ) : (
                <>
                  <p>선택한 API 키에 이 모델을 사용할 권한이 없거나, 유료 프로젝트 설정이 필요합니다.</p>
                  <p>AI Studio에서 'Billing'이 활성화된 프로젝트의 키를 선택해 주세요.</p>
                </>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleKeySetup} className="w-full bg-red-900 text-white font-noir py-3 text-[10px] tracking-widest uppercase hover:bg-red-800 transition-all">Fix Connection</button>
              <button onClick={() => setApiError(null)} className="w-full border border-neutral-800 text-neutral-600 font-noir py-3 text-[10px] tracking-widest uppercase hover:text-neutral-400 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {step === 'profile' ? (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-neutral-800 bg-black/80 p-10 border-l-4 border-l-red-900 shadow-2xl">
            <h1 className="font-noir text-2xl text-white mb-1 tracking-widest uppercase">Identity Dossier</h1>
            <p className="font-mono text-[9px] text-neutral-600 mb-8 uppercase tracking-widest italic">Moscow Central Archives</p>
            <form onSubmit={(e) => { e.preventDefault(); setStep('dashboard'); }} className="space-y-6">
              <input className="w-full bg-neutral-900/50 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none font-typewriter text-white" placeholder="NAME" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-neutral-900/50 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none font-typewriter text-white" placeholder="AGE" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} />
                <input className="w-full bg-neutral-900/50 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none font-typewriter text-white" placeholder="ROLE" value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} />
              </div>
              <textarea className="w-full bg-neutral-900/50 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none h-24 font-typewriter text-white resize-none" placeholder="APPEARANCE & VIBE" value={profile.appearance} onChange={e => setProfile({...profile, appearance: e.target.value})} />
              <button className="w-full bg-red-950 text-white font-noir py-4 text-xs tracking-widest hover:bg-red-800 transition-all uppercase">Submit Identity</button>
            </form>
          </div>
        </div>
      ) : step === 'dashboard' ? (
        <div className="min-h-screen p-8 max-w-7xl mx-auto overflow-y-auto">
          <header className="mb-16 border-b border-neutral-900 pb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-noir text-white tracking-tighter uppercase italic">Volchya <span className="text-red-700">Staya</span></h1>
              <p className="text-[10px] text-neutral-500 tracking-[0.4em] uppercase mt-2 font-noir">Bratva Noir Interface</p>
            </div>
            <button onClick={resetApp} className="text-[10px] font-mono text-neutral-700 hover:text-red-600 uppercase transition-colors underline">[ TERMINATE ]</button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {KEY_PERSONNEL.map((p, i) => (
              <div key={i} className="group border border-neutral-900 bg-neutral-950/50 hover:border-red-900/40 transition-all overflow-hidden relative">
                <div className="aspect-[3/4] grayscale group-hover:grayscale-0 transition-all duration-1000 overflow-hidden">
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={p.name} />
                </div>
                <div className="p-4 border-t border-neutral-900 bg-black/60">
                  <p className="font-noir text-[8px] text-red-800 tracking-widest mb-1 uppercase">{p.alias}</p>
                  <h3 className="font-noir text-white text-base">{p.name}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-xl mx-auto text-center border border-neutral-900 p-12 bg-neutral-950/30 backdrop-blur-md relative border-t-2 border-t-red-900 shadow-2xl mb-10">
            <h2 className="font-noir text-xl text-white mb-4 italic tracking-widest uppercase">Begin Archive Access</h2>
            <p className="font-script text-lg text-neutral-400 mb-8 italic">"Only the wolves survive the winter."</p>
            <button onClick={startStory} className="px-16 py-4 bg-white text-black font-noir font-bold text-xs tracking-[0.2em] hover:bg-neutral-300 transition-all uppercase">Initialize Scenario</button>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <header className="p-4 border-b border-neutral-900 flex justify-between items-center bg-black/90 backdrop-blur-md z-30">
            <div className="flex items-center gap-4">
              <div className="font-noir text-xs tracking-widest text-white uppercase italic">Volchya <span className="text-red-700 font-bold">Staya</span></div>
              <div className="h-3 w-[1px] bg-neutral-800"></div>
              <button onClick={resetApp} className="text-[9px] font-mono text-neutral-600 hover:text-red-700 uppercase">[ EXIT ]</button>
            </div>
            <button onClick={handleKeySetup} className="text-[8px] font-mono text-red-900 hover:text-red-600 uppercase tracking-tighter border border-red-900/20 px-2 py-0.5 rounded transition-all">Relink Key</button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-12 max-w-4xl mx-auto w-full z-10 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] sm:max-w-[80%] ${msg.role === 'user' ? 'bg-neutral-900/30 p-5 border border-neutral-800 font-typewriter text-sm text-neutral-200' : 'w-full'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="text-neutral-300 font-light leading-relaxed text-sm whitespace-pre-wrap">
                      {msg.content.split('\n').map((line, li) => {
                        if (line.includes('|')) {
                          const [name, rest] = line.split('|');
                          return (
                            <p key={li} className="my-6 border-l-2 border-red-900/40 pl-5 bg-red-950/5 py-2">
                              <span className="font-noir text-red-700 text-[10px] tracking-widest block mb-1 font-bold uppercase">{name.trim()}</span>
                              <span className="text-white italic font-medium">{rest}</span>
                            </p>
                          );
                        }
                        return <p key={li} className="mb-4">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <div className={msg.role === 'system' ? 'text-red-700 italic font-mono text-[10px] border border-red-900/30 p-4 bg-red-950/10' : ''}>
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex gap-2 p-2 items-center opacity-50">
                <div className="w-1 h-1 bg-red-700 rounded-full animate-ping"></div>
                <div className="text-[8px] font-mono text-red-700 tracking-[0.3em] uppercase">Decrypting...</div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 bg-black border-t border-neutral-900 z-30">
            <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
              <input 
                className="flex-1 bg-neutral-950 border border-neutral-800 p-4 text-sm text-white focus:border-red-900 outline-none font-typewriter placeholder-neutral-800 transition-all shadow-inner"
                placeholder="TYPE YOUR RESPONSE..." value={userInput} onChange={e => setUserInput(e.target.value)} disabled={isAiLoading}
              />
              <button className="px-6 sm:px-12 bg-neutral-900 text-white font-noir text-[10px] tracking-[0.2em] hover:bg-red-950 disabled:opacity-30 transition-all uppercase border border-neutral-800" disabled={isAiLoading}>
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
