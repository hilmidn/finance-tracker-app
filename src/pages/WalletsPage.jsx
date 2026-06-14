import { useDataScope } from '../hooks/useDataScope'
import WalletsPageInner from './WalletsPageInner'
import HouseholdWalletsPage from './HouseholdWalletsPage'

/**
 * Wallets page — mode-aware.
 * Personal mode: personal wallets (useWallets)
 * Household mode: household wallets (useHouseholdWallets)
 *
 * Renders the appropriate inner page based on the active scope. The
 * pill in the global header is the single source of truth for which
 * one is active.
 */
export default function WalletsPage() {
  const scope = useDataScope()
  return scope.isHousehold
    ? <HouseholdWalletsPage scope={scope} />
    : <WalletsPageInner userId={scope.userId} />
}
