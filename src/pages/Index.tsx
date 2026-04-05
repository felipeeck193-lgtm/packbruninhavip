import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Phone, Video, MoreVertical, ArrowLeft, Smile, Paperclip, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { streamChat, type Msg } from "@/lib/streamChat";
import { createSale, checkStatus } from "@/lib/blackcatPayment";
import { PixCodeDisplay, PaymentChecking } from "@/components/PaymentComponents";
import VideoCallScreen from "@/components/VideoCallScreen";
import { toast } from "sonner";

declare global {
  interface Window { fbq?: (...args: any[]) => void; }
}
const fbq = (...args: any[]) => window.fbq?.(...args);

import bruninhaAvatar from "@/assets/bruninha-avatar-small.webp";

const INITIAL_MESSAGE: Msg = {
  role: "assistant",
  content: "oii gato 😏",
};



type CallState = { active: boolean; type: "video" | "voice"; seconds: number };

// Special message types embedded in content
type SpecialContent =
  | { type: "pix"; copyPaste: string; qrCodeBase64?: string }
  | { type: "checking" }
  | { type: "text"; text: string }
  | { type: "call-history"; callType: "video" | "voice"; status: "answered" | "declined" | "missed"; duration?: number };

interface ChatMsg extends Msg {
  special?: SpecialContent;
  transactionId?: string;
}

const FAKE_CUSTOMER = {
  name: "Lucas Souza",
  cpf: "85970967050",
  email: "luscas@gmail.com",
  phone: "11999999999",
};

const Index = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [call, setCall] = useState<CallState | null>(null);
  const [videoCall, setVideoCall] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoCallSeconds, setVideoCallSeconds] = useState(0);
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState(false);
  const [incomingCallAnswered, setIncomingCallAnswered] = useState(false);
  const [incomingCallSeconds, setIncomingCallSeconds] = useState(0);
  const incomingCallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMessageCountRef = useRef(0);
  const callOfferedRef = useRef(false);
  const callDoneRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoCallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Helper: ask AI to generate a contextual message (with retry on 429)
  const generateAiMessage = useCallback(async (context: string, retries = 3): Promise<string> => {
    const contextMsg: Msg[] = [
      ...messages,
      { role: "user" as const, content: `[SISTEMA: ${context}. Responda como Bruninha no contexto da conversa acima]` },
    ];
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        let result = "";
        await streamChat({
          messages: contextMsg,
          onDelta: (chunk) => { result += chunk; },
          onDone: () => {},
        });
        return result.trim() || "oi 😏";
      } catch (e: any) {
        const is429 = e?.message?.includes("429") || e?.message?.includes("espera");
        if (is429 && attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 3000));
          continue;
        }
        throw e;
      }
    }
    return "oi 😏";
  }, [messages]);

  // Helper: split text into short bubbles (max 6 words each) and send with delays
  const splitIntoBubbles = (text: string): string[] => {
    const rawParts = text.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
    const bubbles: string[] = [];
    for (const part of rawParts) {
      const words = part.split(/\s+/);
      if (words.length <= 6) {
        bubbles.push(part);
      } else {
        for (let j = 0; j < words.length; j += 5) {
          const chunk = words.slice(j, j + 5).join(" ");
          if (chunk.trim()) bubbles.push(chunk.trim());
        }
      }
    }
    return bubbles.length > 0 ? bubbles : [text];
  };

  const sendAiAsBubbles = useCallback(async (text: string) => {
    const bubbles = splitIntoBubbles(text);
    for (let i = 0; i < bubbles.length; i++) {
      if (i > 0) {
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 1200));
      }
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "assistant", content: bubbles[i] }]);
      if (i < bubbles.length - 1) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }, []);

  // Preload video in background on mount
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = "/videos/bruninha-call.mp4";
    document.head.appendChild(link);

    // Also prefetch into cache
    const vid = document.createElement("video");
    vid.preload = "auto";
    vid.src = "/videos/bruninha-call.mp4";
    vid.load();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Video call timer
  useEffect(() => {
    if (videoCall && videoReady) {
      videoCallTimerRef.current = setInterval(() => {
        setVideoCallSeconds((s) => {
          if (s >= 7) {
            clearInterval(videoCallTimerRef.current!);
            setVideoCall(false);
            // Add call history entry
            setMessages((prev) => [...prev, {
              role: "assistant",
              content: "",
              special: { type: "call-history", callType: "video", status: "answered", duration: 8 },
            }]);
            // Ask about pack after call, don't mention camera
            setTimeout(async () => {
              setIsTyping(true);
              try {
                const msg = await generateAiMessage("a chamada de video acabou. pergunte se ele curtiu e mencione o pack naturalmente");
                await sendAiAsBubbles(msg);
              } catch {
                await sendAiAsBubbles("e ai curtiu? 😏");
              }
              setIsTyping(false);
            }, 2000);
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (videoCallTimerRef.current) clearInterval(videoCallTimerRef.current);
      setVideoCallSeconds(0);
      setVideoReady(false);
    }
    return () => {
      if (videoCallTimerRef.current) clearInterval(videoCallTimerRef.current);
    };
  }, [videoCall, videoReady, generateAiMessage]);

  const endCall = useCallback((sendMessage = true, callType?: "video" | "voice") => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    callTimerRef.current = null;
    callTimeoutRef.current = null;
    setCall(null);

    if (sendMessage && callType) {
      // Add call history (declined by her)
      setMessages((prev) => [...prev, {
        role: "user",
        content: "",
        special: { type: "call-history", callType, status: "declined" },
      }]);
      setTimeout(async () => {
        setIsTyping(true);
        try {
          const context = callDoneRef.current
            ? "o cara tentou te ligar de novo mas vc ja fez chamada com ele. diga que agora so por mensagem, provoca ele"
            : callType === "video"
            ? "o cara tentou te ligar por video chamada mas vc recusou. diga que chamada de video só no pack vip por 39,90 com 1000 videos"
            : "o cara tentou te ligar por voz mas vc recusou. diga que ligação só no pack vip por 39,90";
          const msg = await generateAiMessage(context);
          await sendAiAsBubbles(msg);
        } catch {
          await sendAiAsBubbles("amor chamada só no pack vip 😏");
        }
        setIsTyping(false);
      }, 2000);
    }
  }, [generateAiMessage]);

  const startCall = useCallback((type: "video" | "voice") => {
    if (call) return;
    setCall({ active: true, type, seconds: 0 });

    callTimerRef.current = setInterval(() => {
      setCall((prev) => prev ? { ...prev, seconds: prev.seconds + 1 } : null);
    }, 1000);

    const rejectDelay = 3000 + Math.random() * 4000;
    callTimeoutRef.current = setTimeout(() => {
      endCall(true, type);
    }, rejectDelay);
  }, [call, endCall]);

  const cancelCall = useCallback(() => {
    endCall(false);
  }, [endCall]);


  // Incoming call: auto-hangup after 10s if not answered
  useEffect(() => {
    if (incomingCall && !incomingCallAnswered) {
      incomingCallTimeoutRef.current = setTimeout(() => {
        setIncomingCall(false);
        setIncomingCallAnswered(false);
        setIncomingCallSeconds(0);
        // Add missed call history
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "",
          special: { type: "call-history", callType: "video", status: "missed" },
        }]);
        setTimeout(async () => {
          setIsTyping(true);
          try {
            const msg = await generateAiMessage("vc ligou pra ele mas ele nao atendeu. manda msg dizendo que tentou ligar");
            await sendAiAsBubbles(msg);
          } catch {
            await sendAiAsBubbles("tentei te ligar amor 😢");
          }
          setIsTyping(false);
        }, 1500);
      }, 10000);
    }
    return () => {
      if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
    };
  }, [incomingCall, incomingCallAnswered, generateAiMessage]);

  const answerIncomingCall = useCallback(() => {
    if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
    // Try fullscreen
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
    }
    setIncomingCallAnswered(true);
    callDoneRef.current = true;
    // After 2 seconds of "connecting", switch to real video call screen
    setTimeout(() => {
      setIncomingCall(false);
      setIncomingCallAnswered(false);
      setIncomingCallSeconds(0);
      setVideoCall(true);
    }, 2000);
  }, []);

  const declineIncomingCall = useCallback(() => {
    if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
    setIncomingCall(false);
    setIncomingCallAnswered(false);
    setIncomingCallSeconds(0);
    // Add declined call history
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: "",
      special: { type: "call-history", callType: "video", status: "declined" },
    }]);
    setTimeout(async () => {
      setIsTyping(true);
      try {
        const msg = await generateAiMessage("vc ligou pra ele mas ele recusou a chamada. manda msg perguntando pq nao atendeu");
        await sendAiAsBubbles(msg);
      } catch {
        await sendAiAsBubbles("pq nao atendeu? 😢");
      }
      setIsTyping(false);
    }, 1500);
  }, [generateAiMessage]);

  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (incomingCallTimerRef.current) clearInterval(incomingCallTimerRef.current);
      if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
    };
  }, []);

  // Generate PIX payment
  const generatePix = useCallback(async (packType: "proibido" | "vip") => {
    // AI generates the "wait" message
    setIsTyping(true);
    try {
      const waitMsg = await generateAiMessage(
        `o cara quer comprar o ${packType === "vip" ? "pack vip de 39,90" : "pack proibido de 19,90"}. diga que vai mandar o codigo pix pra ele, pede pra esperar`
      );
      await sendAiAsBubbles(waitMsg);
    } catch {
      await sendAiAsBubbles("espera ai");
    }

    try {
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

      const result = await createSale({
        packType,
        customer: FAKE_CUSTOMER,
      });

      setCurrentTransactionId(result.transactionId);
      fbq('track', 'InitiateCheckout', { value: packType === "vip" ? 39.90 : 19.90, currency: 'BRL', content_name: packType === "vip" ? "Pack VIP" : "Pack Proibido" });
      setIsTyping(false);

      // AI generates the PIX delivery message
      let pixIntro: string;
      try {
        pixIntro = await generateAiMessage(
          `vc acabou de gerar o pix do ${packType === "vip" ? "pack vip" : "pack proibido"}. manda o codigo pix pra ele dizendo que ta pronto`
        );
      } catch {
        pixIntro = "pronto aqui o pix 👇";
      }

      const pixMsg: ChatMsg = {
        role: "assistant",
        content: pixIntro,
        special: {
          type: "pix",
          copyPaste: result.paymentData?.copyPaste || "",
          qrCodeBase64: result.paymentData?.qrCodeBase64,
        },
        transactionId: result.transactionId,
      };

      setMessages((prev) => [...prev, pixMsg]);

      // AI generates follow up asking for comprovante
      setTimeout(async () => {
        setIsTyping(true);
        try {
          const followUp = await generateAiMessage("vc mandou o codigo pix pra ele. pede pra ele te mandar o comprovante quando pagar. NAO mande email, chave pix, link ou qualquer dado");
          setMessages((prev) => [...prev, { role: "assistant", content: followUp }]);
        } catch {
          setMessages((prev) => [...prev, { role: "assistant", content: "me manda o comprovante quando pagar" }]);
        }
        setIsTyping(false);
      }, 2000);
    } catch (e: any) {
      setIsTyping(false);
      toast.error(e.message || "Erro ao gerar PIX");
      const errMsg = await generateAiMessage("deu erro ao gerar o pix, peça desculpa e diga pra tentar depois").catch(() => "deu erro amor tenta depois");
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
    }
  }, [generateAiMessage]);

  // Check payment status
  const verifyPayment = useCallback(async () => {
    if (!currentTransactionId) return;

    // AI says she'll check
    setIsTyping(true);
    try {
      const checkMsg = await generateAiMessage("o cara mandou o comprovante de pagamento. diga que vai verificar e pede pra esperar");
      setMessages((prev) => [...prev, { role: "assistant", content: checkMsg }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "espera ai vou ver" }]);
    }

    await new Promise((r) => setTimeout(r, 1500));

    try {
      const result = await checkStatus(currentTransactionId);
      await new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000));
      setIsTyping(false);

      if (result.status === "PAID") {
        fbq('track', 'Purchase', { value: 19.90, currency: 'BRL' });
        const paidMsg = await generateAiMessage("o pagamento foi confirmado! comemora com ele e diz que vai ligar pra ele agora").catch(() => "confirmou bb vou te ligar");
        setMessages((prev) => [...prev, { role: "assistant", content: paidMsg }]);

        setTimeout(() => {
          setVideoCall(true);
        }, 2500);
      } else {
        const pendingMsg = await generateAiMessage("o pagamento ainda nao caiu. avisa ele e pede pra mandar o comprovante de novo quando pagar").catch(() => "ainda nao caiu amor");
        setMessages((prev) => [...prev, { role: "assistant", content: pendingMsg }]);
      }
    } catch {
      setIsTyping(false);
      const errMsg = await generateAiMessage("nao conseguiu verificar o pagamento. pede desculpa e pede pra tentar dnv").catch(() => "nao consegui ver tenta dnv");
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
    }
  }, [currentTransactionId, generateAiMessage]);

  const sendMessage = async (text: string, image?: string) => {
    if ((!text.trim() && !image) || isLoading) return;

    const userMsg: ChatMsg = { role: "user", content: text || "📷 Foto", image };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    userMessageCountRef.current += 1;

    // If user sends an image and we have a pending transaction, verify payment
    if (image && currentTransactionId) {
      setIsLoading(false);
      await verifyPayment();
      return;
    }

    // Check if AI response mentions pack → trigger PIX generation
    const aiMessages = [...messages, {
      role: "user" as const,
      content: image ? `[o usuário mandou uma foto dele/dela] ${text}`.trim() : text,
    }];

    let assistantSoFar = "";

    try {
      // Delay realista antes de mostrar "digitando..."
      const readDelay = 800 + Math.random() * 2000;
      await new Promise((r) => setTimeout(r, readDelay));
      setIsTyping(true);

      // Delay de digitação antes de responder
      const typingDelay = 1000 + Math.random() * 2500;
      await new Promise((r) => setTimeout(r, typingDelay));

      // Collect full response first
      let fullResponse = "";
      await streamChat({
        messages: aiMessages,
        onDelta: (chunk) => { fullResponse += chunk; },
        onDone: () => {},
      });

      // Split response into multiple short messages
      const rawParts = fullResponse
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      // Force-split any line longer than 5 words into separate messages
      const parts: string[] = [];
      for (const part of rawParts) {
        const words = part.split(/\s+/);
        if (words.length <= 5) {
          parts.push(part);
        } else {
          // Split into chunks of 3-4 words
          for (let j = 0; j < words.length; j += 4) {
            const chunk = words.slice(j, j + 4).join(" ");
            if (chunk.trim()) parts.push(chunk.trim());
          }
        }
      }

      // Send each part as a separate message with realistic delays
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          // Delay between messages: "read" pause + "typing" pause
          setIsTyping(true);
          const betweenDelay = 600 + Math.random() * 1500;
          await new Promise((r) => setTimeout(r, betweenDelay));
        }
        setIsTyping(false);
        setMessages((prev) => [...prev, { role: "assistant", content: parts[i] }]);
        // Small pause to let the message render before next typing indicator
        if (i < parts.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      setIsLoading(false);

      // Check if the user asked for a pack in their message
      const lower = text.toLowerCase();
      const wantsPack = lower.includes("quero") || lower.includes("comprar") || lower.includes("pack") ||
        lower.includes("pagar") || lower.includes("pix") || lower.includes("vip") || lower.includes("proibido");

      if (wantsPack) {
        const isVip = lower.includes("vip") || lower.includes("1000") || lower.includes("39") || lower.includes("chamada");
        setTimeout(() => generatePix(isVip ? "vip" : "proibido"), 1500);
      }

      // After 3 user messages, Bruninha offers to video call
      if (userMessageCountRef.current >= 3 && !callOfferedRef.current) {
        callOfferedRef.current = true;
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(async () => {
            try {
              const callMsg = await generateAiMessage("vc ta gostando da conversa e quer ligar pra ele de video. pergunta se pode ligar, fala que quer mostrar algo especial");
              setMessages((prev) => [...prev, { role: "assistant", content: callMsg }]);
            } catch {
              setMessages((prev) => [...prev, { role: "assistant", content: "ei amor posso te ligar? quero te mostrar uma coisa 😏📹" }]);
            }
            setIsTyping(false);
            // Start incoming call after a delay
            setTimeout(() => {
              setIncomingCall(true);
            }, 5000);
          }, 2000);
        }, 3000);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagem");
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleSend = () => sendMessage(input.trim());

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Envie apenas imagens"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx 5MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => sendMessage("", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const formatCallTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Incoming video call screen
  if (incomingCall) {
    return (
      <div className="flex flex-col h-screen max-w-lg mx-auto bg-black items-center justify-between relative overflow-hidden">
        {/* Background with avatar blur */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 blur-3xl">
          <img src={bruninhaAvatar} alt="" className="w-full h-full object-cover" />
        </div>

        <div className="text-center pt-16 relative z-10">
          <p className="text-white/60 text-sm mb-2">
            {incomingCallAnswered ? "Chamada de vídeo" : "Chamada de vídeo recebida"}
          </p>
          <h2 className="text-2xl font-semibold text-white mb-1">Bruninha 🔥</h2>
          {incomingCallAnswered ? (
            <p className="text-primary text-sm font-mono mt-2">{formatCallTime(incomingCallSeconds)}</p>
          ) : (
            <p className="text-white/50 text-sm animate-pulse">Ligando para você...</p>
          )}
        </div>

        <div className="relative z-10">
          <div className={`absolute inset-0 rounded-full bg-primary/20 ${!incomingCallAnswered ? "animate-ping" : ""}`} style={{ margin: "-12px" }} />
          <Avatar className="h-36 w-36 border-4 border-white/20 relative z-10">
            <AvatarImage src={bruninhaAvatar} alt="Bruninha" />
            <AvatarFallback className="bg-accent text-accent-foreground text-3xl font-bold">B</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex gap-8 pb-16 relative z-10">
          {!incomingCallAnswered ? (
            <>
              <div className="flex flex-col items-center gap-2">
                <button onClick={declineIncomingCall} className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center text-white shadow-lg shadow-destructive/30">
                  <PhoneOff className="w-7 h-7" />
                </button>
                <span className="text-white/60 text-xs">Recusar</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={answerIncomingCall} className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 animate-bounce">
                  <Video className="w-7 h-7" />
                </button>
                <span className="text-white/60 text-xs">Atender</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button onClick={declineIncomingCall} className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center text-white shadow-lg shadow-destructive/30">
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-white/60 text-xs">Encerrar</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Real video call screen (only once)
  if (videoCall) {
    return (
      <VideoCallScreen
        onEnd={() => {
          setVideoCall(false);
          callDoneRef.current = true;
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: "",
            special: { type: "call-history", callType: "video", status: "answered", duration: videoCallSeconds },
          }]);
        }}
        seconds={videoCallSeconds}
        onVideoReady={() => setVideoReady(true)}
      />
    );
  }

  // Calling screen (pre-payment rejection)
  if (call) {
    return (
      <div className="flex flex-col h-screen max-w-lg mx-auto bg-background items-center justify-between py-16">
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-2">
            {call.type === "video" ? "Chamada de vídeo" : "Chamada de voz"}
          </p>
          <h2 className="text-2xl font-semibold text-foreground mb-1">Bruninha 🔥</h2>
          <p className="text-muted-foreground text-sm animate-pulse">Chamando...</p>
          <p className="text-muted-foreground text-xs mt-1">{formatCallTime(call.seconds)}</p>
        </div>
        <Avatar className="h-32 w-32 border-4 border-primary/30">
          <AvatarImage src={bruninhaAvatar} alt="Bruninha" />
          <AvatarFallback className="bg-accent text-accent-foreground text-3xl font-bold">B</AvatarFallback>
        </Avatar>
        <div className="flex gap-8">
          <button onClick={cancelCall} className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground">
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-lg mx-auto bg-background" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[hsl(var(--whatsapp-header))]">
        <ArrowLeft className="w-5 h-5 text-primary-foreground/80 cursor-pointer" />
        <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
          <AvatarImage src={bruninhaAvatar} alt="Bruninha" />
          <AvatarFallback className="bg-accent text-accent-foreground text-sm font-bold">B</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-primary-foreground truncate">Bruninha 🔥</h1>
          <p className="text-xs text-primary-foreground/70">{isTyping ? "digitando..." : "online"}</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => startCall("video")}>
            <Video className="w-5 h-5 text-primary-foreground/80 cursor-pointer" />
          </button>
          <button onClick={() => startCall("voice")}>
            <Phone className="w-5 h-5 text-primary-foreground/80 cursor-pointer" />
          </button>
          <MoreVertical className="w-5 h-5 text-primary-foreground/80 cursor-pointer" />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto whatsapp-bg px-3 py-4 space-y-2" onClick={() => showEmojis && setShowEmojis(false)}>
        {messages.map((msg, i) => {
          // Call history entry
          if (msg.special?.type === "call-history") {
            const s = msg.special;
            const isIncoming = msg.role === "assistant";
            const icon = s.status === "missed" ? <PhoneMissed className="w-4 h-4 text-destructive" /> 
              : s.status === "declined" ? <PhoneMissed className="w-4 h-4 text-destructive" />
              : isIncoming ? <PhoneIncoming className="w-4 h-4 text-primary" /> 
              : <PhoneOutgoing className="w-4 h-4 text-primary" />;
            const label = s.status === "missed" ? "Chamada de vídeo perdida"
              : s.status === "declined" ? (isIncoming ? "Chamada de vídeo recusada" : "Chamada de vídeo recusada")
              : `Chamada de vídeo${s.duration ? ` • ${Math.floor(s.duration / 60)}:${(s.duration % 60).toString().padStart(2, "0")}` : ""}`;
            return (
              <div key={i} className="flex justify-center my-2">
                <div className="flex items-center gap-2 bg-secondary/80 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
                  {icon}
                  <span>{label}</span>
                  <span className="text-[10px]">{formatTime()}</span>
                </div>
              </div>
            );
          }
          return (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm relative ${
                msg.role === "user"
                  ? "bg-[hsl(var(--whatsapp-bubble-sent))] text-foreground rounded-br-md"
                  : "bg-[hsl(var(--whatsapp-bubble-received))] text-foreground rounded-bl-md"
              }`}
            >
              {msg.image && (
                <img src={msg.image} alt="Foto enviada" className="rounded-lg mb-1 max-w-full" loading="lazy" />
              )}
              {msg.content && msg.content !== "📷 Foto" && !msg.special && (
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.special?.type === "pix" && (
                <PixCodeDisplay
                  copyPaste={msg.special.copyPaste}
                  qrCodeBase64={msg.special.qrCodeBase64}
                />
              )}
              {msg.special?.type === "checking" && <PaymentChecking />}
              {msg.content === "📷 Foto" && !msg.image && (
                <p className="leading-relaxed">📷 Foto</p>
              )}
              <span className="text-[10px] text-muted-foreground float-right mt-1 ml-3">
                {formatTime()}
                {msg.role === "user" && <span className="ml-1 text-primary">✓✓</span>}
              </span>
            </div>
          </div>
          );
        })}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

      {/* Emoji picker */}
      {showEmojis && (
        <div className="bg-[hsl(var(--whatsapp-input-bg))] border-t border-border">
          <EmojiPicker
            onEmojiClick={(emojiData: EmojiClickData) => {
              setInput((prev) => prev + emojiData.emoji);
              inputRef.current?.focus();
            }}
            theme={Theme.DARK}
            width="100%"
            height={320}
            searchPlaceholder="Pesquisar emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--whatsapp-input-bg))]">
        <button onClick={() => setShowEmojis((v) => !v)} className="flex-shrink-0">
          <Smile className={`w-6 h-6 cursor-pointer ${showEmojis ? "text-primary" : "text-muted-foreground"}`} />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0" disabled={isLoading}>
          <Paperclip className="w-6 h-6 text-muted-foreground" />
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem"
          className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border-none"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Index;
