import { useState } from "react";
import toast from "react-hot-toast";
import { KeyRound, UserRound } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const { data } = await api.put("/auth/profile", { name });
      updateUser({ name: data.name });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update profile");
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error("New passwords do not match");
    setSavingPw(true);
    try {
      const { data } = await api.put("/auth/change-password", {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      toast.success(data.message);
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not change password");
    } finally {
      setSavingPw(false);
    }
  };

  const handlePw = (e) => setPw({ ...pw, [e.target.name]: e.target.value });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <form onSubmit={saveName} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><UserRound size={20} /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Personal info</h2>
            <p className="text-xs text-gray-400">Your email and role can only be changed by an admin.</p>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={`${inputClass} mb-4`} />

        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input value={user?.email || ""} disabled className={`${inputClass} mb-4 bg-gray-50 text-gray-500`} />

        <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
        <input value={user?.role || ""} disabled className={`${inputClass} mb-5 bg-gray-50 capitalize text-gray-500`} />

        <button
          disabled={savingName || name.trim() === user?.name}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {savingName ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form onSubmit={savePassword} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600"><KeyRound size={20} /></div>
          <h2 className="font-semibold text-gray-900">Change password</h2>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Current password</label>
        <input
          type="password" name="currentPassword" required value={pw.currentPassword}
          onChange={handlePw} autoComplete="current-password" className={`${inputClass} mb-4`}
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">New password (min 6 characters)</label>
        <input
          type="password" name="newPassword" required minLength={6} value={pw.newPassword}
          onChange={handlePw} autoComplete="new-password" className={`${inputClass} mb-4`}
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Confirm new password</label>
        <input
          type="password" name="confirm" required value={pw.confirm}
          onChange={handlePw} autoComplete="new-password" className={`${inputClass} mb-5`}
        />

        <button
          disabled={savingPw}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {savingPw ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}