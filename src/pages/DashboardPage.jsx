import { useDataScope } from '../hooks/useDataScope'
import DashboardPageInner from './DashboardPageInner'
import HouseholdDashboardPage from './HouseholdDashboardPage'

/**
 * Dashboard — mode-aware.
 * Personal mode: useWallets, useTransactions, BalanceCard
 * Household mode: useHouseholdWallets, useHouseholdTransactions,
 *                 HouseholdWalletBalanceCard
 */
export default function DashboardPage() {
  const scope = useDataScope()
  return scope.isHousehold
    ? <HouseholdDashboardPage scope={scope} />
    : <DashboardPageInner userId={scope.userId} />
}
