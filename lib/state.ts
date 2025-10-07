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
import { supabase } from './supabaseClient';

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
const MOCK_USER_EMAIL = 'demo-user@example.com';

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
  id?: number;
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
  init: () => Promise<void>;
  addTurn: (turn: Omit<ConversationTurn, 'timestamp' | 'id'>) => Promise<void>;
  updateLastTurn: (update: Partial<ConversationTurn>) => Promise<void>;
  clearTurns: () => Promise<void>;
}>((set, get) => ({
  turns: [],
  init: async () => {
    const { data, error } = await supabase
      .from('conversation_history')
      .select('id, turn_data')
      .eq('user_email', MOCK_USER_EMAIL)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching history:', error);
      return;
    }

    if (data) {
      const turns = data.map(row => ({
        ...(row.turn_data as object),
        id: row.id,
        timestamp: new Date((row.turn_data as any).timestamp),
      } as ConversationTurn));
      set({ turns });
    }
  },
  addTurn: async (turn: Omit<ConversationTurn, 'timestamp' | 'id'>) => {
    const newTurn: Omit<ConversationTurn, 'id'> = { ...turn, timestamp: new Date() };

    const { data, error } = await supabase
      .from('conversation_history')
      .insert({ user_email: MOCK_USER_EMAIL, turn_data: newTurn })
      .select('id')
      .single();

    if (error) {
      console.error('Error adding turn:', error);
      return;
    }

    if (data) {
      const turnWithId = { ...newTurn, id: data.id };
      set(state => ({ turns: [...state.turns, turnWithId] }));
    }
  },
  updateLastTurn: async (update: Partial<Omit<ConversationTurn, 'timestamp' | 'id'>>) => {
    const currentTurns = get().turns;
    if (currentTurns.length === 0) {
      return;
    }
    const lastTurn = { ...currentTurns[currentTurns.length - 1] };
    if (!lastTurn.id) {
        console.error("Cannot update last turn without an ID");
        return;
    }

    const updatedTurnData = { ...lastTurn, ...update };
    const { id, ...turn_data } = updatedTurnData;

    const { error } = await supabase
      .from('conversation_history')
      .update({ turn_data })
      .eq('id', lastTurn.id);

    if (error) {
        console.error('Error updating turn:', error);
        return;
    }

    set(state => {
        const newTurns = [...state.turns];
        newTurns[newTurns.length - 1] = updatedTurnData;
        return { turns: newTurns };
    });
  },
  clearTurns: async () => {
    const { error } = await supabase
        .from('conversation_history')
        .delete()
        .eq('user_email', MOCK_USER_EMAIL);

    if (error) {
        console.error('Error clearing history:', error);
        return;
    }
    set({ turns: [] });
  },
}));