const Book = require("../models/Book");
const Issue = require("../models/Issue");
const Reservation = require("../models/Reservation");
const { getClient, MODEL } = require("../services/aiService");

const FINE_PER_DAY = 2;
const DAY = 1000 * 60 * 60 * 24;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turn Gemini API failures into a friendly message
function handleAiError(err, res, next) {
  if (err.status) {
    console.error("AI API error:", err.status, err.message);
    if (err.status === 429)
      return res.status(429).json({ message: "The AI service is busy right now. Please try again in a minute." });
    return res.status(502).json({ message: "The AI service is unavailable right now. Please try again later." });
  }
  next(err);
}

/* ------------------------- 1. RECOMMENDATIONS ------------------------- */

const cache = new Map(); // userId -> { at, data }. Saves quota on repeated dashboard loads
const CACHE_MS = 60 * 60 * 1000;

exports.recommend = async (req, res, next) => {
  try {
    const key = req.user._id.toString();
    const hit = cache.get(key);
    if (hit && !req.query.refresh && Date.now() - hit.at < CACHE_MS) return res.json(hit.data);

    const history = await Issue.find({ member: req.user._id })
      .populate("book", "title author category")
      .sort({ createdAt: -1 })
      .limit(10);
    const borrowedIds = await Issue.find({ member: req.user._id }).distinct("book");

    // Candidates: books this member has not borrowed yet
    const candidates = await Book.find({ _id: { $nin: borrowedIds } })
      .sort({ createdAt: -1 })
      .limit(60)
      .select("title author category availableCopies");

    if (candidates.length === 0)
      return res.json({ books: [], message: "No new books to recommend yet." });

    const byId = new Map(candidates.map((b) => [b._id.toString(), b]));
    let picks = [];

    try {
      const prompt = JSON.stringify({
        borrowingHistory: history
          .filter((i) => i.book)
          .map((i) => ({ title: i.book.title, author: i.book.author, category: i.book.category })),
        candidates: candidates.map((b) => ({
          id: b._id.toString(), title: b.title, author: b.author, category: b.category,
        })),
      });

      const response = await getClient().models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction:
            "You are a friendly librarian recommending books. Choose up to 5 books ONLY from the candidate list, using the exact ids given. " +
            "Base your choices on the member's borrowing history. If there is no history, pick a varied, appealing mix. " +
            'Reply with JSON only: {"picks":[{"id":"<candidate id>","reason":"<max 15 words>"}]}',
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
        },
      });

      const json = JSON.parse((response.text || "").replace(/```json|```/g, "").trim());
      picks = Array.isArray(json.picks) ? json.picks : [];
    } catch (err) {
      if (err.status || err.statusCode) throw err; // real API or config problem
      picks = []; // bad JSON from the model: fall back below
    }

    // Keep only real, unique candidates
    const seen = new Set();
    let books = picks
      .filter((p) => p && byId.has(p.id) && !seen.has(p.id) && seen.add(p.id))
      .slice(0, 5)
      .map((p) => {
        const b = byId.get(p.id);
        return {
          _id: b._id, title: b.title, author: b.author, category: b.category,
          availableCopies: b.availableCopies, reason: String(p.reason || "").slice(0, 120),
        };
      });

    // Fallback if the model returned nothing usable
    if (books.length === 0) {
      books = candidates.slice(0, 5).map((b) => ({
        _id: b._id, title: b.title, author: b.author, category: b.category,
        availableCopies: b.availableCopies, reason: "Recently added to the library",
      }));
    }

    const data = { books };
    cache.set(key, { at: Date.now(), data });
    res.json(data);
  } catch (err) {
    handleAiError(err, res, next);
  }
};

/* ----------------------------- 2. CHATBOT ----------------------------- */

const SYSTEM = `You are the friendly assistant of a library management system, talking to a library member.
Library rules: loan period 14 days; max 3 books at a time; one renewal of 7 days (not allowed if overdue); fine is ₹2 per day late; a reserved book is held for 48 hours once available.
Use the tools to look up real data about books, the member's loans, fines and reservations. Never guess or invent data.
You cannot issue, return, renew or reserve books yourself. Tell the member to use the Books and My Books pages, or ask the library desk.
Only answer library-related questions, and politely decline anything else. Keep answers short (under 80 words) and plain.`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "search_books",
        description: "Search the catalog by title, author, category or ISBN. Returns up to 5 books with availability.",
        parameters: {
          type: "OBJECT",
          properties: { query: { type: "STRING", description: "Search text, e.g. a title or author" } },
          required: ["query"],
        },
      },
      {
        name: "get_my_loans",
        description: "Get the logged-in member's currently borrowed books with due dates and overdue status.",
      },
      {
        name: "get_my_fines",
        description: "Get the logged-in member's unpaid fines.",
      },
      {
        name: "get_my_reservations",
        description: "Get the logged-in member's active reservations (waiting or ready for pickup).",
      },
    ],
  },
];

// Every tool is scoped to `user`, so a member can only ever see their own data
async function runTool(name, input, user) {
  switch (name) {
    case "search_books": {
      const q = String(input?.query || "").trim().slice(0, 80);
      if (!q) return { books: [] };
      const rx = new RegExp(escapeRegex(q), "i");
      const books = await Book.find({ $or: [{ title: rx }, { author: rx }, { category: rx }, { isbn: rx }] })
        .limit(5)
        .select("title author category availableCopies totalCopies");
      return {
        books: books.map((b) => ({
          title: b.title, author: b.author, category: b.category,
          availableCopies: b.availableCopies, totalCopies: b.totalCopies,
        })),
      };
    }
    case "get_my_loans": {
      const issues = await Issue.find({ member: user._id, status: "issued" }).populate("book", "title");
      return {
        loans: issues.map((i) => {
          const daysLeft = Math.ceil((i.dueDate - Date.now()) / DAY);
          return {
            title: i.book?.title, dueDate: i.dueDate.toDateString(), daysLeft,
            overdue: daysLeft < 0, fineSoFar: daysLeft < 0 ? Math.abs(daysLeft) * FINE_PER_DAY : 0,
            canRenew: daysLeft >= 0 && (i.renewCount || 0) < 1,
          };
        }),
      };
    }
    case "get_my_fines": {
      const issues = await Issue.find({ member: user._id, fine: { $gt: 0 }, finePaid: false }).populate("book", "title");
      return {
        unpaid: issues.map((i) => ({ title: i.book?.title, fine: i.fine })),
        total: issues.reduce((sum, i) => sum + i.fine, 0),
      };
    }
    case "get_my_reservations": {
      const list = await Reservation.find({ member: user._id, status: { $in: ["waiting", "ready"] } })
        .populate("book", "title");
      return {
        reservations: list.map((r) => ({
          title: r.book?.title, status: r.status,
          holdExpires: r.status === "ready" ? r.expiresAt.toString() : undefined,
        })),
      };
    }
    default:
      return { error: "Unknown tool" };
  }
}

exports.chat = async (req, res, next) => {
  try {
    const raw = Array.isArray(req.body.messages) ? req.body.messages : [];

    // Keep the last 10 valid messages, each capped in length
    const history = raw
      .slice(-10)
      .filter((m) => ["user", "assistant"].includes(m?.role) && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    while (history.length && history[0].role !== "user") history.shift();

    if (history.length === 0 || history[history.length - 1].role !== "user")
      return res.status(400).json({ message: "Send a message first" });

    // Gemini calls the assistant role "model"
    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const ai = getClient();

    // Let the model call tools for up to 5 rounds
    for (let step = 0; step < 5; step++) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: { systemInstruction: SYSTEM, tools: TOOLS, maxOutputTokens: 1024 },
      });

      const calls = response.functionCalls || [];
      if (calls.length === 0)
        return res.json({ reply: (response.text || "").trim() || "Sorry, I couldn't answer that." });

      // Add the model's turn exactly as returned (keeps any internal reasoning signatures)
      contents.push(response.candidates[0].content);

      const parts = [];
      for (const call of calls) {
        let out;
        try {
          out = await runTool(call.name, call.args, req.user);
        } catch (e) {
          console.error("Tool failed:", call.name, e.message);
          out = { error: "Could not fetch that data" };
        }
        parts.push({
          functionResponse: {
            name: call.name,
            response: { result: out },
            ...(call.id ? { id: call.id } : {}),
          },
        });
      }
      contents.push({ role: "user", parts });
    }

    res.json({ reply: "That took too many steps. Please try a simpler question." });
  } catch (err) {
    handleAiError(err, res, next);
  }
};