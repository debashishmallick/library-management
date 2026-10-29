import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import api from "../api/axios";

const SUGGESTIONS = [
  "Is Clean Code available?",
  "When are my books due?",
  "Do I have any fines?",
  "What are the library rules?",
];

const WELCOME = {
  role: "assistant",
  content: "Hi! I'm the library assistant. Ask me about books, your loans, fines or reservations.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, sending]);

  const send = async (text) => {
    const content = text.trim();
    if (!content || sending) return;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      // Skip the welcome message and error bubbles, send the last 10
      const payload = next
        .slice(1)
        .filter((m) => !m.error)
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));
      const { data } = await api.post("/ai/chat", { messages: payload });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", error: true, content: err.response?.data?.message || "Sorry, something went wrong." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <div className="leading-tight">
                <p className="text-sm font-semibold">Library Assistant</p>
                <p className="text-xs text-indigo-100">AI-powered</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 hover:bg-white/20">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : m.error
                      ? "bg-red-50 text-red-700"
                      : "bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white px-3 py-2 text-sm text-gray-400 shadow-sm">Thinking...</div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-gray-200 bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about books, loans, fines..."
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            />
            <button
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="rounded-lg bg-indigo-600 px-3 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open library assistant"
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 text-white shadow-lg transition hover:scale-105"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}