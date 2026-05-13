'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { Send, MessageSquare, Hash, RefreshCw, Loader2 } from 'lucide-react';

export default function ChatPage() {
  useAuth();
  const searchParams = useSearchParams();
  const rawAuditId = searchParams?.get('auditId');

  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [room, setRoom] = useState<any | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myAudits, setMyAudits] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load the list of possible chats if no specific chat is requested
  useEffect(() => {
    if (!rawAuditId) {
      loadMyAudits();
    }
  }, [rawAuditId]);

  const loadMyAudits = async () => {
    try {
      const res = await apiFetch('/api/audits/mine?size=100');
      setMyAudits(res?.content || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // Load or create the chat room for this audit
  const loadRoom = async () => {
    setLoading(true);
    try {
      if (!rawAuditId) {
        toast.error('Aucun audit spécifié pour ce chat');
        setLoading(false);
        return;
      }
      const r = await apiFetch(`/api/chat/room/audit/${rawAuditId}`);
      setRoom(r);
      if (r?.id) {
        await loadMessages(r.id);
      }
    } catch (e: any) {
      toast.error('Impossible de charger le salon : ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const res = await apiFetch(`/api/chat/rooms/${roomId}/messages?size=100&sort=createdAt,asc`);
      let msgs = res?.content ?? (Array.isArray(res) ? res : []);
      // Ensure messages are sorted chronologically (oldest at the top, newest strictly at the bottom)
      msgs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(msgs);
    } catch { /* ignore */ }
  };

  // Auto-refresh: poll for new messages every 5 seconds
  useEffect(() => {
    if (!room?.id) return;
    const interval = setInterval(() => {
      loadMessages(room.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [room?.id]);

  useEffect(() => { loadRoom(); }, [rawAuditId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !room?.id) return;
    setSending(true);

    // Send via REST (WebSocket is optional enhancement)
    // The backend WebSocket endpoint is @MessageMapping("/chat.send/{roomId}")
    // We use REST fallback: POST directly via STOMP if available, or add a REST endpoint
    // Since no REST POST for messages exists, we'll use the WebSocket via a simple approach
    // Optimistically add message and try to send
    const tempMsg = {
      id: `temp-${Date.now()}`,
      senderId: user?.id,
      senderName: user?.fullName,
      content: inputText,
      createdAt: new Date().toISOString(),
      messageType: 'TEXT',
    };
    setMessages(prev => [...prev, tempMsg]);
    const textToSend = inputText;
    setInputText('');

    try {
      // Use STOMP/WebSocket via raw fetch to our WebSocket bridge
      // Alternatively, add a REST endpoint — let's call the backend directly
      const token = JSON.parse(sessionStorage.getItem('audit-auth-storage') || '{}')?.state?.token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId: room.id, content: textToSend, messageType: 'TEXT' }),
      });
      if (res.ok) {
        const saved = await res.json();
        // Replace temp message with real one
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? saved : m));
      } else {
        // Remove temp message on failure
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        toast.error('Envoi échoué');
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      toast.error('Erreur de connexion');
    } finally {
      setSending(false);
    }
  };

  if (!rawAuditId) {
    return (
      <div className="h-[calc(100vh-9rem)] flex flex-col glass rounded-2xl p-6 overflow-hidden">
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-indigo-400" />
          Sélectionnez un dossier pour discuter
        </h2>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : myAudits.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <MessageSquare className="h-16 w-16 mx-auto text-[var(--muted-foreground)]/30" />
            <p className="text-[var(--foreground)] font-semibold">Aucun dossier disponible</p>
            <p className="text-[var(--muted-foreground)] text-sm">Vous n'avez pas de dossiers pour utiliser la messagerie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-6">
            {myAudits.map(audit => (
              <button key={audit.id} onClick={() => window.location.href = `/chat?auditId=${audit.id}`}
                className="flex flex-col text-left gap-3 p-5 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)] hover:border-blue-500/50 hover:bg-[var(--muted)] transition-all group">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Hash className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] truncate">{audit.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1 truncate">
                    Client: {audit.clientName}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">
                    Statut: {audit.status}
                  </p>
                </div>
                <div className="mt-auto pt-4 flex items-center text-blue-500 text-sm font-medium">
                  Ouvrir le chat →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col gap-0 glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)] text-sm">
              {loading ? 'Chargement…' : room?.auditTitle ?? 'Chat de l\'audit'}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {loading ? '…' : `${room?.participantAName ?? ''} ↔ ${room?.participantBName ?? ''}`}
            </p>
          </div>
        </div>
        <button onClick={loadRoom} disabled={loading}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors glass px-3 py-1.5 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[var(--muted)]/5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <MessageSquare className="h-14 w-14 text-[var(--muted-foreground)]/20" />
            <p className="text-[var(--muted-foreground)] text-sm">Aucun message — commencez la conversation</p>
            <p className="text-xs text-[var(--muted-foreground)]/60">
              {room?.participantBName
                ? `${room.participantBName} recevra vos messages`
                : 'Connectez-vous avec votre auditeur'}
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.senderId === user?.id;
            return (
              <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isMe && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-auto">
                    {(m.senderName || '?').charAt(0)}
                  </div>
                )}
                <div className={`max-w-[65%] rounded-2xl px-4 py-2.5 ${isMe
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm'
                  : 'bg-[var(--muted)] text-[var(--foreground)] rounded-bl-sm border border-[var(--border)]'
                }`}>
                  {!isMe && <p className="text-xs text-blue-400 font-medium mb-0.5">{m.senderName}</p>}
                  <p className="text-sm leading-relaxed">{m.content}</p>
                  <span className={`text-[10px] mt-1 block ${isMe ? 'text-white/60' : 'text-[var(--muted-foreground)]'}`}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '…'}
                  </span>
                </div>
                {isMe && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-auto">
                    {(user?.fullName || '?').charAt(0)}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0 bg-[var(--background)]">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text" value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={!room || loading}
            placeholder={room ? 'Écrivez votre message…' : 'Chargement du salon…'}
            className="flex-1 bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-[var(--muted-foreground)] disabled:opacity-50"
          />
          <button type="submit" disabled={!room || !inputText.trim() || sending}
            className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
