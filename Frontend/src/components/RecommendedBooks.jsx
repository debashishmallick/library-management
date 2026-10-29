import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Sparkles } from "lucide-react";
import api from "../api/axios";

export default function RecommendedBooks() {
  const [books, setBooks] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [requested, setRequested] = useState(false); // true after the first click

  const load = async (refresh = false) => {
    setRequested(true);
    setLoading(true);
    setFailed(false);
    try {
      const { data } = await api.get("/ai/recommendations", { params: refresh ? { refresh: 1 } : {} });
      setBooks(data.books);
      setMessage(data.message || "");
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-violet-50 p-2 text-violet-600"><Sparkles size={18} /></span>
          <div>
            <h2 className="font-semibold text-gray-900">Recommended for you</h2>
            <p className="text-xs text-gray-400">Picked by AI from your reading history</p>
          </div>
        </div>

        {requested && (
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        )}
      </div>

      {!requested ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
          <p className="mb-4 text-sm text-gray-500">
            Get book suggestions based on what you have borrowed before.
          </p>
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-5 py-2.5 text-sm font-medium text-white shadow hover:opacity-90"
          >
            <Sparkles size={16} /> Show recommendations
          </button>
        </div>
      ) : loading ? (
        <div className="grid animate-pulse gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-gray-100" />)}
        </div>
      ) : failed ? (
        <p className="text-sm text-gray-500">Recommendations are unavailable right now. Please try again in a minute.</p>
      ) : books.length === 0 ? (
        <p className="text-sm text-gray-500">{message || "No recommendations yet."}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <div key={b._id} className="rounded-xl border border-gray-100 p-4">
              <p className="font-medium text-gray-900">{b.title}</p>
              <p className="text-sm text-gray-500">{b.author} · {b.category}</p>
              <p className="mt-2 text-xs italic text-gray-600">{b.reason}</p>
              <span
                className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  b.availableCopies > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {b.availableCopies > 0 ? "Available" : "Reserve it"}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link to="/books" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
        Browse the full catalog
      </Link>
    </section>
  );
}