import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import IssueFormModal from "../components/IssueFormModal";

const FINE_PER_DAY = 2; // keep in sync with the backend
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const TABS = [
  { key: "all", label: "All" },
  { key: "issued", label: "Issued" },
  { key: "overdue", label: "Overdue" },
  { key: "unpaid", label: "Unpaid fines" },
];

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

function StatusBadge({ issue }) {
  const overdue = issue.status === "issued" && new Date(issue.dueDate) < new Date();
  let text = "Issued";
  let cls = "bg-blue-100 text-blue-700";
  if (issue.status === "returned") {
    text = "Returned";
    cls = "bg-green-100 text-green-700";
  } else if (overdue) {
    text = "Overdue";
    cls = "bg-red-100 text-red-700";
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}

function FineCell({ issue }) {
  if (issue.status === "returned") {
    if (issue.fine === 0) return <span className="text-gray-400">-</span>;
    return issue.finePaid ? (
      <span className="text-green-700">₹{issue.fine} paid</span>
    ) : (
      <span className="font-medium text-red-600">₹{issue.fine} unpaid</span>
    );
  }
  // Still issued: show the fine accrued so far
  const daysLate = Math.ceil((Date.now() - new Date(issue.dueDate)) / MS_PER_DAY);
  if (daysLate > 0) {
    return <span className="text-red-600">~₹{daysLate * FINE_PER_DAY} so far</span>;
  }
  return <span className="text-gray-400">-</span>;
}

export default function Issues() {
  const [tab, setTab] = useState("all");
  const [issues, setIssues] = useState([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "unpaid") {
        const { data } = await api.get("/issues/unpaid-fines");
        setIssues(data.issues);
        setTotalUnpaid(data.totalUnpaid);
      } else if (tab === "overdue") {
        const { data } = await api.get("/issues/overdue");
        setIssues(data);
      } else {
        const { data } = await api.get("/issues", {
          params: tab === "issued" ? { status: "issued" } : {},
        });
        setIssues(data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load issues");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Runs return / renew / pay-fine and refreshes the table
  const runAction = async (issue, path, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(issue._id);
    try {
      const { data } = await api.put(`/issues/${issue._id}/${path}`);
      toast.success(data.message + (path === "return" && data.fine ? ` Fine: ₹${data.fine}` : ""));
      fetchIssues();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    fetchIssues();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Issues</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Issue Book
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "unpaid" && (
        <p className="mb-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Total unpaid fines: <strong>₹{totalUnpaid}</strong>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3">Book</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Returned</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fine</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No records.</td>
              </tr>
            ) : (
              issues.map((i) => {
                const overdue = i.status === "issued" && new Date(i.dueDate) < new Date();
                const busy = busyId === i._id;
                return (
                  <tr key={i._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{i.book?.title || "(deleted)"}</td>
                    <td className="px-4 py-3">
                      {i.member?.name || "(deleted)"}
                      <div className="text-xs text-gray-500">{i.member?.email}</div>
                    </td>
                    <td className="px-4 py-3">{fmt(i.issueDate)}</td>
                    <td className="px-4 py-3">{fmt(i.dueDate)}</td>
                    <td className="px-4 py-3">{fmt(i.returnDate)}</td>
                    <td className="px-4 py-3"><StatusBadge issue={i} /></td>
                    <td className="px-4 py-3"><FineCell issue={i} /></td>
                    <td className="space-x-3 whitespace-nowrap px-4 py-3 text-right">
                      {i.status === "issued" && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => runAction(i, "return", "Mark this book as returned?")}
                            className="text-green-700 hover:underline disabled:opacity-50"
                          >
                            Return
                          </button>
                          {!overdue && (i.renewCount || 0) < 1 && (
                            <button
                              disabled={busy}
                              onClick={() => runAction(i, "renew")}
                              className="text-indigo-600 hover:underline disabled:opacity-50"
                            >
                              Renew
                            </button>
                          )}
                        </>
                      )}
                      {i.status === "returned" && i.fine > 0 && !i.finePaid && (
                        <button
                          disabled={busy}
                          onClick={() => runAction(i, "pay-fine", `Mark fine of ₹${i.fine} as paid?`)}
                          className="text-amber-700 hover:underline disabled:opacity-50"
                        >
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && <IssueFormModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
    </div>
  );
}