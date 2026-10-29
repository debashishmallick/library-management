import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";

const FINE_PER_DAY = 2; // keep in sync with the backend
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

function daysLeft(dueDate) {
  return Math.ceil((new Date(dueDate) - Date.now()) / MS_PER_DAY);
}

export default function MyBooks() {
  const [issues, setIssues] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const fetchIssues = useCallback(async () => {
    try {
      const { data } = await api.get("/issues/my");
      setIssues(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load your books");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      const { data } = await api.get("/reservations/my");
      setReservations(data.filter((r) => ["waiting", "ready"].includes(r.status)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchIssues();
    fetchReservations();
  }, [fetchIssues, fetchReservations]);

  const renew = async (issue) => {
    setBusyId(issue._id);
    try {
      const { data } = await api.put(`/issues/${issue._id}/renew`);
      toast.success(data.message);
      fetchIssues();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not renew");
    } finally {
      setBusyId(null);
    }
  };

  const cancelReservation = async (r) => {
    if (!window.confirm(`Cancel your reservation for "${r.book?.title}"?`)) return;
    try {
      const { data } = await api.put(`/reservations/${r._id}/cancel`);
      toast.success(data.message);
      fetchReservations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel");
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  const current = issues.filter((i) => i.status === "issued");
  const history = issues.filter((i) => i.status === "returned");
  const unpaid = history.filter((i) => i.fine > 0 && !i.finePaid);
  const unpaidTotal = unpaid.reduce((sum, i) => sum + i.fine, 0);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-800">My Books</h1>

      {unpaidTotal > 0 && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          You have unpaid fines of <strong>₹{unpaidTotal}</strong>. Please pay at the library desk.
        </p>
      )}

      <h2 className="mb-2 text-lg font-semibold text-gray-800">Currently borrowed</h2>
      {current.length === 0 ? (
        <p className="mb-6 text-sm text-gray-500">You have no borrowed books.</p>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((i) => {
            const left = daysLeft(i.dueDate);
            const overdue = left < 0;
            const canRenew = !overdue && (i.renewCount || 0) < 1;
            return (
              <div key={i._id} className="rounded-xl bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800">{i.book?.title || "(deleted)"}</h3>
                <p className="text-sm text-gray-500">{i.book?.author}</p>

                <p className="mt-3 text-sm">Due: <strong>{fmt(i.dueDate)}</strong></p>
                {overdue ? (
                  <p className="text-sm font-medium text-red-600">
                    Overdue by {Math.abs(left)} day(s). Fine so far: ~₹{Math.abs(left) * FINE_PER_DAY}
                  </p>
                ) : (
                  <p className={`text-sm ${left <= 3 ? "font-medium text-amber-600" : "text-gray-500"}`}>
                    {left} day(s) left
                  </p>
                )}

                {canRenew ? (
                  <button
                    disabled={busyId === i._id}
                    onClick={() => renew(i)}
                    className="mt-3 rounded-md border border-indigo-600 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {busyId === i._id ? "Renewing..." : "Renew (+7 days)"}
                  </button>
                ) : (
                  <p className="mt-3 text-xs text-gray-400">
                    {overdue ? "Return it to the library" : "Already renewed"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-2 text-lg font-semibold text-gray-800">My reservations</h2>
      {reservations.length === 0 ? (
        <p className="mb-8 text-sm text-gray-500">You have no active reservations.</p>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reservations.map((r) => {
            const ready = r.status === "ready";
            const hoursLeft = ready
              ? Math.max(0, Math.ceil((new Date(r.expiresAt) - Date.now()) / 3600000))
              : 0;
            return (
              <div
                key={r._id}
                className={`rounded-xl p-4 shadow-sm ${ready ? "border border-green-200 bg-green-50" : "bg-white"}`}
              >
                <h3 className="font-semibold text-gray-800">{r.book?.title || "(deleted)"}</h3>
                <p className="text-sm text-gray-500">{r.book?.author}</p>
                {ready ? (
                  <p className="mt-3 text-sm font-medium text-green-700">
                    Ready for pickup! Held for you for {hoursLeft} more hour(s).
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-gray-600">
                    Waiting in queue: position <strong>{r.position}</strong>
                  </p>
                )}
                <button
                  onClick={() => cancelReservation(r)}
                  className="mt-3 text-sm text-red-600 hover:underline"
                >
                  Cancel reservation
                </button>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-2 text-lg font-semibold text-gray-800">History</h2>
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">No returned books yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Returned</th>
                <th className="px-4 py-3">Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((i) => (
                <tr key={i._id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{i.book?.title || "(deleted)"}</td>
                  <td className="px-4 py-3">{fmt(i.issueDate)}</td>
                  <td className="px-4 py-3">{fmt(i.returnDate)}</td>
                  <td className="px-4 py-3">
                    {i.fine === 0 ? (
                      <span className="text-gray-400">-</span>
                    ) : i.finePaid ? (
                      <span className="text-green-700">₹{i.fine} paid</span>
                    ) : (
                      <span className="font-medium text-red-600">₹{i.fine} unpaid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}