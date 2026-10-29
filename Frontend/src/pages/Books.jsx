import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/Pagination";
import BookFormModal from "../components/BookFormModal";

const LIMIT = 10;

export default function Books() {
  const { user, isStaff } = useAuth();
  const isAdmin = user?.role === "admin";

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { book } (book undefined = add)
  const [activeReservations, setActiveReservations] = useState([]);

  // Wait 400ms after typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/books", {
        params: { search: debouncedSearch, category, page, limit: LIMIT },
      });
      setBooks(data.books);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load books");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, page]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get("/books/categories");
      setCategories(data);
    } catch {
      /* filter just stays empty */
    }
  }, []);

  const fetchMyReservations = useCallback(async () => {
    if (isStaff) return;
    try {
      const { data } = await api.get("/reservations/my");
      setActiveReservations(data.filter((r) => ["waiting", "ready"].includes(r.status)));
    } catch {
      /* buttons just won't show "Reserved" */
    }
  }, [isStaff]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchMyReservations();
  }, [fetchMyReservations]);

  const reservedIds = new Set(activeReservations.map((r) => r.book?._id));

  const handleReserve = async (book) => {
    try {
      const { data } = await api.post("/reservations", { bookId: book._id });
      toast.success(data.message);
      fetchMyReservations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reserve");
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    try {
      await api.delete(`/books/${book._id}`);
      toast.success("Book deleted");
      // If that was the last item on the page, go back one page
      if (books.length === 1 && page > 1) setPage(page - 1);
      else fetchBooks();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete");
    }
  };

  const handleSaved = () => {
    setModal(null);
    fetchBooks();
    fetchCategories();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Books</h1>
        {isStaff && (
          <button
            onClick={() => setModal({})}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Book
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by title, author or ISBN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:w-80"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">ISBN</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Available</th>
              {isStaff && <th className="px-4 py-3 text-right">Actions</th>}
              {!isStaff && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : books.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No books found.</td>
              </tr>
            ) : (
              books.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{b.title}</td>
                  <td className="px-4 py-3">{b.author}</td>
                  <td className="px-4 py-3 text-gray-500">{b.isbn}</td>
                  <td className="px-4 py-3">{b.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.availableCopies > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {b.availableCopies} / {b.totalCopies}
                    </span>
                  </td>
                  {isStaff && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setModal({ book: b })}
                        className="mr-3 text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(b)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                  {!isStaff && (
                    <td className="px-4 py-3 text-right">
                      {b.availableCopies > 0 ? (
                        <span className="text-xs text-gray-400">Available</span>
                      ) : reservedIds.has(b._id) ? (
                        <span className="text-xs font-medium text-indigo-600">Reserved</span>
                      ) : (
                        <button
                          onClick={() => handleReserve(b)}
                          className="text-indigo-600 hover:underline"
                        >
                          Reserve
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-gray-500">{total} book(s) found</p>
      <Pagination page={page} pages={pages} onChange={setPage} />

      {modal && (
        <BookFormModal book={modal.book} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}