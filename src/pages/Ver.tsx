import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MessageCircle, Clock, Users, ChevronRight, RefreshCw } from "lucide-react";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-conversations`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

interface Session {
  sessionId: string;
  messages: number;
  lastMsg: string;
  firstMsg: string;
  lastContent: string;
  roles: { user: number; assistant: number };
}

interface Message {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const timeSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const Ver = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const resp = await fetch(API_URL, { headers: AUTH_HEADER });
      const json = await resp.json();
      setSessions(json.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchMessages = async (sessionId: string) => {
    setLoadingMsgs(true);
    setSelectedSession(sessionId);
    try {
      const resp = await fetch(`${API_URL}?session_id=${sessionId}`, { headers: AUTH_HEADER });
      const json = await resp.json();
      setMessages(json.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoadingMsgs(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (selectedSession) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-background rounded-3xl shadow-2xl border-4 border-border overflow-hidden flex flex-col" style={{ height: "85vh", maxHeight: "750px" }}>
          <div className="flex items-center gap-3 px-3 py-3 bg-[hsl(var(--whatsapp-header))]">
            <button onClick={() => setSelectedSession(null)}>
              <ArrowLeft className="w-5 h-5 text-primary-foreground/80" />
            </button>
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold">B</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary-foreground">Bruninha 🔥</p>
              <p className="text-[10px] text-primary-foreground/60 font-mono truncate">{selectedSession.slice(0, 20)}...</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto whatsapp-bg px-3 py-3 space-y-1.5">
            {loadingMsgs ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-8">Sem mensagens</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[13px] ${
                      msg.role === "user"
                        ? "bg-[hsl(var(--whatsapp-bubble-sent))] text-foreground rounded-br-md"
                        : "bg-[hsl(var(--whatsapp-bubble-received))] text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    <span className="text-[9px] text-muted-foreground float-right mt-0.5 ml-2">
                      {formatTime(msg.created_at)}
                      {msg.role === "user" && <span className="ml-1 text-primary">✓✓</span>}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-3 py-2 bg-[hsl(var(--whatsapp-input-bg))] text-center">
            <p className="text-[10px] text-muted-foreground">
              {messages.length} mensagens • Sessão iniciada {messages[0] ? formatDate(messages[0].created_at) : "—"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-[hsl(var(--whatsapp-header))] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">📊 Conversas</h1>
            <p className="text-xs text-primary-foreground/60">{sessions.length} sessões</p>
          </div>
          <button onClick={fetchSessions} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <RefreshCw className={`w-5 h-5 text-primary-foreground/80 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{sessions.length}</p>
            <p className="text-[10px] text-muted-foreground">Sessões</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <MessageCircle className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{sessions.reduce((a, s) => a + s.messages, 0)}</p>
            <p className="text-[10px] text-muted-foreground">Mensagens</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{sessions.filter(s => s.messages > 3).length}</p>
            <p className="text-[10px] text-muted-foreground">Engajadas (3+)</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhuma conversa encontrada</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => fetchMessages(s.sessionId)}
                className="w-full bg-card hover:bg-secondary border border-border rounded-xl p-3 flex items-center gap-3 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">
                      Sessão {s.sessionId.slice(-8)}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                      {timeSince(s.lastMsg)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{s.lastContent || "..."}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">💬 {s.messages} msgs</span>
                    <span className="text-[10px] text-primary">👤 {s.roles.user} user</span>
                    <span className="text-[10px] text-accent">🤖 {s.roles.assistant} bot</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ver;
