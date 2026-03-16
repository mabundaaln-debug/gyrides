import { useState, useEffect, useRef } from "react";
import { X, Send, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMessages, sendMessage } from "@/lib/api";
import type { Message } from "@shared/schema";

interface TripChatProps {
  tripId: string;
  userId: string;
  userRole: "rider" | "driver" | "admin";
  otherName: string;
  onClose: () => void;
}

export default function TripChat({ tripId, userId, userRole, otherName, onClose }: TripChatProps) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchMessages = async () => {
    try {
      const data = await getMessages(tripId);
      setMsgs(data);
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage({ tripId, senderId: userId, senderRole: userRole, text: text.trim() });
      setText("");
      await fetchMessages();
    } catch {} finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return "GY Admin";
    if (role === "driver") return "Driver";
    return "Rider";
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" data-testid="trip-chat">
      <div className={`${userRole === "admin" ? "bg-red-600" : "bg-black"} text-white p-4 flex items-center gap-3`}>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center" data-testid="btn-close-chat">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold">{otherName}</h2>
          <p className="text-xs text-white/60">{userRole === "admin" ? "Admin support chat" : "In-trip chat"}</p>
        </div>
        {userRole === "admin" && <Shield className="h-5 w-5 text-white/60" />}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
        {msgs.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            {userRole === "admin" ? "No messages in this trip yet. Send a message to the rider or driver." : "No messages yet. Say hello!"}
          </div>
        )}
        {msgs.map((m) => {
          const isMine = m.senderId === userId;
          const isAdmin = m.senderRole === "admin";
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMine
                  ? (isAdmin ? "bg-red-600 text-white rounded-br-md" : "bg-black text-white rounded-br-md")
                  : isAdmin
                    ? "bg-red-50 text-red-900 border border-red-200 rounded-bl-md"
                    : "bg-white text-black border border-gray-200 rounded-bl-md"
              }`} data-testid={`chat-msg-${m.id}`}>
                {!isMine && (
                  <p className={`text-[10px] font-bold mb-1 ${isAdmin ? "text-red-500" : "text-gray-400"}`}>
                    {isAdmin && <span className="inline-flex items-center gap-0.5"><Shield className="h-2.5 w-2.5 inline" /> </span>}
                    {roleLabel(m.senderRole ?? "")}
                  </p>
                )}
                <p>{m.text}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-white/50" : isAdmin ? "text-red-400" : "text-gray-400"}`}>
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-white p-3 flex gap-2 safe-area-bottom">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={userRole === "admin" ? "Message as GY Admin..." : "Type a message..."}
          className="flex-1 rounded-2xl h-11"
          data-testid="input-chat-message"
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className={`w-11 h-11 rounded-full p-0 ${userRole === "admin" ? "bg-red-600 text-white hover:bg-red-700" : "bg-yellow-400 text-black hover:bg-yellow-500"}`}
          data-testid="btn-send-message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
