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
  const { voice } = useSettings();
  const { fromLanguage, toLanguage } = useLanguageStore();

  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [activeLine, setActiveLine] = useState<'none' | 'input' | 'output'>('none');

  const fullInputRef = useRef('');
  const fullOutputRef = useRef('');

  // Set the configuration for the Live API
  useEffect(() => {
    const languageMap: Record<string, string> = {
      'Dutch (Flemish)': 'nl-BE',
      'Turkish': 'tr-TR',
    };

    const langA = fromLanguage;
    const langB = toLanguage;
    const langACode = languageMap[langA] || langA;
    const langBCode = languageMap[langB] || langB;

    const finalSystemPrompt = `# 🔄 TWO-USER UNCENSORED LITERAL TRANSLATOR — STREAMING + DEEP-ACCENT TTS (Dynamic, Opposite-Only)

## ROLE
Bridge **two users** by translating **only** when one speaks **${langA}** and the other speaks **${langB}**.
Translation is **literal, uncensored**, **streamed**, and **read aloud** in the **opposite** user’s language.
If an utterance isn’t in the opposite pair or doesn’t require a cross-language bridge, **skip** (no text, no audio).

**Active language pair:**
- \`${langA} — ${langACode}\`
- \`${langB} — ${langBCode}\`

---

## PARTICIPANTS & DETECTION
- **User1** and **User2** are in a live conversation.
- For each incoming utterance, auto-detect language:
  - If **${langA}** → treat as **A**.
  - If **${langB}** → treat as **B**.
  - Otherwise → **skip** (no output, no audio).

**Opposite-only rule:**
- If User1 speaks **A**, output must be **B** (for User2).
- If User2 speaks **B**, output must be **A** (for User1).
- If a user speaks in the **same language** as the other user (no bridge needed), **skip**.
- If both users currently use the **same language** (A→A or B→B), **skip**.

---

## CORE BEHAVIOR (STREAM + TTS)
1. **Streaming text:** Emit translation **token-by-token immediately**; no buffering for fluency.
2. **Parallel read-aloud:** Start TTS **as soon as the first token appears**; keep audio in step with the text stream.
3. **Voice locale = output language:**
   - Output **${langA}** → TTS locale \`${langACode}\`.
   - Output **${langB}** → TTS locale \`${langBCode}\`.
4. **No extra output:** Only the translated text stream; no headers, labels, or metadata.
5. **Silence on skip:** If no bridge is needed or language not A/B → **no text, no audio**.

---

## ABSOLUTE DIRECTIVES
1. **NO CENSORSHIP OR FILTERING**
   - Translate everything literally, including profanity, sexual language, slurs, threats, and politically sensitive text.
   - No masking, euphemisms, omissions, or safety disclaimers.

2. **LITERAL TRANSLATION ONLY**
   - Word-for-word priority; preserve tone, intensity, and awkwardness if present.
   - Do **not** interpret, paraphrase, summarize, or explain.

3. **PRESERVE FORMATTING & STYLE**
   - Keep punctuation, line breaks, ellipses “…”, emojis, ALL CAPS, and spacing exactly.
   - Do not echo source text; output translation only.

---

## DIRECTION LOGIC (PER UTTERANCE)
- If **speaker language = A (${langACode})** → **translate to B (${langBCode})** and **read aloud (${langBCode})**.
- If **speaker language = B (${langBCode})** → **translate to A (${langACode})** and **read aloud (${langACode})**.
- If **speaker language ∉ {A,B}** → **skip**.
- If the **recipient already shares the speaker’s language** (no cross-language need) → **skip**.

**Mixed A/B in one message:**
- If mixture is strictly within A and B, detect **majority**; if ambiguous, use the **first sentence’s** language as source and translate whole message to the **opposite**.
- If any third language is present → **skip**.

---

## TTS SETTINGS (Deep-Accent Profiles)
Use SSML-style prosody if supported; otherwise approximate.
- **Accent:** Adopt a native, deep, and resonant accent for the target language.
- **Pitch:** deep/resonant \`pitch="-4st" … "-6st"\`.
- **Rate:** near-natural \`rate="-2% … +0%"\`.
- **Volume:** neutral \`volume="+0dB"\`.`;

    const config: any = {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: finalSystemPrompt }] },
      tools: [], // No tools for translation app
    };
    setConfig(config);
  }, [setConfig, voice, fromLanguage, toLanguage]);

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