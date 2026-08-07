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
  const tokenExpiresAtRef = useRef(0);
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

  const postChatbotInit = useCallback((token: string) => {
    if (!chatbotOrigin || !token) return;
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: "seatbook-host",
        type: "chatbot:init",
        accessToken: token,
      },
      chatbotOrigin,
    );
  }, [chatbotOrigin]);

  const initializeChatbot = useCallback(() => {
    if (!accessToken) return;
    postChatbotInit(accessToken);
  }, [accessToken, postChatbotInit]);

  const ensureAccessToken = useCallback(async () => {
    if (accessToken && tokenExpiresAtRef.current > Date.now() + 30_000) {
      return accessToken;
    }
    const token = await authService.getChatbotToken();
    tokenExpiresAtRef.current = Date.now() + token.expires_in * 1000;
    setAccessToken(token.access_token);
    return token.access_token;
  }, [accessToken]);

  // Load the iframe and token in the background after the authenticated layout
  // mounts so opening the assistant does not pay a cold-start penalty.
  useEffect(() => {
    void ensureAccessToken().catch(() => undefined);
  }, [ensureAccessToken]);

  useEffect(() => {
    initializeChatbot();
  }, [initializeChatbot]);

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
      const token = await ensureAccessToken();
      setIsOpen(true);
      // The iframe remains mounted while minimized. Always resend the init
      // message so an already initialized chatbot switches itself back open.
      postChatbotInit(token);
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

      <iframe
        ref={iframeRef}
        src={`${CHATBOT_URL}?embedded=1`}
        title="SeatBook assistant"
        onLoad={initializeChatbot}
        aria-hidden={!isOpen}
        sandbox="allow-forms allow-same-origin allow-scripts"
        className={`fixed right-0 bottom-0 z-[100] h-dvh w-full border-0 bg-transparent transition-opacity sm:right-6 sm:bottom-6 sm:h-[min(680px,calc(100dvh-48px))] sm:w-[min(420px,calc(100vw-48px))] sm:rounded-[20px] sm:shadow-2xl ${
          isOpen
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
      />
    </>
  );
}
