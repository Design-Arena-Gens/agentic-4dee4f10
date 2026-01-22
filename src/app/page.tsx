"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type SearchItem = {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
};

type AgentStatus = "idle" | "listening" | "searching" | "responding";

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    SpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventInstance) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventInstance) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventInstance {
  results: SpeechRecognitionResultListInstance;
}

interface SpeechRecognitionErrorEventInstance {
  error: string;
}

interface SpeechRecognitionResultListInstance {
  length: number;
  item: (index: number) => SpeechRecognitionResultInstance;
  [index: number]: SpeechRecognitionResultInstance;
}

interface SpeechRecognitionResultInstance {
  length: number;
  isFinal: boolean;
  item: (index: number) => SpeechRecognitionAlternativeInstance;
  [index: number]: SpeechRecognitionAlternativeInstance;
}

interface SpeechRecognitionAlternativeInstance {
  transcript: string;
  confidence: number;
}

const getSpeechRecognition = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const speak = (text: string) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const instance = new Recognition();
      instance.continuous = false;
      instance.interimResults = true;
      instance.lang = "en-US";
      instance.onresult = (event: SpeechRecognitionEventInstance) => {
        const finalResult = Array.from({ length: event.results.length })
          .map((_, index) => {
            const speechResult = event.results[index];
            if (!speechResult?.length) {
              return "";
            }
            return speechResult[0]?.transcript ?? "";
          })
          .join(" ")
          .trim();

        setTranscript(finalResult);
        setQuery(finalResult);
      };
      instance.onerror = () => {
        setStatus("idle");
      };
      instance.onend = () => {
        setStatus((prev) => (prev === "listening" ? "idle" : prev));
      };
      recognitionRef.current = instance;
      setSpeechSupported(true);
    } catch (err) {
      console.error(err);
      setSpeechSupported(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setStatus("idle");
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }
    setError(null);
    setTranscript("");
    try {
      recognitionRef.current.start();
      setStatus("listening");
    } catch (err) {
      console.error(err);
      setError("Voice input failed to start. Please try again.");
      setStatus("idle");
    }
  }, []);

  const handleSearch = useCallback(
    async (input: string) => {
      if (!input.trim()) {
        setError("Please provide something to search for.");
        return;
      }

      setStatus("searching");
      setError(null);

      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(input.trim())}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Search failed. Please try again.");
        }
        const payload = (await response.json()) as { results: SearchItem[]; summary: string };
        setResults(payload.results ?? []);
        setStatus("responding");
        speak(payload.summary || "Here are your search results.");
        setTimeout(() => {
          setStatus("idle");
        }, 600);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unexpected error occurred.");
        setStatus("idle");
      }
    },
    []
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      stopListening();
      void handleSearch(query);
    },
    [handleSearch, query, stopListening]
  );

  const actionLabel = useMemo(() => {
    switch (status) {
      case "listening":
        return "Listening...";
      case "searching":
        return "Searching...";
      case "responding":
        return "Responding...";
      default:
        return "Ask Agent";
    }
  }, [status]);

  const hasResults = results.length > 0;

  return (
    <div className={styles.wrapper}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Personal Web Agent</h1>
          <p>
            Speak or type what you need. I&apos;ll search Google and read the highlights back to you.
          </p>
        </header>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.label} htmlFor="agent-query">
            Your request
          </label>
          <div className={styles.inputRow}>
            <input
              id="agent-query"
              className={styles.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find me the latest news on AI..."
              autoComplete="off"
              disabled={status === "searching"}
            />
            <button className={styles.submit} type="submit" disabled={status === "searching"}>
              {actionLabel}
            </button>
          </div>
          <div className={styles.voiceControls}>
            <button
              type="button"
              className={styles.voiceButton}
              onClick={status === "listening" ? stopListening : startListening}
              disabled={!speechSupported || status === "searching"}
            >
              {status === "listening" ? "Stop Listening" : "Talk to Agent"}
            </button>
            {!speechSupported && (
              <span className={styles.helper}>Voice input is not supported in this browser.</span>
            )}
            {transcript && status !== "listening" && (
              <span className={styles.helper}>Captured voice: {transcript}</span>
            )}
          </div>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <h2>Agent Findings</h2>
            {hasResults && <span>{results.length} results</span>}
          </div>
          {hasResults ? (
            <ul className={styles.resultsList}>
              {results.map((item) => (
                <li key={item.link} className={styles.resultCard}>
                  <a href={item.link} target="_blank" rel="noreferrer" className={styles.resultTitle}>
                    {item.title}
                  </a>
                  {item.displayLink && <p className={styles.resultLink}>{item.displayLink}</p>}
                  <p className={styles.resultSnippet}>{item.snippet}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.placeholder}>
              <p>Ask me anything and I&apos;ll gather the most relevant answers for you.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
