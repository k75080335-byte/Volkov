
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from './types';
import { KEY_PERSONNEL, SYSTEM_PROMPT_TEMPLATE } from './constants';
import { GoogleGenAI } from "@google/genai";

// Helper components
const HUD: React.FC<{ turn: number }> = ({ turn }) => {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return (
    <div className="bg-zinc-900 border-b border-zinc-800 p-2 text-[10px] font-mono text-zinc-500 flex justify-between items-center sticky top-0 z-50">
      <span>T{turn}｜2025/01/15/${days[now.getDay()]}｜22:45｜겨울｜🌨️｜🏢 폐공장 지하</span>
      <span className="text-red-900 font-bold uppercase tracking-widest">Volchya Staya</span>
    </div>
  );
};

const PersonnelCard: React.FC<{ p: typeof KEY_PERSONNEL[0] }> = ({ p }) => (
  <div className="glass p-4 rounded-lg flex flex-col gap-3 group hover:border-red-900 transition-all">
    <div className="relative overflow-hidden h-48 rounded">
      <img src={p.image} alt={p.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black p-2">
        <p className="text-xs text-red-600 font-bold">{p.alias}</p>
        <h4 className="font-serif text-white">{p.name}</h4>
      </div>
    </div>
    <div className="text-xs space-y-1">
      <p><span className="text-zinc-500">직책:</span> {p.role}</p>
      <p><span className="text-zinc-500">정보:</span> {p.age} / {p.height}</p>
      <p className="text-zinc-400 leading-relaxed mt-2">{p.description}</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<'profile' | 'dashboard' | 'chat'>('profile');
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    age: '',
    appearance: '',
    personality: '',
    role: ''
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(profile).every(v => v.trim() !== '')) {
      setStep('dashboard');
    }
  };

  const startStory = async () => {
    setStep('chat');
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "신규 세션을 시작하라. 팍한의 집무실에서 주인공을 맞이하는 장면으로.",
        config: {
          systemInstruction: SYSTEM_PROMPT_TEMPLATE(profile),
          temperature: 0.9,
          topP: 0.95,
        }
      });
      
      const content = response.text || "서사 엔진 오류. 다시 시도하십시오.";
      setMessages([{ role: 'assistant', content, timestamp: new Date().toLocaleTimeString() }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const currentInput = userInput;
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: currentInput, timestamp: new Date().toLocaleTimeString() }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: SYSTEM_PROMPT_TEMPLATE(profile),
        },
      });

      // Simple history building
      const response = await chat.sendMessage({ message: currentInput });
      const aiResponse = response.text || "대응 불가.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: new Date().toLocaleTimeString() }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'profile') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 noir-gradient">
        <div className="max-w-md w-full glass p-8 rounded-xl russia-accent">
          <h1 className="text-3xl font-serif text-white mb-2 italic">Регистрация</h1>
          <p className="text-zinc-500 text-sm mb-6 uppercase tracking-widest">User Profile Assignment</p>
          
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1 uppercase">이름 / Name</label>
              <input 
                type="text" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm focus:outline-none focus:border-red-900 transition-all"
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
                placeholder="Ex. 카티야 안드레예바"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase">나이 / Age</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm focus:outline-none focus:border-red-900"
                  value={profile.age}
                  onChange={e => setProfile({...profile, age: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase">직함 / Role</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm focus:outline-none focus:border-red-900"
                  value={profile.role}
                  onChange={e => setProfile({...profile, role: e.target.value})}
                  placeholder="Ex. 무기 운반책"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1 uppercase">외모 / Appearance</label>
              <textarea 
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm focus:outline-none focus:border-red-900 h-20"
                value={profile.appearance}
                onChange={e => setProfile({...profile, appearance: e.target.value})}
                placeholder="머리색, 눈동자, 옷차림 등..."
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1 uppercase">성격 / Personality</label>
              <textarea 
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm focus:outline-none focus:border-red-900 h-20"
                value={profile.personality}
                onChange={e => setProfile({...profile, personality: e.target.value})}
                placeholder="차분함, 호전적, 복종적 등..."
              />
            </div>
            <button className="w-full bg-red-950 hover:bg-red-900 text-white font-bold py-3 rounded transition-colors uppercase tracking-widest text-xs mt-4">
              기록 확인 (Accept)
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'dashboard') {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-300 p-8">
        <header className="mb-12 border-b border-zinc-800 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-serif text-white italic">Волчья ста야</h1>
            <p className="text-red-700 tracking-[0.3em] font-bold mt-2">VOLCHYA STAYA : KNOWLEDGE BASE</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">SIGNED IN AS</p>
            <p className="text-sm font-bold text-white">{profile.name} [{profile.role}]</p>
          </div>
        </header>

        <section className="mb-12">
          <h2 className="text-xl font-serif text-zinc-100 mb-6 flex items-center gap-2">
            <span className="w-8 h-[1px] bg-red-800"></span>
            Key Personnel
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {KEY_PERSONNEL.map((p, idx) => <PersonnelCard key={idx} p={p} />)}
          </div>
        </section>

        <section className="max-w-4xl mx-auto glass p-8 rounded-xl text-center">
          <h3 className="text-2xl font-serif text-white mb-4 italic">당신의 이야기가 시작될 준비가 되었습니다.</h3>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            모스크바의 차가운 눈발이 폐공장의 깨진 창틀 사이로 들이칩니다.<br/>
            피비린내와 가죽 냄새가 진동하는 지하 세계에서, 당신의 선택은 곧 생존입니다.
          </p>
          <button 
            onClick={startStory}
            className="px-12 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all rounded"
          >
            임무 개시 (Deploy)
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      <HUD turn={messages.filter(m => m.role === 'assistant').length} />
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`group ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            {msg.role === 'assistant' ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 font-light">
                {msg.content.split('\n').map((line, li) => {
                  if (line.includes('|') && line.includes('「')) {
                    const [name, rest] = line.split('|');
                    return (
                      <div key={li} className="my-4">
                        <span className="font-bold text-white uppercase tracking-tighter mr-1">{name} |</span>
                        <span className="text-red-100 italic">{rest}</span>
                      </div>
                    );
                  }
                  if (line.startsWith('*') && line.endsWith('*')) {
                    return <p key={li} className="text-zinc-500 italic text-[13px] my-2">{line}</p>;
                  }
                  return <p key={li} className="mb-4">{line}</p>;
                })}
              </div>
            ) : (
              <div className="inline-block bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-sm text-zinc-200 max-w-[80%]">
                {msg.content}
              </div>
            )}
            <p className="text-[10px] text-zinc-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">{msg.timestamp}</p>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-red-900 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-red-900 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-red-900 rounded-full animate-bounce delay-200"></div>
          </div>
        )}
      </div>

      <div className="p-4 bg-zinc-950 border-t border-zinc-900">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-4">
          <input 
            type="text"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-3 text-sm text-white focus:outline-none focus:border-red-900 transition-all"
            placeholder="당신의 행동이나 대사를 입력하세요..."
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            disabled={isLoading}
          />
          <button 
            disabled={isLoading}
            className="px-6 bg-red-950 hover:bg-red-900 text-white rounded font-bold uppercase text-xs tracking-widest disabled:opacity-50"
          >
            EXECUTE
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
