/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef, useState } from 'react';
import { Modality } from '@google/genai';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import {
  useSettings,
  useLogStore,
  useLanguageStore,
} from '@/lib/state';

// Component to render text with a blinking cursor
const AnimatedText = ({ text, className, hasCursor }: { text: string, className: string, hasCursor: boolean }) => {
  return (
    <p className={className}>
      {text}
      {hasCursor && <span className="cursor" />}
    </p>
  );
};

export default function StreamingConsole() {
  const { client, setConfig } = useLiveAPIContext();
  const { systemPrompt, voice } = useSettings();
  const { fromLanguage, toLanguage } = useLanguageStore();

  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [activeLine, setActiveLine] = useState<'none' | 'input' | 'output'>('none');

  const fullInputRef = useRef('');
  const fullOutputRef = useRef('');

  // Set the configuration for the Live API
  useEffect(() => {
    const translationPrompt = `You are a real-time, expert translator. The user can speak in either ${fromLanguage} or ${toLanguage}. Your task is to automatically detect the language being spoken and provide an immediate, direct translation into the other language. When providing the translation, adopt the persona of a native speaker of the target language, ensuring the phrasing and style are authentic and natural. For example, if the user speaks ${fromLanguage}, you must reply with the ${toLanguage} translation. If the user speaks ${toLanguage}, you must reply with the ${fromLanguage} translation. Provide only the translated text, without any additional explanations, pleasantries, or introductory phrases. If the user speaks any other language, do not respond at all. Remain silent.`;
    const finalSystemPrompt = `${translationPrompt}\n\n${systemPrompt}`;
    const config: any = {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: finalSystemPrompt }] },
      tools: [], // No tools for translation app
    };
    setConfig(config);
  }, [setConfig, systemPrompt, voice, fromLanguage, toLanguage]);

  // Handle events from the Live API client
  useEffect(() => {
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const handleInputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];

      // New user turn starts
      if (!last || last.role !== 'user' || last.isFinal) {
        fullInputRef.current = text;
        fullOutputRef.current = '';
        addTurn({ role: 'user', text, isFinal });
      } else { // Continuing user turn
        fullInputRef.current += text;
        updateLastTurn({ text: fullInputRef.current, isFinal });
      }
      setCurrentInput(fullInputRef.current);
      setCurrentOutput(fullOutputRef.current);
      setActiveLine('input');
    };

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];

      // New agent turn starts
      if (!last || last.role !== 'agent' || last.isFinal) {
        fullOutputRef.current = text;
        addTurn({ role: 'agent', text, isFinal });
      } else { // Continuing agent turn
        fullOutputRef.current += text;
        updateLastTurn({ text: fullOutputRef.current, isFinal });
      }
      setCurrentOutput(fullOutputRef.current);
      setActiveLine('output');
    };

    const handleTurnComplete = () => {
      const last = useLogStore.getState().turns.at(-1);
      if (last && !last.isFinal) {
        updateLastTurn({ isFinal: true });
      }
      setActiveLine('none');
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('turncomplete', handleTurnComplete);

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('turncomplete', handleTurnComplete);
    };
  }, [client]);

  const showPlaceholder = currentInput === '' && currentOutput === '';

  return (
    <div className="transcription-container">
      {showPlaceholder ? (
        <div className="empty-chat-placeholder">
          <span className="icon">translate</span>
          <p>Press the microphone to start translating</p>
        </div>
      ) : (
        <div className="animated-text-view">
          <AnimatedText
            text={currentInput}
            className="animated-text transcribed-text"
            hasCursor={activeLine === 'input'}
          />
          <AnimatedText
            text={currentOutput}
            className="animated-text translated-text"
            hasCursor={activeLine === 'output'}
          />
        </div>
      )}
    </div>
  );
}