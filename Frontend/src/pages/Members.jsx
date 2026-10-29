import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";

const LIMIT = 10;
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

function MemberDetailModal({ memberId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get(`/members/${memberId}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        toast.error(err.response?.data?.message || "Could not load member");
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  return (
    <Modal title="Member Details" onClose={onClose}>
      {!data ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div>
          <p className="font-medium text-gray-800">{data.member.name}</p>
          <p className="text-sm text-gray-500">{data.member.email}</p>
          <p className="mt-1 text-sm text-gray-500">Joined {fmt(data.member.createdAt)}</p>
          <p className="mt-2 text-sm">
            Total fines: <strong>₹{data.totalFine}</strong>
          </p>

          <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-700">Borrowing history</h3>
          {data.history.length === 0 ? (
            <p className="text-sm text-gray-500">No borrowing history.</p>
          ) : (
            <ul className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
              {data.history.map((h) => (
                <li key={h._id} className="px-3 py-2">
                  <div className="font-medium">{h.book?.title || "(deleted)"}</div>
                  <div className="text-xs text-gray-500">
                    {fmt(h.issueDate)} to {h.returnDate ? fmt(h.returnDate) : `due ${fmt(h.dueDate)}`}
                    {" · "}
                    {h.status === "returned" ? "Returned" : "Issued"}
                    {h.fine > 0 && ` · Fine ₹${h.fine} (${h.finePaid ? "paid" : "unpaid"})`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

function AddUserModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/members", form);
      toast.success("User created");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {[
          ["name", "Full name", "text"],
          ["email", "Email", "email"],
          ["password", "Password (min 6 characters)", "password"],
        ].map(([name, label, type]) => (
          <div key={name} className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input
              type={type}
              name={name}
              required
              value={form[name]}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        ))}
        <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="mb-5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="member">Member</option>
          <option value="librarian">Librarian</option>
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
            Cancel
          </button>
          <button
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Members() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/members", {
        params: { search: debouncedSearch, page, limit: LIMIT },
      });
      setMembers(data.members);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load members");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const toggleBlock = async (m) => {
    const action = m.isBlocked ? "unblock" : "block";
    if (!window.confirm(`Are you sure you want to ${action} ${m.name}?`)) return;
    try {
      const { data } = await api.put(`/members/${m._id}/block`);
      toast.success(data.message);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Members</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add User
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:w-80"
      />

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No members found.</td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                  <td className="px-4 py-3">{m.email}</td>
                  <td className="px-4 py-3">{fmt(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.isBlocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {m.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="space-x-3 whitespace-nowrap px-4 py-3 text-right">
                    <button onClick={() => setDetailId(m._id)} className="text-indigo-600 hover:underline">
                      View
                    </button>
                    <button
                      onClick={() => toggleBlock(m)}
                      className={m.isBlocked ? "text-green-700 hover:underline" : "text-red-600 hover:underline"}
                    >
                      {m.isBlocked ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-gray-500">{total} member(s) found</p>
      <Pagination page={page} pages={pages} onChange={setPage} />

      {detailId && <MemberDetailModal memberId={detailId} onClose={() => setDetailId(null)} />}
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetchMembers();
          }}
        />
      )}
    </div>
  );
}