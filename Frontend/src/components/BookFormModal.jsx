import { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import Modal from "./Modal";

const fields = [
  ["title", "Title", "text"],
  ["author", "Author", "text"],
  ["isbn", "ISBN", "text"],
  ["category", "Category", "text"],
  ["totalCopies", "Total copies", "number"],
];

export default function BookFormModal({ book, onClose, onSaved }) {
  const isEdit = Boolean(book);
  const [form, setForm] = useState({
    title: book?.title || "",
    author: book?.author || "",
    isbn: book?.isbn || "",
    category: book?.category || "",
    totalCopies: book?.totalCopies ?? 1,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...form, totalCopies: Number(form.totalCopies) };
    try {
      if (isEdit) {
        await api.put(`/books/${book._id}`, payload);
        toast.success("Book updated");
      } else {
        await api.post("/books", payload);
        toast.success("Book added");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save book");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Book" : "Add Book"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {fields.map(([name, label, type]) => (
          <div key={name} className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input
              type={type}
              name={name}
              required
              min={type === "number" ? 1 : undefined}
              value={form[name]}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        ))}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
            Cancel
          </button>
          <button
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}