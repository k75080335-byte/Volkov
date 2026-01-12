
export interface UserProfile {
  name: string;
  age: string;
  appearance: string;
  personality: string;
  role: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface CharacterProfile {
  name: string;
  alias?: string;
  role: string;
  age: string;
  height: string;
  description: string;
  image: string;
}
