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
const savedVoiceSettings = JSON.parse(localStorage.getItem('voice-settings') || '{}');
export const useSettings = create<{
  model: string;
  voice: string;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
}>(set => ({
  model: DEFAULT_LIVE_API_MODEL,
  voice: savedVoiceSettings.voice || DEFAULT_VOICE,
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
}));

useSettings.subscribe(state => {
  const { voice } = state;
  localStorage.setItem('voice-settings', JSON.stringify({ voice }));
});


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
const initialLanguageState = {
  fromLanguage: 'Turkish',
  toLanguage: 'Dutch (Flemish)',
};
let savedLanguageState = {};
try {
  savedLanguageState = JSON.parse(localStorage.getItem('language-settings') || '{}');
} catch (e) {
  console.error("Could not parse language settings from localStorage", e);
}

export const useLanguageStore = create<{
  fromLanguage: string;
  toLanguage: string;
  setFromLanguage: (lang: string) => void;
  setToLanguage: (lang: string) => void;
  swapLanguages: () => void;
}>(set => ({
  ...initialLanguageState,
  ...savedLanguageState,
  setFromLanguage: (lang) => set({ fromLanguage: lang }),
  setToLanguage: (lang) => set({ toLanguage: lang }),
  swapLanguages: () => set(state => ({ fromLanguage: state.toLanguage, toLanguage: state.fromLanguage })),
}));

useLanguageStore.subscribe(state => {
  const { fromLanguage, toLanguage } = state;
  localStorage.setItem('language-settings', JSON.stringify({ fromLanguage, toLanguage }));
});


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

const initialLogState = {
  turns: [],
};
let savedLogState = {};
try {
  const savedTurns = localStorage.getItem('translation-history');
  if (savedTurns) {
    // Make sure to parse timestamps correctly
    const parsedTurns = JSON.parse(savedTurns).map((turn: any) => ({
      ...turn,
      timestamp: new Date(turn.timestamp),
    }));
    savedLogState = { turns: parsedTurns };
  }
} catch (e) {
  console.error("Could not parse translation history from localStorage", e);
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  ...initialLogState,
  ...savedLogState,
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

useLogStore.subscribe(state => {
  localStorage.setItem('translation-history', JSON.stringify(state.turns));
});