import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Home,
  Users,
  Tag,
  LogOut,
  Edit2,
  Check,
  X as XIcon,
} from "lucide-react";
import { useHousehold } from "../hooks/useHousehold";
import { useHouseholdMembers } from "../hooks/useHouseholdMembers";
import MemberList from "../components/MemberList";
import HouseholdCategoriesTab from "../components/HouseholdCategoriesTab";
import InviteMemberModal from "../components/InviteMemberModal";
import ConfirmModal from "../components/ConfirmModal";

export default function HouseholdSettingsPage() {
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id;
  const { household, hasPendingInvite, loading, renameHousehold } =
    useHousehold(userId);
  const householdId = household?.id;
  const { members, leave } = useHouseholdMembers(householdId);

  const [activeTab, setActiveTab] = useState("members"); // 'members' | 'categories'
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(null);

  // ── State: not in any household ──
  if (!loading && !household) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl">
          <Home size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-700 font-medium">Belum ada household</p>
        <p className="text-gray-400 text-xs">
          Buat household dari halaman Pengaturan, atau terima undangan yang
          masuk
        </p>
      </div>
    );
  }

  // ── Pending invite state ──
  if (hasPendingInvite) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold">Household</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-900 font-medium">
            Kamu punya undangan pending
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Lihat banner kuning di atas, atau buka halaman utama.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading || !household) {
    return <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />;
  }

  // ── Active member ──
  const myMembership = members.find((m) => m.user_id === userId);
  const isAdmin =
    myMembership?.role === "admin" && myMembership?.status === "accepted";

  const handleRename = async () => {
    if (!newName.trim()) return;
    setRenaming(true);
    setRenameError(null);
    try {
      await renameHousehold(householdId, newName.trim());
      setEditing(false);
    } catch (err) {
      setRenameError(err.message);
    } finally {
      setRenaming(false);
    }
  };

  const handleLeave = async () => {
    if (!myMembership) return;
    if (isAdmin && members.filter((m) => m.status === "accepted").length > 1) {
      setLeaveError(
        "Admin harus transfer ownership dulu sebelum leave, atau hapus household",
      );
      setLeaveOpen(true);
      return;
    }
    setLeaveError(null);
    setLeaveOpen(true);
  };

  const handleConfirmLeave = async () => {
    setLeaving(true);
    try {
      await leave(myMembership.id);
      setLeaveOpen(false);
    } catch (err) {
      setLeaveError(err.message);
      throw err; // keep modal open
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Household</h1>

      {/* Header card: household name + role */}
      <div className="bg-linear-to-r from-indigo-500 to-violet-500 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Home size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    className="flex-1 rounded-lg px-3 py-1.5 text-sm bg-white/95 text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <button
                    onClick={handleRename}
                    disabled={renaming}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setRenameError(null);
                    }}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
                {renameError && (
                  <p className="text-xs text-red-100 bg-red-500/30 rounded-lg px-2 py-1">
                    {renameError}
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="font-bold text-lg truncate">{household.name}</p>
                <p className="text-xs text-indigo-100">
                  {isAdmin ? "Kamu admin" : "Kamu member"}
                </p>
              </>
            )}
          </div>
          {!editing && isAdmin && (
            <button
              onClick={() => {
                setNewName(household.name);
                setEditing(true);
              }}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
        <p className="text-[10px] text-indigo-100/80">
          ID: {householdId?.substring(0, 8)}...
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === "members"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-500"
          }`}
        >
          <Users size={16} /> Member
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === "categories"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-500"
          }`}
        >
          <Tag size={16} /> Kategori
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors active:scale-[0.98]"
            >
              <Users size={18} /> Undang Member
            </button>
          )}
          <MemberList householdId={householdId} />
        </div>
      )}

      {activeTab === "categories" && (
        <HouseholdCategoriesTab householdId={householdId} />
      )}

      {/* Leave button */}
      <button
        onClick={handleLeave}
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors mt-8"
      >
        <LogOut size={18} /> Keluar dari Household
      </button>

      {showInvite && (
        <InviteMemberModal
          householdId={householdId}
          onClose={() => setShowInvite(false)}
        />
      )}

      <ConfirmModal
        isOpen={leaveOpen}
        onClose={() => {
          if (!leaving) {
            setLeaveOpen(false);
            setLeaveError(null);
          }
        }}
        onConfirm={handleConfirmLeave}
        title={leaveError ? "Tidak bisa keluar" : "Keluar dari household?"}
        message={
          leaveError ||
          "Kamu tidak akan lagi melihat transaksi household ini di akunmu. Transaksi yang sudah ada tetap tersimpan."
        }
        confirmText="Keluar"
        cancelText={leaveError ? "Tutup" : "Batal"}
        variant="danger"
        loading={leaving}
      />
    </div>
  );
}
