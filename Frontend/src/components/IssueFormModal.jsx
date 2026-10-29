import { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import Modal from "./Modal";
import SearchPicker from "./SearchPicker";

export default function IssueFormModal({ onClose, onSaved }) {
  const [member, setMember] = useState(null);
  const [book, setBook] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member || !book) return toast.error("Select a member and a book");
    setSubmitting(true);
    try {
      await api.post("/issues", { bookId: book._id, memberId: member._id });
      toast.success("Book issued");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not issue book");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Issue a Book" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <SearchPicker
          label="Member"
          url="/members"
          resultKey="members"
          selected={member}
          onSelect={setMember}
          renderItem={(m) => ({
            label: m.name,
            sub: m.email,
            disabled: m.isBlocked,
          })}
        />

        <SearchPicker
          label="Book"
          url="/books"
          resultKey="books"
          selected={book}
          onSelect={setBook}
          renderItem={(b) => ({
            label: b.title,
            sub: b.availableCopies > 0 ? `${b.availableCopies} available` : "Not available",
            disabled: b.availableCopies === 0,
          })}
        />

        <p className="mb-4 text-xs text-gray-500">
          Loan period is 14 days. Each member can borrow up to 3 books.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
            Cancel
          </button>
          <button
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Issuing..." : "Issue Book"}
          </button>
        </div>
      </form>
    </Modal>
  );
}