import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Send, Plus, Shield, Clock, CheckCircle, Circle, MessageSquare, Headphones, X, AlertCircle, ChevronRight } from "lucide-react";
import type { SupportTicket, SupportMessage } from "@shared/schema";

const CATEGORIES = [
  { value: "general", label: "General Enquiry" },
  { value: "payment", label: "Payment Issue" },
  { value: "trip", label: "Trip Problem" },
  { value: "safety", label: "Safety Concern" },
  { value: "account", label: "Account Help" },
  { value: "driver", label: "Driver Complaint" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

interface Props {
  userId: string;
  userRole: "rider" | "driver" | "admin";
  userName: string;
  onBack: () => void;
}

export default function SupportChat({ userId, userRole, userName, onBack }: Props) {
  const isAdmin = userRole === "admin";
  const [subView, setSubView] = useState<"list" | "chat" | "new">("list");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticketUsers, setTicketUsers] = useState<Record<string, string>>({});

  // New ticket form
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [creating, setCreating] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTickets = async () => {
    try {
      const url = isAdmin
        ? "/api/admin/support/tickets"
        : `/api/support/tickets/my/${userId}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data: SupportTicket[] = await res.json();
        setTickets(data);
        if (isAdmin && data.length) {
          // Pre-fetch display names for ticket owners
          const unknownIds = data.map(t => t.userId).filter(id => !ticketUsers[id]);
          const uniqueIds = [...new Set(unknownIds)];
          for (const id of uniqueIds) {
            try {
              const r = await fetch(`/api/users/${id}`, { credentials: "include" });
              if (r.ok) {
                const u = await r.json();
                setTicketUsers(prev => ({ ...prev, [id]: u.fullName || u.username }));
              }
            } catch {}
          }
        }
      }
    } catch {}
    setLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, { credentials: "include" });
      if (res.ok) setMessages(await res.json());
    } catch {}
  };

  const markRead = async (ticketId: string) => {
    const url = isAdmin
      ? `/api/admin/support/tickets/${ticketId}/read`
      : `/api/support/tickets/${ticketId}/read`;
    try { await fetch(url, { method: "POST", credentials: "include" }); } catch {}
  };

  useEffect(() => { fetchTickets(); }, []);

  useEffect(() => {
    if (subView === "chat" && selectedTicket) {
      fetchMessages(selectedTicket.id);
      markRead(selectedTicket.id);
      pollRef.current = setInterval(() => {
        fetchMessages(selectedTicket.id);
      }, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [subView, selectedTicket]);

  useEffect(() => {
    if (subView === "list") {
      const interval = setInterval(fetchTickets, 5000);
      return () => clearInterval(interval);
    }
  }, [subView]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setMessages([]);
    setSubView("chat");
  };

  const sendMessage = async () => {
    if (!msgInput.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senderId: userId, senderRole: userRole, content: msgInput.trim() }),
      });
      if (res.ok) {
        setMsgInput("");
        await fetchMessages(selectedTicket.id);
        // Refresh ticket to get updated status
        await fetchTickets();
      }
    } catch {}
    setSending(false);
  };

  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          userRole,
          subject: newSubject.trim(),
          category: newCategory,
          priority: newPriority,
          message: newMessage.trim(),
        }),
      });
      if (res.ok) {
        const ticket = await res.json();
        setNewSubject("");
        setNewCategory("general");
        setNewMessage("");
        setNewPriority("normal");
        await fetchTickets();
        openTicket(ticket);
      }
    } catch {}
    setCreating(false);
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        await fetchTickets();
      }
    } catch {}
  };

  const unreadCount = isAdmin
    ? tickets.filter(t => t.status !== "closed" && t.status !== "resolved").length
    : tickets.filter(t => t.status === "in_progress").length;

  // ── New Ticket Form ──
  if (subView === "new") {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <div className="bg-black text-white px-4 pt-8 pb-5 rounded-b-3xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSubView("list")} className="text-white rounded-full hover:bg-white/20">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">New Support Request</h1>
              <p className="text-xs text-gray-400">Our team typically replies within 2 hours</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4 pb-10">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setNewCategory(c.value)}
                    className={`text-sm py-2.5 px-3 rounded-xl border font-medium transition-all text-left ${newCategory === c.value ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"}`}
                    data-testid={`category-${c.value}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">Priority</label>
              <div className="flex gap-2">
                {["normal", "urgent"].map(p => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${newPriority === p ? (p === "urgent" ? "bg-red-500 text-white border-red-500" : "bg-black text-white border-black") : "bg-white text-gray-700 border-gray-200"}`}
                    data-testid={`priority-${p}`}
                  >
                    {p === "urgent" ? "🚨 Urgent" : "Normal"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">Subject</label>
              <input
                type="text"
                placeholder="Brief description of your issue"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm"
                data-testid="input-support-subject"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">Message</label>
              <textarea
                placeholder="Please describe your concern in detail..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none"
                data-testid="input-support-message"
              />
            </div>
          </div>

          <Button
            className="w-full h-12 rounded-2xl bg-black text-white font-bold text-base"
            onClick={createTicket}
            disabled={creating || !newSubject.trim() || !newMessage.trim()}
            data-testid="btn-submit-support"
          >
            {creating ? "Submitting…" : "Submit Support Request"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Chat View ──
  if (subView === "chat" && selectedTicket) {
    const catLabel = CATEGORIES.find(c => c.value === selectedTicket.category)?.label ?? selectedTicket.category;
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-black text-white px-4 pt-8 pb-4 rounded-b-3xl">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => { setSubView("list"); fetchTickets(); }} className="text-white rounded-full hover:bg-white/20">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold truncate">{selectedTicket.subject}</h1>
              {isAdmin && ticketUsers[selectedTicket.userId] && (
                <p className="text-xs text-gray-400">From: {ticketUsers[selectedTicket.userId]} · {selectedTicket.userRole}</p>
              )}
              {!isAdmin && <p className="text-xs text-gray-400">GY Rides Support · {catLabel}</p>}
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[selectedTicket.status]}`}>
              {STATUS_LABELS[selectedTicket.status]}
            </span>
          </div>

          {/* Admin status controls */}
          {isAdmin && selectedTicket.status !== "closed" && (
            <div className="flex gap-2 pb-1">
              {selectedTicket.status !== "in_progress" && selectedTicket.status !== "resolved" && (
                <Button size="sm" variant="outline" className="text-xs h-7 bg-blue-500 text-white border-blue-500 hover:bg-blue-600" onClick={() => updateTicketStatus(selectedTicket.id, "in_progress")} data-testid="btn-mark-in-progress">
                  Mark In Progress
                </Button>
              )}
              {selectedTicket.status !== "resolved" && (
                <Button size="sm" variant="outline" className="text-xs h-7 bg-green-500 text-white border-green-500 hover:bg-green-600" onClick={() => updateTicketStatus(selectedTicket.id, "resolved")} data-testid="btn-mark-resolved">
                  Mark Resolved
                </Button>
              )}
              {selectedTicket.status !== "closed" && (
                <Button size="sm" variant="outline" className="text-xs h-7 bg-gray-600 text-white border-gray-600 hover:bg-gray-700" onClick={() => updateTicketStatus(selectedTicket.id, "closed")} data-testid="btn-close-ticket">
                  Close
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-3 pb-6" data-testid="support-messages">
          {messages.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No messages yet</p>
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.senderId === userId;
            const isAdminMsg = msg.senderRole === "admin";
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                {!isMine && (
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 ${isAdminMsg ? "bg-black" : "bg-yellow-400"}`}>
                    {isAdminMsg ? <Shield className="h-3.5 w-3.5 text-yellow-400" /> : <span className="text-[10px] font-bold text-black">{msg.senderRole[0].toUpperCase()}</span>}
                  </div>
                )}
                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine ? "bg-black text-white rounded-br-md" : isAdminMsg ? "bg-yellow-400 text-black rounded-bl-md" : "bg-white text-gray-800 border border-gray-100 rounded-bl-md"}`}>
                  {!isMine && <div className={`text-[10px] font-bold mb-1 ${isAdminMsg ? "text-black/60" : "text-gray-500"}`}>{isAdminMsg ? "GY Rides Support" : msg.senderRole === "rider" ? "Rider" : "Driver"}</div>}
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-white/60 text-right" : isAdminMsg ? "text-black/50" : "text-gray-400"}`}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {selectedTicket.status !== "closed" ? (
          <div className="p-4 bg-white border-t border-gray-100 flex gap-3 items-end">
            <textarea
              className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm resize-none max-h-28 min-h-[44px]"
              placeholder="Type your message…"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              rows={1}
              data-testid="input-chat-message"
            />
            <Button
              className="h-11 w-11 rounded-2xl bg-black text-white shrink-0 flex items-center justify-center p-0"
              onClick={sendMessage}
              disabled={sending || !msgInput.trim()}
              data-testid="btn-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-400">
            This ticket is closed. <button className="text-black font-bold underline" onClick={() => setSubView("new")}>Open a new one</button>
          </div>
        )}
      </div>
    );
  }

  // ── Ticket List ──
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white px-4 pt-8 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white rounded-full hover:bg-white/20">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{isAdmin ? "Support Inbox" : "Support & Help"}</h1>
            <p className="text-xs text-gray-400">
              {isAdmin ? `${tickets.filter(t => t.status === "open").length} open · ${tickets.filter(t => t.status === "in_progress").length} in progress` : "We're here to help you"}
            </p>
          </div>
          {!isAdmin && (
            <Button
              className="bg-yellow-400 text-black rounded-2xl font-bold px-4 h-9 text-sm flex items-center gap-1.5"
              onClick={() => setSubView("new")}
              data-testid="btn-new-ticket"
            >
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
        </div>
      </div>

      {/* Info banner for non-admin */}
      {!isAdmin && (
        <div className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-3.5 flex gap-3 items-start">
          <Headphones className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-yellow-800">GY Rides Customer Support</div>
            <div className="text-xs text-yellow-700 mt-0.5">Our admin team attends to all queries. Typical response time: <strong>under 2 hours</strong>.</div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-3 pb-10">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-gray-600">{isAdmin ? "No support tickets yet" : "No requests yet"}</p>
            <p className="text-sm mt-1">{isAdmin ? "Tickets from riders and drivers will appear here" : "Tap 'New' to submit a concern"}</p>
          </div>
        ) : (
          tickets.map(ticket => {
            const catLabel = CATEGORIES.find(c => c.value === ticket.category)?.label ?? ticket.category;
            const displayName = isAdmin ? (ticketUsers[ticket.userId] || "Loading…") : catLabel;
            const isUrgent = ticket.priority === "urgent";
            return (
              <button
                key={ticket.id}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left flex items-start gap-3 hover:border-gray-300 transition-all active:scale-[0.99]"
                onClick={() => openTicket(ticket)}
                data-testid={`ticket-${ticket.id}`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? "bg-red-100" : "bg-gray-100"}`}>
                  {isUrgent ? <AlertCircle className="h-5 w-5 text-red-500" /> : <MessageSquare className="h-5 w-5 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm truncate flex-1">{ticket.subject}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${STATUS_COLORS[ticket.status]}`}>
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {isAdmin ? `${displayName} · ${ticket.userRole}` : catLabel}
                    {isUrgent && <span className="ml-1.5 text-red-500 font-bold">· URGENT</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 mt-1 shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
