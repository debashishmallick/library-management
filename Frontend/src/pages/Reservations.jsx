import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";

const TABS = [
  { key: "ready", label: "Ready for pickup" },
  { key: "waiting", label: "Waiting" },
  { key: "", label: "All" },
];

const STATUS_STYLE = {
  waiting: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  fulfilled: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-500",
  expired: "bg-red-100 text-red-700",
};

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

export default function Reservations() {
  const [tab, setTab] = useState("ready");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reservations", { params: tab ? { status: tab } : {} });
      setList(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load reservations");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const cancel = async (r) => {
    if (!window.confirm(`Cancel ${r.member?.name}'s reservation?`)) return;
    try {
      const { data } = await api.put(`/reservations/${r._id}/cancel`);
      toast.success(data.message);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel");
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-800">Reservations</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ready" && (
        <p className="mb-3 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          These copies are being held. When the member arrives, issue the book from the Issues page.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3">Book</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Reserved</th>
              <th className="px-4 py-3">Hold expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No reservations.</td></tr>
            ) : (
              list.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.book?.title || "(deleted)"}</td>
                  <td className="px-4 py-3">
                    {r.member?.name || "(deleted)"}
                    <div className="text-xs text-gray-500">{r.member?.email}</div>
                  </td>
                  <td className="px-4 py-3">{fmt(r.reservedAt)}</td>
                  <td className="px-4 py-3">{r.status === "ready" ? fmt(r.expiresAt) : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {["waiting", "ready"].includes(r.status) && (
                      <button onClick={() => cancel(r)} className="text-red-600 hover:underline">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}