'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Waves } from 'lucide-react';
import { sendChatMessage } from '@/lib/ai';
import { parseCommand, executeBuiltinCommand } from '@/lib/commands';
import { Message } from '@/lib/storage';
import AIOrb from './AIOrb';

export default function VoiceAssistant() {
  const {
    isListening, setIsListening, voiceSupported, startListening, stopListening,
    speak, orbState, setOrbState, settings, startTimer, addNotification
  } = useApp();

  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        handleCommand(finalTranscript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setOrbState('IDLE');
    };

    recognition.onerror = () => {
      setIsListening(false);
      setOrbState('ERROR');
      addNotification('VOICE', 'Voice recognition error. Please try again.', 'error');
    };

    recognitionRef.current = recognition;
  }, []);

  const handleCommand = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date().toISOString(),
    };
    setConversation(prev => [...prev, userMsg]);

    const parsed = parseCommand(text);

    if (parsed.type === 'builtin') {
      setOrbState('THINKING');
      const result = await executeBuiltinCommand(parsed, speak, startTimer);
      setOrbState('IDLE');

      const aiMsg: Message = {
        id: crypto.randomUUID(), role: 'assistant', content: result, timestamp: new Date().toISOString(),
      };
      setConversation(prev => [...prev, aiMsg]);
      setResponse(result);
      speak(result);
      return;
    }

    setOrbState('THINKING');
    const result = await sendChatMessage(text, conversation);
    setOrbState('IDLE');

    const aiMsg: Message = {
      id: crypto.randomUUID(), role: 'assistant', content: result.response || result.error || 'No response.', timestamp: new Date().toISOString(),
    };
    setConversation(prev => [...prev, aiMsg]);
    setResponse(result.response || result.error || '');
    speak(result.response || result.error || '');
  }, [conversation, speak, setOrbState, startTimer]);

  const toggleListening = () => {
    if (!voiceSupported) {
      addNotification('VOICE', 'Voice recognition is not supported in this browser.', 'error');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      stopListening();
    } else {
      setTranscript('');
      setResponse('');
      recognitionRef.current?.start();
      setIsListening(true);
      setOrbState('LISTENING');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      {/* Orb display */}
      <div className="w-72 h-72 md:w-96 md:h-96 relative">
        <AIOrb />
      </div>

      {/* State indicator */}
      <motion.div
        className="mt-4 text-center"
        animate={{ opacity: 1 }}
      >
        <div className="text-2xl font-bold text-cyan-400 tracking-widest">JARVIS</div>
        <div className="text-sm text-cyan-400/60 tracking-wider mt-1">
          {orbState === 'IDLE' && 'SYSTEM ONLINE'}
          {orbState === 'LISTENING' && 'LISTENING...'}
          {orbState === 'THINKING' && 'ANALYZING...'}
          {orbState === 'SPEAKING' && 'SPEAKING...'}
          {orbState === 'ERROR' && 'ERROR DETECTED'}
        </div>
      </motion.div>

      {/* Transcript */}
      <div className="mt-6 w-full max-w-lg min-h-[60px] text-center">
        <AnimatePresence mode="wait">
          {transcript && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-gray-300 text-lg italic"
            >
              &quot;{transcript}&quot;
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {response && !isListening && (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-gray-400 text-sm mt-2"
            >
              {response}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mic button */}
      <div className="mt-8 flex items-center gap-4">
        <motion.button
          onClick={toggleListening}
          whileTap={{ scale: 0.95 }}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-red-500/20 border-2 border-red-500 text-red-400 shadow-lg shadow-red-500/20'
              : 'bg-cyan-500/10 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20'
          }`}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.button>

        {!voiceSupported && (
          <div className="text-xs text-yellow-400/70 max-w-xs">
            Voice recognition is not available in this browser. You can continue using text commands.
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          {isListening ? 'Speak now...' : 'Click the microphone or press Space to start'}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Try: &quot;Hey JARVIS, what time is it?&quot; or &quot;Tell me a joke&quot;
        </p>
      </div>
    </div>
  );
}
