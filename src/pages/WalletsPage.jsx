import { useSelector } from 'react-redux'
import WalletsPageInner from './WalletsPageInner'

export default function WalletsPage() {
  const userId = useSelector((s) => s.auth.user?.id)
  return <WalletsPageInner userId={userId} />
}
