import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { API_BASE } from '@/config/api';
import { ChatMessage, ChatResponse, Order } from '@/models/OrderMessage';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';

interface Props {
  clientId: string;
  onOrderUpdate: (order: Order) => void;
  onOrderClosed: () => void;
  orderClosed: boolean;
}

export default function VoiceChat({ clientId, onOrderUpdate, onOrderClosed, orderClosed }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const greetingSentRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const { isListening, transcript, startListening, stopListening, clearTranscript, isSupported } = useSpeechRecognition();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // TTS: speak Alex's messages aloud
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!ttsEnabled || !window.speechSynthesis) {
      onDone?.();
      return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    // Try to pick a Spanish voice
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es'));
    if (esVoice) utterance.voice = esVoice;

    speakingRef.current = true;
    setIsSpeaking(true);
    utterance.onend = () => {
      speakingRef.current = false;
      setIsSpeaking(false);
      onDone?.();
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setIsSpeaking(false);
      onDone?.();
    };
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sendingRef.current || orderClosed || isBanned) return;

    sendingRef.current = true;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message: text.trim() }),
      });
      const data: ChatResponse = await res.json();

      const assistantMsg: ChatMessage = { role: 'assistant', content: data.message };
      setMessages(prev => [...prev, assistantMsg]);

      // Always update order panel — use current order if backend didn't return one
      if (data.order) {
        onOrderUpdate(data.order);
      }

      if (data.command === 'close') {
        onOrderClosed();
        setVoiceMode(false);
        speak(data.message);
      } else if (data.command === 'ban') {
        setIsBanned(true);
        setVoiceMode(false);
        speak(data.message);
      } else if (voiceMode && isSupported) {
        // Speak Alex's response, then re-activate mic after TTS finishes
        speak(data.message, () => {
          setTimeout(() => startListening(), 300);
        });
      } else {
        speak(data.message);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, estamos teniendo problemas técnicos. Inténtalo de nuevo.'
      }]);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  };

  // Handle completed speech transcript — fire once then clear
  useEffect(() => {
    if (transcript && !isListening && !sendingRef.current) {
      const text = transcript;
      clearTranscript();
      sendMessage(text);
    }
  }, [transcript, isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open and send initial greeting (once), then auto-start mic
  useEffect(() => {
    if (greetingSentRef.current) return;
    greetingSentRef.current = true;

    // Preload voices for TTS
    window.speechSynthesis?.getVoices();

    setIsExpanded(true);
    setIsLoading(true);
    fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, message: '' }),
    })
      .then(res => res.json())
      .then((data: ChatResponse) => {
        setMessages([{ role: 'assistant', content: data.message }]);
        if (data.order) onOrderUpdate(data.order);
        // Speak greeting, then auto-start mic
        speak(data.message, () => {
          if (isSupported) {
            setVoiceMode(true);
            setTimeout(() => startListening(), 300);
          }
        });
      })
      .catch(() => {
        const fallback = '¡Bienvenido a Cosmo Burger! Soy Alex, ¿qué te pongo hoy?';
        setMessages([{ role: 'assistant', content: fallback }]);
        speak(fallback, () => {
          if (isSupported) {
            setVoiceMode(true);
            setTimeout(() => startListening(), 300);
          }
        });
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVoiceMode(false);
    sendMessage(inputText);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setVoiceMode(false);
    } else {
      setVoiceMode(true);
      startListening();
      if (!isExpanded) setIsExpanded(true);
    }
  };

  return (
    <div className="border-t border-orange-500/20 bg-gradient-to-t from-black/80 via-[#0f0a05]/95 to-transparent backdrop-blur-sm">
      {/* Toggle bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <Volume2 className="w-3.5 h-3.5 text-orange-400/70" />
        <span className="font-display text-[10px] tracking-widest text-orange-400/70 uppercase">
          {isExpanded ? 'Ocultar chat' : 'Habla con Alex — Haz tu pedido'}
        </span>
        <svg
          className={`w-3 h-3 text-orange-400/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Expanded chat area */}
      {isExpanded && (
        <div className="animate-slide-up">
          {/* Messages */}
          <div className="max-h-48 overflow-y-auto px-4 py-2 space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm font-body leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-orange-600/80 text-white rounded-br-sm'
                      : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <span className="text-orange-400 text-[10px] font-display font-bold tracking-wider block mb-0.5">
                      ALEX
                    </span>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-xl px-3 py-2 rounded-bl-sm border border-white/5">
                  <span className="text-orange-400 text-[10px] font-display font-bold tracking-wider block mb-0.5">
                    ALEX
                  </span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-orange-400/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-orange-400/60 rounded-full animate-bounce animation-delay-500" />
                    <div className="w-2 h-2 bg-orange-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-white/5">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              {/* Mic Button */}
              <button
                type="button"
                onClick={handleMicClick}
                disabled={orderClosed || isBanned || !isSupported || isLoading || isSpeaking}
                className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 animate-mic-pulse text-white'
                    : voiceMode
                      ? 'bg-orange-500 text-white ring-2 ring-orange-400/50'
                      : 'bg-orange-600/80 hover:bg-orange-500 text-white'
                } ${(orderClosed || isBanned || !isSupported || isLoading || isSpeaking) ? 'opacity-30 cursor-not-allowed' : ''}`}
                title={isSupported ? (isListening ? 'Parar' : 'Hablar') : 'Navegador no compatible con voz'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* TTS Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (ttsEnabled) {
                    window.speechSynthesis?.cancel();
                    setIsSpeaking(false);
                  }
                  setTtsEnabled(prev => !prev);
                }}
                className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  ttsEnabled
                    ? 'bg-white/10 text-orange-400 hover:bg-white/15'
                    : 'bg-white/5 text-white/30 hover:bg-white/10'
                }`}
                title={ttsEnabled ? 'Silenciar a Alex' : 'Activar voz de Alex'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  orderClosed ? 'Pedido completado'
                  : isBanned ? 'Sesión terminada'
                  : isSpeaking ? 'Alex está hablando...'
                  : isListening ? 'Escuchando...'
                  : voiceMode ? 'Modo voz activo — esperando respuesta...'
                  : 'Escribe tu pedido...'
                }
                disabled={orderClosed || isBanned || isLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-body text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 disabled:opacity-30 transition-colors"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading || orderClosed || isBanned}
                className="shrink-0 w-11 h-11 rounded-lg bg-orange-600/80 hover:bg-orange-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {(isListening || isSpeaking) && (
              <div className="mt-2 text-center">
                {isSpeaking && (
                  <span className="text-orange-400 text-xs font-display tracking-wider animate-pulse">
                    ● ALEX HABLANDO...
                  </span>
                )}
                {isListening && (
                  <span className="text-red-400 text-xs font-display tracking-wider animate-pulse">
                    ● ESCUCHANDO...
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
