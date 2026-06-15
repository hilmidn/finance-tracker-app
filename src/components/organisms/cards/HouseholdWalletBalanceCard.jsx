import { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useHouseholdWallets } from '../../../hooks/useHouseholdWallets'

/**
 * Balance card untuk household.
 * Shows total balance, operasional vs savings breakdown.
 */
export default function HouseholdWalletBalanceCard({ householdId }) {
  const { totalBalance, operasionalBalance, savingsBalance, wallets, loading } =
    useHouseholdWallets(householdId)

  if (loading) {
    return <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
  }

  if (wallets.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl p-5 text-white shadow-xl shadow-indigo-200/50">
      <p className="text-sm text-indigo-200 font-medium">Total Saldo Household</p>
      <p className="text-3xl font-bold tracking-tight mt-1">
        Rp {(totalBalance || 0).toLocaleString('id-ID')}
      </p>
      <div className="flex gap-4 mt-3 pt-3 border-t border-white/15 text-sm">
        <div>
          <p className="text-xs text-indigo-200">Operasional</p>
          <p className="font-semibold text-white">
            Rp {(operasionalBalance || 0).toLocaleString('id-ID')}
          </p>
        </div>
        <div>
          <p className="text-xs text-amber-200">Tabungan</p>
          <p className="font-semibold text-amber-200">
            Rp {(savingsBalance || 0).toLocaleString('id-ID')}
          </p>
        </div>
      </div>
    </div>
  )
}
