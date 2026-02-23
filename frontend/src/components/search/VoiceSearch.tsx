import React, { useState, useCallback, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceSearchProps {
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventMap {
  results: SpeechRecognitionResultList;
}
type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventMap) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function getSpeechRecognition(): SpeechRecognitionCtor | false {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || false;
}

const SpeechRecognition = getSpeechRecognition();

const VoiceSearch: React.FC<VoiceSearchProps> = ({
  onResult,
  onError,
  disabled = false,
  className = "",
}) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(
    null,
  );

  useEffect(() => {
    setSupported(!!SpeechRecognition);
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition || disabled || listening) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setListening(true);
      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      recognition.onerror = (event: { error: string }) => {
        setListening(false);
        recognitionRef.current = null;
        if (event.error === "not-allowed") {
          onError?.("Microphone access denied");
        } else if (event.error !== "aborted") {
          onError?.("Voice recognition failed");
        }
      };
      recognition.onresult = (event: SpeechRecognitionEventMap) => {
        const transcript = Array.from(event.results)
          .map((r: SpeechRecognitionResult) => r[0].transcript)
          .join(" ")
          .trim();
        if (transcript) onResult(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      onError?.("Could not start voice recognition");
    }
  }, [disabled, onError, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      disabled={disabled}
      aria-label={listening ? "Stop voice search" : "Start voice search"}
      className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-1 disabled:opacity-50 ${
        listening
          ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-deep-slate dark:text-gray-300 hover:text-deep-slate dark:hover:text-white"
      } ${className}`}
    >
      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </button>
  );
};

export default VoiceSearch;
