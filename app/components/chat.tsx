"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Loader, User, Volume2, VolumeX } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useAuth } from "@clerk/nextjs";
import { useAppStore } from "../store/useAppStore";
import "katex/dist/katex.min.css";
import toast from "react-hot-toast";
import removeMd from "remove-markdown";

export default function ChatComponent() {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<string>("");
  const { messages, addMessage, currSessionId } = useAppStore();
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const handleSendQueryToRAG = async (query: string) => {
    try {
      const token = await getToken();
      setIsFetching(true);
      addMessage({ role: "user", content: query, sources: [], followUps: [] });
      const cleanedMessages = messages.map(({ role, content }) => ({
        role,
        content,
      }));
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          messages: cleanedMessages,
          sessionId: currSessionId,
        }),
      });

      const data = await res.json();
      setQuery("");
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        setIsFetching(false);
        return;
      }

      addMessage({
        role: "assistant",
        content: data.message,
        sources: data.sources,
        followUps: data.followUpQuestions,
      });

      setIsFetching(false);
    } catch (e) {
      alert(e);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    divRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSpeak = (content: string, idx: number) => {
    if (speakingIndex === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel(); // stop any ongoing recital
    const pureText = removeMd(content);
    const recitance = new SpeechSynthesisUtterance(pureText);
    recitance.onend = () => setSpeakingIndex(null); // recitance.onend is an event handler that fires when the speech finishes naturally (the entire text has been read aloud).
    window.speechSynthesis.speak(recitance);
    setSpeakingIndex(idx);
  };

  return (
    <div className="p-2 flex flex-col h-full">
      <div className="flex-1 bg-violet-50 min-h-0 overflow-y-auto rounded-2xl">
        {messages.map((m, idx) => (
          <div key={idx} className="pl-4 pt-2 pr-4">
            <div className="flex gap-2">
              <div className="shrink-0">
                {m.role === "user" ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className="prose prose-sm max-w-none wrap-break-word">
                {m.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  <p className="font-bold">{m.content}</p>
                )}
                {m.role === "assistant" && (
                  <Button
                    onClick={() => handleSpeak(m.content, idx)}
                    title={
                      speakingIndex === null
                        ? "read aloud"
                        : speakingIndex === idx
                          ? "stop"
                          : "read aloud"
                    }
                    className="cursor-pointer"
                  >
                    {speakingIndex === null ? (
                      <Volume2 />
                    ) : speakingIndex === idx ? (
                      <VolumeX />
                    ) : (
                      <Volume2 />
                    )}
                  </Button>
                )}
                {m.sources &&
                  m.sources.length > 0 &&
                  m.role === "assistant" && (
                    <div className="bg-violet-100 p-2 pt-0 mb-2 rounded-2xl">
                      <h2>Sources</h2>
                      {m.sources.map((s) => (
                        <div key={s.page} className="flex gap-2">
                          <p>PDF: {s.PDF}</p>
                          <p>page: {s.page}</p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        ))}
        {messages.length > 0 &&
          messages[messages.length - 1].followUps?.length > 0 && (
            <div className="prose prose-sm max-w-none wrap-break-word pl-4 mb-2">
              <h2>Follow up qs suggestions:</h2>
              {messages[messages.length - 1].followUps.map((q, idx) => (
                <Button
                  key={idx}
                  className="block cursor-pointer"
                  onClick={() => {
                    handleSendQueryToRAG(q);
                  }}
                >
                  {q}
                </Button>
              ))}
            </div>
          )}
        <div ref={divRef}>
          {isFetching ? (
            <div className="flex pl-4 pt-2 gap-2">
              <Bot size={20} />
              <Loader className="animate-spin" />
            </div>
          ) : (
            ""
          )}
        </div>
      </div>
      <div className="flex gap-4 justify-center w-full mt-4 mb-4">
        <Input
          ref={inputRef}
          placeholder="Type your query here"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="hover:border-blue-950 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-950 w-[60vw] md:w-[40vw] lg:w-[30vw]"
        />
        <Button
          disabled={!query.trim() || !currSessionId || isFetching}
          onClick={() => {
            handleSendQueryToRAG(query);
          }}
          className="bg-violet-600 text-white border-none cursor-pointer hover:bg-violet-700 transition"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
