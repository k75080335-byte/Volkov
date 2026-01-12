
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

  const callGemini = async (prompt: string, isInitial: boolean = false) => {
    const aiStudio = (window as any).aistudio;
    
    // 1. AI Studio 환경일 경우 키 선택 확인
    if (aiStudio) {
      const hasKey = await aiStudio.hasSelectedApiKey();
      if (!hasKey) await aiStudio.openSelectKey();
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY_NOT_SET");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // 시도할 모델 순서 (Pro가 안되면 Flash로)
    const modelsToTry = ['gemini-3-pro-preview', 'gemini-3-flash-preview'];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_PROMPT_TEMPLATE(profile),
            temperature: 0.9,
          }
        });
        return response.text;
      } catch (e: any) {
        lastError = e;
        console.warn(`${modelName} 시도 실패:`, e.message);
        // "Requested entity was not found" (404)는 보통 모델 권한 문제임
        if (e.message?.includes("not found") || e.message?.includes("403")) {
          continue; // 다음 모델로 시도
        }
        throw e; // 치명적 오류는 중단
      }
    }
    throw lastError;
  };

  const startStory = async () => {
    setStep('chat');
    setIsAiLoading(true);
    try {
      const text = await callGemini("신규 세션을 시작하라. 팍한의 집무실에서 주인공을 맞이하는 첫 장면을 묘사하라. 주변의 차가운 공기, 보드카 냄새, 그리고 팍한의 압도적인 존재감을 강조하라.", true);
      setMessages([{ 
        role: 'assistant', 
        content: text || "침묵이 흐릅니다...", 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } catch (e: any) {
      console.error("Story Start Error:", e);
      let errorHint = "연결에 실패했습니다.";
      if (e.message === "API_KEY_NOT_SET") {
        errorHint = "API 키가 설정되지 않았습니다. Cloudflare Settings -> Variables에서 API_KEY를 등록해주세요.";
      } else if (e.message?.includes("not found")) {
        errorHint = "선택하신 키가 이 모델을 지원하지 않습니다. AI Studio에서 'Choose a paid key'를 다시 확인해주세요.";
      }
      setMessages([{ role: 'system', content: `[ERROR] ${errorHint}`, timestamp: new Date().toLocaleTimeString() }]);
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
      setMessages(prev => [...prev, { role: 'system', content: "메시지 전송 실패. 네트워크 상태나 API 키를 확인하세요.", timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const resetApp = () => {
    if (confirm("초기화하시겠습니까?")) {
      setStep('profile');
      setMessages([]);
      setProfile({ name: '', age: '', appearance: '', personality: '', role: '' });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-[100]">
        <div className="font-noir text-3xl text-white mb-8 tracking-[0.3em] uppercase animate-pulse">Entering the White Silence</div>
        {!showEnter ? (
          <div className="w-64 h-1 bg-neutral-900 rounded overflow-hidden">
            <div className="h-full bg-red-900 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        ) : (
          <button onClick={handleEnter} className="border border-red-900 bg-black text-red-600 px-10 py-3 font-noir tracking-[0.3em] text-xs uppercase hover:bg-red-900 hover:text-white transition-all shadow-[0_0_15px_rgba(139,0,0,0.3)]">
            [ ACCESS GRANTED ]
          </button>
        )}
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505]">
        <div className="max-w-md w-full border border-neutral-800 bg-black/40 p-8 border-l-4 border-l-red-900 shadow-2xl">
          <h1 className="font-noir text-2xl text-white mb-1 tracking-widest uppercase">Identity Registration</h1>
          <p className="font-mono text-[9px] text-neutral-600 mb-8 uppercase tracking-widest">Moscow Central Archives</p>
          <form onSubmit={(e) => { e.preventDefault(); setStep('dashboard'); }} className="space-y-6">
            <input className="w-full bg-neutral-900 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none font-typewriter text-white" placeholder="NAME" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <input className="w-full bg-neutral-900 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none font-typewriter text-white" placeholder="AGE" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} />
              <input className="w-full bg-neutral-900 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none font-typewriter text-white" placeholder="ROLE" value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} />
            </div>
            <textarea className="w-full bg-neutral-900 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none h-24 font-typewriter text-white" placeholder="APPEARANCE & VIBE" value={profile.appearance} onChange={e => setProfile({...profile, appearance: e.target.value})} />
            <button className="w-full bg-red-950 text-white font-noir py-4 text-xs tracking-widest hover:bg-red-800 transition-all uppercase">Enter the Pack</button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'dashboard') {
    return (
      <div className="min-h-screen p-8 max-w-7xl mx-auto">
        <header className="mb-16 border-b border-neutral-800 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-noir text-white tracking-tighter uppercase italic">Volchya <span className="text-red-700">Staya</span></h1>
            <p className="text-[10px] text-neutral-500 tracking-[0.4em] uppercase mt-2 italic font-noir">Bratva Noir System // V.1.0</p>
          </div>
          <button onClick={resetApp} className="text-[10px] font-mono text-neutral-700 hover:text-red-600 uppercase tracking-tighter">[ TERMINATE_SESSION ]</button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {KEY_PERSONNEL.map((p, i) => (
            <div key={i} className="group border border-neutral-900 bg-neutral-950/50 hover:border-red-900/40 transition-all overflow-hidden">
              <div className="aspect-[3/4] grayscale group-hover:grayscale-0 transition-all duration-1000 overflow-hidden">
                <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={p.name} />
              </div>
              <div className="p-4 border-t border-neutral-900">
                <p className="font-noir text-[8px] text-red-800 tracking-widest mb-1 uppercase">{p.alias}</p>
                <h3 className="font-noir text-white text-base">{p.name}</h3>
                <p className="text-[10px] text-neutral-500 mt-2 font-typewriter line-clamp-2">{p.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-xl mx-auto text-center border border-neutral-900 p-12 bg-neutral-950/50 backdrop-blur-sm relative">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-red-900 opacity-50"></div>
          <h2 className="font-noir text-xl text-white mb-4 italic tracking-widest">모스크바의 밤은 길고 차갑습니다.</h2>
          <p className="font-script text-lg text-neutral-400 mb-8 italic">"살아남는 것은 늑대뿐, 나머지는 먹잇감이다."</p>
          <button onClick={startStory} className="px-16 py-4 bg-white text-black font-noir font-bold text-xs tracking-[0.2em] hover:bg-neutral-300 transition-all uppercase shadow-2xl">
            INITIALIZE SCENARIO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#050505] overflow-hidden">
      <header className="p-4 border-b border-neutral-900 flex justify-between items-center bg-black/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <div className="font-noir text-xs tracking-widest text-white">VOLCHYA <span className="text-red-700 font-bold">STAYA</span></div>
          <div className="h-3 w-[1px] bg-neutral-800"></div>
          <button onClick={resetApp} className="text-[9px] font-mono text-neutral-600 hover:text-red-700 uppercase">[ EXIT ]</button>
        </div>
        <div className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest hidden sm:block">STATUS: ARCHIVE_DEPLOYED</div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-12 max-w-4xl mx-auto w-full z-10 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] sm:max-w-[80%] ${msg.role === 'user' ? 'bg-neutral-900/40 p-4 border border-neutral-800/50 font-typewriter text-sm text-neutral-200 shadow-lg' : 'w-full'}`}>
              {msg.role === 'assistant' ? (
                <div className="text-neutral-300 font-light leading-relaxed text-sm whitespace-pre-wrap">
                  {msg.content.split('\n').map((line, li) => {
                    if (line.includes('|')) {
                      const [name, rest] = line.split('|');
                      return (
                        <p key={li} className="my-6 border-l-2 border-red-900/30 pl-4">
                          <span className="font-noir text-red-700 text-[10px] tracking-widest block mb-1">{name.trim()}</span>
                          <span className="text-white italic font-medium">{rest}</span>
                        </p>
                      );
                    }
                    if (line.trim().startsWith('`')) return <p key={li} className="font-mono text-[9px] text-neutral-600 mb-6 tracking-widest opacity-60 italic">{line.replace(/`/g, '')}</p>
                    return <p key={li} className="mb-4">{line}</p>;
                  })}
                </div>
              ) : (
                <div className={msg.role === 'system' ? 'text-red-800 italic font-mono text-[10px] border border-red-900/20 p-2 bg-red-900/5' : ''}>
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}
        {isAiLoading && (
          <div className="flex gap-1.5 p-2 items-center">
            <div className="w-1 h-1 bg-red-900 rounded-full animate-ping"></div>
            <div className="text-[8px] font-mono text-red-900 tracking-widest uppercase opacity-50">Transmitting...</div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 bg-black border-t border-neutral-900 z-30">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input 
            className="flex-1 bg-neutral-950 border border-neutral-800 p-4 text-sm text-white focus:border-red-950 outline-none font-typewriter placeholder-neutral-800 transition-all"
            placeholder="TYPE YOUR RESPONSE..." value={userInput} onChange={e => setUserInput(e.target.value)} disabled={isAiLoading}
          />
          <button className="px-6 sm:px-10 bg-neutral-900 text-white font-noir text-[10px] tracking-widest hover:bg-red-950 disabled:opacity-30 transition-all uppercase border border-neutral-800" disabled={isAiLoading}>
            EXECUTE
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
