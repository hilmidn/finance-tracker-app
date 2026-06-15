import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeftRight, Plus, Wallet } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useWallets } from "../hooks/useWallets";
import { useTransactions, useSummary } from "../hooks/useTransactions";
import TransactionItem from "../components/organisms/list/TransactionItem";
import BalanceCard from "../components/organisms/cards/BalanceCard";
import TransactionForm from "../components/organisms/forms/TransactionForm";
import { useCategories } from "../hooks/useCategories";

export default function DashboardPageInner({ userId }) {
  const user = useSelector((s) => s.auth.user);
  const { wallets, loading: walletsLoading } = useWallets(userId);
  const {
    transactions,
    loading: txLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransfer,
  } = useTransactions(userId);

  const { categories } = useCategories(userId);

  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const navigate = useNavigate();

  // Compute balances locally (same pattern as WalletsPageInner — keeps
  // all wallet logic in one place: useWallets returns raw wallets, the
  // caller derives balances from transactions).
  const balances = useMemo(() => {
    const b = {};
    wallets.forEach((w) => {
      b[w.id] = w.initial_balance || 0;
    });
    transactions.forEach((t) => {
      if (t.__type === "transfer" && t._raw) {
        if (t._raw.from_wallet_id)
          b[t._raw.from_wallet_id] =
            (b[t._raw.from_wallet_id] || 0) - t._raw.amount;
        if (t._raw.to_wallet_id)
          b[t._raw.to_wallet_id] =
            (b[t._raw.to_wallet_id] || 0) + t._raw.amount;
      } else if (t.wallet_id) {
        if (t.type === "pemasukan")
          b[t.wallet_id] = (b[t.wallet_id] || 0) + t.amount;
        else b[t.wallet_id] = (b[t.wallet_id] || 0) - t.amount;
      }
    });
    return b;
  }, [wallets, transactions]);

  const operasionalBalance = wallets
    .filter((w) => !w.is_savings)
    .reduce((s, w) => s + (balances[w.id] || 0), 0);
  const savingsBalance = wallets
    .filter((w) => w.is_savings)
    .reduce((s, w) => s + (balances[w.id] || 0), 0);
  const totalBalance = operasionalBalance + savingsBalance;

  // Current-month summary for the BalanceCard cashflow section.
  const currentMonth = format(new Date(), "yyyy-MM");
  const monthLabel = format(new Date(), "MMMM yyyy", { locale: id });
  const { data: monthSummary, isLoading: summaryLoading } = useSummary(
    userId,
    currentMonth,
  );

  const recentTransactions = useMemo(() => {
    return transactions
      .slice()
      .sort(
        (a, b) =>
          (b.date || "").localeCompare(a.date || "") ||
          (b.id || 0) - (a.id || 0),
      )
      .slice(0, 5);
  }, [transactions]);

  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: id });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-500">{todayLabel}</p>
        <h1 className="text-xl font-bold">
          Halo, {user?.user_metadata?.full_name || "kamu"} 👋
        </h1>
      </div>

      <BalanceCard
        saldo={totalBalance}
        month={monthLabel}
        loading={walletsLoading || summaryLoading}
        operasionalBalance={operasionalBalance}
        savingsBalance={savingsBalance}
        pemasukan={monthSummary?.pemasukan}
        pengeluaran={monthSummary?.pengeluaran}
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3.5 shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus size={20} />{" "}
          <span className="text-sm font-semibold">Catat</span>
        </button>
        <button
          onClick={() => navigate("/wallets")}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-3.5 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <Wallet size={20} className="text-gray-700" />{" "}
          <span className="text-sm font-semibold text-gray-700">Dompet</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-gray-800">Dompet</p>
          <Link to="/wallets" className="text-xs text-indigo-600 font-medium">
            Lihat semua
          </Link>
        </div>
        {walletsLoading ? (
          <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        ) : wallets.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <Wallet size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Belum ada dompet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {wallets.slice(0, 4).map((w) => (
              <div
                key={w.id}
                className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">
                    {w.icon ||
                      (w.is_savings
                        ? "🐷"
                        : w.type === "cash"
                          ? "👛"
                          : w.type === "bank"
                            ? "🏦"
                            : "📱")}
                  </span>
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {w.name}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  Rp {(balances[w.id] || 0).toLocaleString("id-ID")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-gray-800">
            Transaksi Terbaru
          </p>
          <Link
            to="/transactions"
            className="text-xs text-indigo-600 font-medium"
          >
            Lihat semua
          </Link>
        </div>
        {txLoading ? (
          <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        ) : recentTransactions.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <ArrowLeftRight size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const key =
                tx.__type === "transfer" ? `tr_${tx._raw?.id}` : `tx_${tx.id}`;
              return (
                <TransactionItem
                  key={key}
                  tx={tx}
                  onDelete={(id, isTransfer) => {
                    isTransfer ? deleteTransfer(id) : deleteTransaction(id);
                  }}
                  onEdit={(t) => {
                    if (t.__type !== "transfer") {
                      setEditTx({
                        ...t,
                        category_id: t.category_id,
                        wallet_id: t.wallet_id,
                      });
                      setShowForm(true);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <TransactionForm
          userId={userId}
          categories={categories}
          wallets={wallets}
          editTx={editTx}
          onSubmit={
            editTx
              ? (data) => {
                  updateTransaction(editTx.id, data);
                  setShowForm(false);
                  setEditTx(null);
                }
              : async (tx) => {
                  await addTransaction(tx);
                  setShowForm(false);
                }
          }
          onClose={() => {
            setShowForm(false);
            setEditTx(null);
          }}
        />
      )}
    </div>
  );
}
