"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { authService } from "@/features/auth/services/auth.service";

interface ChatbotStateMessage {
  source: "efacility-chatbot";
  type: "chatbot:state";
  isOpen: boolean;
}

const CHATBOT_URL =
  process.env.NEXT_PUBLIC_CHATBOT_URL || "http://localhost:4200";

export function ChatbotEmbed() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatbotOrigin = useMemo(() => {
    try {
      return new URL(CHATBOT_URL).origin;
    } catch {
      return "";
    }
  }, []);

  const initializeChatbot = useCallback(() => {
    if (!chatbotOrigin || !accessToken) return;
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: "seatbook-host",
        type: "chatbot:init",
        accessToken,
      },
      chatbotOrigin,
    );
  }, [accessToken, chatbotOrigin]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<ChatbotStateMessage>) {
      if (!chatbotOrigin || event.origin !== chatbotOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (
        event.data?.source === "efacility-chatbot" &&
        event.data.type === "chatbot:state"
      ) {
        if (!event.data.isOpen) setIsOpen(false);
        else initializeChatbot();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [chatbotOrigin, initializeChatbot]);

  async function openChatbot() {
    if (isStarting) return;
    setError(null);
    setIsStarting(true);
    try {
      const token = await authService.getChatbotToken();
      setAccessToken(token.access_token);
      setIsOpen(true);
    } catch {
      setError("Unable to start the assistant. Please refresh and try again.");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <>
      {!isOpen ? (
        <>
          {error ? (
            <div role="alert" className="fixed right-6 bottom-24 z-[100] max-w-72 rounded-lg border bg-background px-4 py-3 text-sm text-destructive shadow-lg">
              {error}
            </div>
          ) : null}
          <button
            type="button"
            onClick={openChatbot}
            disabled={isStarting}
            aria-label="Open SeatBook assistant"
            title="Open SeatBook assistant"
            className="fixed right-6 bottom-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105 disabled:cursor-wait disabled:opacity-70"
          >
            {isStarting ? (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            ) : (
              <MessageCircle className="h-7 w-7" />
            )}
          </button>
        </>
      ) : null}

      {isOpen && accessToken ? (
        <iframe
          ref={iframeRef}
          src={`${CHATBOT_URL}?embedded=1`}
          title="SeatBook assistant"
          onLoad={initializeChatbot}
          sandbox="allow-forms allow-same-origin allow-scripts"
          className="fixed right-0 bottom-0 z-[100] h-dvh w-full border-0 bg-transparent sm:right-6 sm:bottom-6 sm:h-[min(680px,calc(100dvh-48px))] sm:w-[min(420px,calc(100vw-48px))] sm:rounded-[20px] sm:shadow-2xl"
        />
      ) : null}
    </>
  );
}
