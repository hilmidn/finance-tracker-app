import { useDataScope } from '../hooks/useDataScope'
import TransactionsPageInner from './TransactionsPageInner'
import HouseholdTransactionsPage from './HouseholdTransactionsPage'

/**
 * Transactions page — mode-aware.
 * Personal mode: useTransactions, TransactionItem, TransactionForm
 * Household mode: useHouseholdTransactions, HouseholdTransactionItem,
 *                 HouseholdTransactionForm
 */
export default function TransactionsPage() {
  const scope = useDataScope()
  return scope.isHousehold
    ? <HouseholdTransactionsPage scope={scope} />
    : <TransactionsPageInner userId={scope.userId} />
}
