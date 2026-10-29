import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowRight, BookCopy, BookOpen, Library,
  Receipt, Users, BookMarked, UserCog,
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import RecommendedBooks from "../components/RecommendedBooks";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Backend returns only months that have data; fill the last 6 months with zeros
function buildMonthly(monthly = []) {
  const map = new Map(monthly.map((m) => [`${m._id.year}-${m._id.month}`, m.count]));
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      month: MONTHS[d.getMonth()],
      issues: map.get(`${d.getFullYear()}-${d.getMonth() + 1}`) || 0,
    });
  }
  return out;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  violet: "bg-violet-50 text-violet-600",
};

function StatCard({ label, value, icon: Icon, tone, hint }) {
  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${TONES[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="mb-4 text-xs text-gray-400">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-32 rounded-2xl bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-200" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-2xl bg-gray-200 lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-gray-200" />
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-indigo-600">{payload[0].value} issues</p>
    </div>
  );
}

function LibrariansCard({ librarians: initial }) {
  const [librarians, setLibrarians] = useState(initial);
  const [busyId, setBusyId] = useState(null);

  const active = librarians.filter((l) => !l.isBlocked).length;
  const blocked = librarians.length - active;

  const toggle = async (l) => {
    const action = l.isBlocked ? "unblock" : "block";
    if (!window.confirm(`Are you sure you want to ${action} ${l.name}?`)) return;

    setBusyId(l._id);
    try {
      const { data } = await api.put(`/members/librarians/${l._id}/block`);
      setLibrarians((list) =>
        list.map((x) => (x._id === l._id ? { ...x, isBlocked: data.isBlocked } : x))
      );
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not change status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card title="Librarians" subtitle="Staff accounts on your library (visible to admin only)">
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-indigo-50 py-3">
          <p className="text-2xl font-bold text-indigo-600">{librarians.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="rounded-xl bg-emerald-50 py-3">
          <p className="text-2xl font-bold text-emerald-600">{active}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="rounded-xl bg-rose-50 py-3">
          <p className="text-2xl font-bold text-rose-600">{blocked}</p>
          <p className="text-xs text-gray-500">Blocked</p>
        </div>
      </div>

      {librarians.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">No librarians yet.</p>
      ) : (
        <ul className="divide-y">
          {librarians.map((l) => (
            <li key={l._id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {l.name?.[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{l.name}</p>
                  <p className="truncate text-xs text-gray-500">{l.email}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    l.isBlocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {l.isBlocked ? "Blocked" : "Active"}
                </span>

                {/* Toggle switch: on = active, off = blocked */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={!l.isBlocked}
                  aria-label={l.isBlocked ? `Unblock ${l.name}` : `Block ${l.name}`}
                  title={l.isBlocked ? "Click to unblock" : "Click to block"}
                  disabled={busyId === l._id}
                  onClick={() => toggle(l)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                    l.isBlocked ? "bg-gray-300" : "bg-emerald-500"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      l.isBlocked ? "translate-x-0.5" : "translate-x-[1.375rem]"
                    }`}
                  />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/librarians" className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
        <UserCog size={15} /> Manage librarians
      </Link>
    </Card>
  );
}

function MemberHome({ user }) {
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 p-8 text-white shadow-lg">
        <p className="text-sm text-indigo-100">{greeting()}</p>
        <h1 className="mt-1 text-3xl font-bold">{user.name} 👋</h1>
        <p className="mt-2 max-w-md text-indigo-100">
          Browse the catalog, renew your loans and keep track of your due dates.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          to="/books"
          className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><BookOpen /></div>
            <div>
              <p className="font-semibold text-gray-900">Browse Books</p>
              <p className="text-sm text-gray-500">Search the full catalog</p>
            </div>
          </div>
          <ArrowRight className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
        </Link>

        <Link
          to="/my-books"
          className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><BookMarked /></div>
            <div>
              <p className="font-semibold text-gray-900">My Books</p>
              <p className="text-sm text-gray-500">Loans, due dates and fines</p>
            </div>
          </div>
          <ArrowRight className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
        </Link>
      </div>

      <RecommendedBooks />
    </div>
  );
}

export default function Dashboard() {
  const { user, isStaff } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isStaff) return;
    api
      .get("/reports/stats")
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load stats"));
  }, [isStaff]);

  const monthlyData = useMemo(() => buildMonthly(stats?.monthly), [stats]);

  if (!isStaff) return <MemberHome user={user} />;
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-600">{error}</p>;
  if (!stats) return <Skeleton />;

  const issuedCopies = stats.totalCopies - stats.availableCopies;
  const donut = [
    { name: "Available", value: stats.availableCopies, color: "#10b981" },
    { name: "Issued", value: issuedCopies, color: "#6366f1" },
  ];
  const maxTop = Math.max(...stats.topBooks.map((b) => b.count), 1);
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 p-7 text-white shadow-lg">
        <div>
          <p className="text-sm text-indigo-100">{today}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {greeting()}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-indigo-100">
            {stats.overdue > 0
              ? `${stats.overdue} book(s) are overdue and need attention.`
              : "Everything is on time. Nothing is overdue."}
          </p>
        </div>
        <Link
          to="/issues"
          className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/25"
        >
          Manage issues <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Book titles" value={stats.totalTitles} icon={Library} tone="indigo" />
        <StatCard
          label="Available"
          value={stats.availableCopies}
          hint={`of ${stats.totalCopies} copies`}
          icon={BookCopy}
          tone="emerald"
        />
        <StatCard label="Members" value={stats.totalMembers} icon={Users} tone="sky" />
        <StatCard label="Issued now" value={stats.issuedNow} icon={BookOpen} tone="amber" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="rose" />
        <StatCard label="Total fines" value={`₹${stats.totalFines}`} icon={Receipt} tone="violet" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Books issued" subtitle="Last 6 months" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="issuesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="issues"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#issuesFill)"
                  dot={{ r: 3, fill: "#6366f1" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Copy availability" subtitle="Available vs issued">
          {stats.totalCopies === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">Add books to see this chart.</p>
          ) : (
            <>
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{stats.totalCopies}</span>
                  <span className="text-xs text-gray-400">copies</span>
                </div>
              </div>
              <div className="mt-3 flex justify-center gap-5 text-xs text-gray-600">
                {donut.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Top books */}
      <Card title="Most borrowed books" subtitle="All time, top 5">
        {stats.topBooks.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No borrowing data yet.</p>
        ) : (
          <ul className="space-y-4">
            {stats.topBooks.map((b, idx) => (
              <li key={b.title} className="flex items-center gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="truncate font-medium text-gray-800">{b.title}</span>
                    <span className="ml-3 shrink-0 text-gray-500">{b.count} issues</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${(b.count / maxTop) * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Admin only: librarians (the server only sends this data to admins) */}
      {user.role === "admin" && stats.librarians && <LibrariansCard librarians={stats.librarians} />}
    </div>
  );
}