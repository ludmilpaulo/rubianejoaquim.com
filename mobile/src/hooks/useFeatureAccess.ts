import { useAppSelector } from './redux'
import { userHasFeature, type ZendaFeature } from '../utils/subscriptionTier'

export function useHasFeature(feature: ZendaFeature): boolean {
  const { features, planTier, user } = useAppSelector((state) => state.auth)
  const isStaff = Boolean(user?.is_staff || user?.is_superuser || user?.is_admin)
  return userHasFeature(features, planTier, feature, isStaff)
}
