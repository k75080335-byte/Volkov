
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

  // 로딩 바 애니메이션
  useEffect(() => {
    if (loading) {
      const timer1 = setTimeout(() => setProgress(30), 200);
      const timer2 = setTimeout(() => setProgress(70), 800);
      const timer3 = setTimeout(() => {
        setProgress(100);
        setTimeout(() => setShowEnter(true), 500);
      }, 1500);
      return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
    }
  }, [loading]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleEnter = () => setLoading(false);

  const startStory = async () => {
    setStep('chat');
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "신규 세션을 시작하라. 팍한의 집무실에서 주인공을 맞이하는 장면으로.",
        config: {
          systemInstruction: SYSTEM_PROMPT_TEMPLATE(profile),
          temperature: 0.9,
        }
      });
      setMessages([{ 
        role: 'assistant', 
        content: response.text || "시스템 오류: 응답을 가져올 수 없습니다.", 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } catch (e) {
      console.error(e);
      setMessages([{ 
        role: 'system', 
        content: "통신 오류가 발생했습니다. API 키 설정을 확인하세요.", 
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: text,
        config: { 
          systemInstruction: SYSTEM_PROMPT_TEMPLATE(profile),
          temperature: 0.9
        }
      });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.text || "...", 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-[100] transition-opacity duration-1000">
        <div className="font-noir text-3xl sm:text-4xl text-white mb-8 tracking-[0.3em] uppercase font-bold text-center px-4">
          Entering the White Silence
        </div>
        {!showEnter ? (
          <div className="w-64">
            <div className="h-1 bg-neutral-900 rounded overflow-hidden">
              <div 
                className="h-full bg-red-900 transition-all duration-1000" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="mt-4 font-mono text-[10px] text-neutral-500 tracking-[0.3em] uppercase text-center">
              DECRYPTING ARCHIVES...
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <button 
              onClick={handleEnter}
              className="border border-red-900 bg-black text-red-600 px-10 py-3 font-noir tracking-[0.3em] text-xs uppercase hover:bg-red-900 hover:text-white transition-all shadow-[0_0_15px_rgba(139,0,0,0.3)]"
            >
              [ ENTER ARCHIVES ]
            </button>
            <p className="text-[10px] text-neutral-600 font-script italic">"The Wolf does not howl before the kill."</p>
          </div>
        )}
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505]">
        <div className="max-w-md w-full border border-neutral-800 bg-black/40 backdrop-blur-md p-8 rounded-sm border-l-4 border-l-red-900">
          <h1 className="font-noir text-2xl text-white mb-1 uppercase tracking-widest">Dossier Assignment</h1>
          <p className="font-mono text-[10px] text-neutral-500 mb-8 tracking-widest uppercase">Subject Registration</p>
          <form onSubmit={(e) => { e.preventDefault(); setStep('dashboard'); }} className="space-y-6">
            <input 
              className="w-full bg-neutral-900/50 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none transition-all font-typewriter text-white"
              placeholder="NAME"
              value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <input 
                className="w-full bg-neutral-900/50 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none font-typewriter text-white"
                placeholder="AGE"
                value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})}
              />
              <input 
                className="w-full bg-neutral-900/50 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none font-typewriter text-white"
                placeholder="ROLE"
                value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})}
              />
            </div>
            <textarea 
              className="w-full bg-neutral-900/50 border border-neutral-800 p-3 text-sm focus:border-red-900 outline-none h-24 font-typewriter text-white"
              placeholder="APPEARANCE"
              value={profile.appearance} onChange={e => setProfile({...profile, appearance: e.target.value})}
            />
            <button className="w-full bg-red-950 text-white font-noir py-4 text-xs tracking-widest hover:bg-red-800 transition-all uppercase">
              Confirm Identity
            </button>
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
            <p className="text-[10px] text-neutral-500 tracking-[0.4em] uppercase mt-2">Bratva Noir Archives // Moscow</p>
          </div>
          <div className="text-right font-mono text-[10px] text-neutral-400">
            LOGGED_AS: {profile.name} // {profile.role}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {KEY_PERSONNEL.map((p, i) => (
            <div key={i} className="group relative border border-neutral-900 bg-neutral-950/30 overflow-hidden hover:border-red-900/50 transition-all duration-500">
              <div className="aspect-[3/4] grayscale group-hover:grayscale-0 transition-all duration-700 overflow-hidden">
                <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
              </div>
              <div className="p-4 border-t border-neutral-900">
                <p className="font-noir text-[9px] text-red-700 tracking-[0.2em] mb-1 uppercase">{p.alias}</p>
                <h3 className="font-noir text-white text-lg">{p.name}</h3>
                <p className="text-[11px] text-neutral-500 mt-2 font-typewriter line-clamp-2">{p.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center border border-neutral-800 p-12 bg-neutral-900/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-900"></div>
          <h2 className="font-noir text-2xl text-white mb-4 italic">당신의 침묵이 시작됩니다.</h2>
          <p className="font-script text-xl text-neutral-400 mb-8 leading-relaxed">
            "늑대는 울지 않는다. 단지 사냥할 뿐."
          </p>
          <button 
            onClick={startStory}
            className="px-16 py-4 bg-white text-black font-noir font-bold text-xs tracking-widest hover:bg-neutral-300 transition-all uppercase"
          >
            Deploy Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#050505]">
      <header className="p-4 border-b border-neutral-900 flex justify-between items-center bg-black/80 z-20">
        <div className="font-noir text-sm tracking-[0.3em] text-white">VOLCHYA <span className="text-red-700">STAYA</span></div>
        <div className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest">Moscow Time: {new Date().toLocaleTimeString()}</div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full z-10">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-neutral-900 p-4 border border-neutral-800 font-typewriter text-sm text-white' : 'space-y-4'}`}>
              {msg.role === 'assistant' ? (
                <div className="text-neutral-300 font-light leading-relaxed text-sm">
                  {msg.content.split('\n').map((line, li) => {
                    if (line.includes('|')) {
                      const [name, rest] = line.split('|');
                      return (
                        <p key={li} className="my-4">
                          <span className="font-noir text-red-700 text-xs tracking-widest mr-2">{name.trim()} |</span>
                          <span className="text-white italic">{rest}</span>
                        </p>
                      );
                    }
                    return <p key={li} className="mb-4">{line}</p>;
                  })}
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {isAiLoading && (
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 bg-red-900 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-red-900 rounded-full animate-bounce delay-100"></div>
            <div className="w-1.5 h-1.5 bg-red-900 rounded-full animate-bounce delay-200"></div>
          </div>
        )}
      </div>

      <div className="p-6 bg-black border-t border-neutral-900 z-20">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-4">
          <input 
            className="flex-1 bg-neutral-900 border border-neutral-800 p-4 text-sm text-white focus:border-red-900 outline-none font-typewriter"
            placeholder="TYPE YOUR RESPONSE..."
            value={userInput} onChange={e => setUserInput(e.target.value)}
            disabled={isAiLoading}
          />
          <button 
            className="px-8 bg-red-950 text-white font-noir text-xs tracking-widest hover:bg-red-800 disabled:opacity-50 transition-all"
            disabled={isAiLoading}
          >
            EXECUTE
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
