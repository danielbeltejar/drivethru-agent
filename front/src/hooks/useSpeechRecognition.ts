import { useState, useCallback, useRef } from 'react';
import { API_BASE } from '@/config/api';

interface SpeechRecognitionHook {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  isSupported: boolean;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const channelData = buffer.getChannelData(0);
  const dataLength = channelData.length * bytesPerSample;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioCtx.close();
  return audioBufferToWav(audioBuffer);
}

function getSupportedMimeType(): string | null {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

const SILENCE_THRESHOLD = 0.02;
const SILENCE_TIMEOUT_MS = 2000;

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceCheckRef = useRef<number>(0);

  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  const stopStream = useCallback(() => {
    if (silenceCheckRef.current) {
      cancelAnimationFrame(silenceCheckRef.current);
      silenceCheckRef.current = 0;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    stopStream();
  }, [stopStream]);

  const transcribe = useCallback(async (chunks: Blob[], mimeType: string) => {
    const rawBlob = new Blob(chunks, { type: mimeType });
    setIsListening(false);
    setIsProcessing(true);

    try {
      const wavBlob = await blobToWav(rawBlob);
      const formData = new FormData();
      formData.append('audio', wavBlob, 'recording.wav');

      const res = await fetch(`${API_BASE}/transcribe`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setTranscript(data.text || '');
    } catch {
      setTranscript('');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Silence detection via AnalyserNode
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart = 0;
      let startedSpeaking = false;
      const recordingStart = Date.now();

      const checkSilence = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / bufferLength);

        if (rms > SILENCE_THRESHOLD) {
          startedSpeaking = true;
          silenceStart = 0;
        } else if (startedSpeaking) {
          if (silenceStart === 0) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > SILENCE_TIMEOUT_MS) {
            stopRecording();
            return;
          }
        } else if (!startedSpeaking && Date.now() - recordingStart > 8000) {
          // Auto-stop after 8s of silence without any speech
          stopRecording();
          return;
        }

        silenceCheckRef.current = requestAnimationFrame(checkSilence);
      };

      checkSilence();

      const mimeType = getSupportedMimeType() || 'audio/webm';
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        transcribe(chunksRef.current, mimeTypeRef.current);
      };

      recorder.start(250);
      setIsListening(true);
      setTranscript('');
    } catch {
      // Permission denied or no mic available
    }
  }, [isSupported, stopRecording, transcribe]);

  const stopListening = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return { isListening, isProcessing, transcript, startListening, stopListening, clearTranscript, isSupported };
}
