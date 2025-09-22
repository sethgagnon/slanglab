import { useAuth } from '@/contexts/AuthContext';

export interface AccessControlConfig {
  requiresAuth?: boolean;
  requiresLabPro?: boolean;
  requiresAdmin?: boolean;
  allowDuringLoading?: boolean;
}

export const useAccessControl = (config: AccessControlConfig = {}) => {
  const { 
    user, 
    loading, 
    profileLoading, 
    isAdmin, 
    hasLabProAccess, 
    hasFullAccess 
  } = useAuth();

  const {
    requiresAuth = false,
    requiresLabPro = false,
    requiresAdmin = false,
    allowDuringLoading = false
  } = config;

  // If we're still loading profile data, handle gracefully
  if ((loading || profileLoading) && !allowDuringLoading) {
    return {
      hasAccess: false,
      isLoading: true,
      denialReason: null,
      canAccess: {
        feature: false,
        admin: false,
        labPro: false
      }
    };
  }

  // Check authentication requirement
  if (requiresAuth && !user) {
    return {
      hasAccess: false,
      isLoading: false,
      denialReason: 'authentication_required',
      canAccess: {
        feature: false,
        admin: false,
        labPro: false
      }
    };
  }

  // Admin bypass - admins can access everything
  if (isAdmin) {
    return {
      hasAccess: true,
      isLoading: false,
      denialReason: null,
      canAccess: {
        feature: true,
        admin: true,
        labPro: true
      }
    };
  }

  // Check admin requirement (non-admins denied)
  if (requiresAdmin) {
    return {
      hasAccess: false,
      isLoading: false,
      denialReason: 'admin_required',
      canAccess: {
        feature: false,
        admin: false,
        labPro: hasLabProAccess
      }
    };
  }

  // Check LabPro requirement
  if (requiresLabPro && !hasLabProAccess) {
    return {
      hasAccess: false,
      isLoading: false,
      denialReason: 'labpro_required',
      canAccess: {
        feature: false,
        admin: false,
        labPro: false
      }
    };
  }

  // All checks passed
  return {
    hasAccess: true,
    isLoading: false,
    denialReason: null,
    canAccess: {
      feature: true,
      admin: isAdmin,
      labPro: hasLabProAccess
    }
  };
};

// Convenience hooks for common access patterns
export const useLabProAccess = () => useAccessControl({ requiresLabPro: true });
export const useAdminAccess = () => useAccessControl({ requiresAdmin: true });
export const useAuthAccess = () => useAccessControl({ requiresAuth: true });