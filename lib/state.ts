/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  LiveServerToolCall,
  // Fix: Add FunctionResponseScheduling and Schema to imports for FunctionCall type.
  FunctionResponseScheduling,
  Schema,
} from '@google/genai';

// Fix: Add and export FunctionCall, Template, and useTools for use across the application.
/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description?: string;
  parameters?: Schema;
  isEnabled: boolean;
  scheduling?: FunctionResponseScheduling;
}

export type Template =
  | 'customer-support'
  | 'personal-assistant'
  | 'navigation-system';

export const useTools = create<{
  template: Template;
  setTemplate: (template: Template) => void;
}>(set => ({
  template: 'customer-support',
  setTemplate: template => set({ template }),
}));

/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
}>(set => ({
  systemPrompt: `Be friendly and conversational.`,
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
}));

/**
 * UI
 */
export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: false,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

/**
 * Languages
 */
export const useLanguageStore = create<{
  fromLanguage: string;
  toLanguage: string;
  setFromLanguage: (lang: string) => void;
  setToLanguage: (lang: string) => void;
  swapLanguages: () => void;
}>(set => ({
  fromLanguage: 'English',
  toLanguage: 'Dutch', // For Flemish
  setFromLanguage: (lang) => set({ fromLanguage: lang }),
  setToLanguage: (lang) => set({ toLanguage: lang }),
  swapLanguages: () => set(state => ({ fromLanguage: state.toLanguage, toLanguage: state.fromLanguage })),
}));


/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));
