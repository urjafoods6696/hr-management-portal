import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  authService,
  userService,
  getStoredUser,
  getStoredToken,
  setAuthSession,
  USER_STORAGE_KEY,
  API_BASE_URL
} from '../services/api';

export const UserProfileContext = createContext(null);

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const cleanBase = BASE.endsWith('/') ? BASE : `${BASE}/`;

/**
 * Maps technical role codes to human-readable designations/labels
 */
export function getRoleDisplayName(roleCode) {
  if (!roleCode) return 'HR Administrator';
  switch (roleCode) {
    case 'ROLE_IT_ADMIN':
      return 'IT Administrator';
    case 'ROLE_HR_ADMIN':
      return 'HR Administrator';
    case 'ROLE_HR_RECRUITER':
      return 'Senior Technical Recruiter';
    case 'ROLE_HRBP':
      return 'HR Business Partner';
    case 'ROLE_DEPT_HEAD':
      return 'Department Head';
    case 'ROLE_APPROVING_MANAGER':
      return 'Approving Manager';
    case 'ROLE_SENIOR_MGMT':
      return 'Senior Leadership / VP';
    case 'ROLE_INTERVIEWER':
      return 'Technical Lead / Interviewer';
    case 'ROLE_EMPLOYEE':
      return 'Standard Employee';
    default:
      return roleCode.replace(/^ROLE_/, '').replace(/_/g, ' ');
  }
}

/**
 * Normalizes raw user object from any source (backend API, storage, login)
 * guarantees standard canonical keys and aliases simultaneously.
 */
export function normalizeUserProfile(rawUser, token = null) {
  if (!rawUser) return null;

  const id = rawUser.id || rawUser.userId || null;
  const name = (rawUser.fullName || rawUser.name || rawUser.username || 'User').trim();
  const role = rawUser.role || (Array.isArray(rawUser.roles) && rawUser.roles[0]) || 'ROLE_HR_ADMIN';
  const roles = Array.isArray(rawUser.roles) && rawUser.roles.length > 0 ? rawUser.roles : [role];
  const email = (rawUser.email || '').trim().toLowerCase();
  const username = (rawUser.username || '').trim().replace(/^@/, '');
  const phone = (rawUser.phone || rawUser.phoneNumber || '').trim();
  const department = rawUser.department || rawUser.dept || rawUser.departmentName || 'Human Resources & Talent Acquisition';
  const departmentId = rawUser.departmentId || rawUser.departmentRestrictionId || 3;
  const designation = rawUser.designation || rawUser.title || getRoleDisplayName(role);
  const profileImage = rawUser.profileImage || rawUser.profileImageUrl || rawUser.avatar || '';
  const avatarVersion = rawUser.avatarVersion || rawUser.updatedAt || Date.now();

  return {
    ...rawUser,
    id,
    // Canonical names & all common component aliases
    name,
    fullName: name,
    email,
    username,
    phone,
    phoneNumber: phone,
    role,
    roles,
    department,
    dept: department,
    departmentName: department,
    departmentId,
    designation,
    title: designation,
    profileImage,
    profileImageUrl: profileImage,
    avatar: profileImage,
    avatarVersion,
    token: token || rawUser.token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ats_urja_token') : null),
    status: rawUser.status || 'ACTIVE'
  };
}

/**
 * Resolves avatar URL with cache busting to prevent stale browser caches
 */
export function resolveUserAvatar(url, role, avatarVersion) {
  if (!url) {
    return role === 'ROLE_DEPT_HEAD'
      ? `${cleanBase}assets/images/man.jpg`
      : `${cleanBase}assets/images/woman.jpg`;
  }

  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  let resolved = url;
  if (url.startsWith('/api/')) {
    const apiBase = (typeof window !== 'undefined' && window.__API_BASE_URL__) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
      API_BASE_URL || '';
    resolved = apiBase ? `${apiBase.replace(/\/$/, '')}${url}` : url;
  } else if (url.startsWith('/assets/')) {
    resolved = `${cleanBase}${url.slice(1)}`;
  }

  // Cache busting query parameter for backend-stored avatar images
  if (resolved.includes('/avatar/') && avatarVersion) {
    const separator = resolved.includes('?') ? '&' : '?';
    return `${resolved}${separator}v=${avatarVersion}`;
  }

  return resolved;
}

export function UserProfileProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(() => {
    const stored = getStoredUser();
    return stored ? normalizeUserProfile(stored) : null;
  });

  // Updates in-memory state and storage
  const setAndPersistUser = useCallback((user) => {
    if (!user) {
      setCurrentUserState(null);
      return;
    }
    const normalized = normalizeUserProfile(user);
    setCurrentUserState(normalized);

    const token = normalized.token || getStoredToken();
    if (token) {
      setAuthSession(token, normalized, true);
    }
  }, []);

  // Fetch freshest profile from backend
  const refreshUserProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return null;

    try {
      const res = await authService.getCurrentUser();
      if (res) {
        const normalized = normalizeUserProfile(res, token);
        setAndPersistUser(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('Failed to refresh user profile from backend:', err);
    }
    return null;
  }, [setAndPersistUser]);

  // Synchronize across windows/tabs & custom events
  useEffect(() => {
    const handleProfileEvent = (e) => {
      if (e.detail) {
        const normalized = normalizeUserProfile(e.detail);
        setCurrentUserState(normalized);
      } else {
        refreshUserProfile();
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === USER_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCurrentUserState(normalizeUserProfile(parsed));
        } catch (ignored) {}
      }
    };

    window.addEventListener('ats:profile_updated', handleProfileEvent);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('ats:profile_updated', handleProfileEvent);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshUserProfile]);

  /**
   * Centralized profile update workflow:
   * 1. Optional file upload
   * 2. Backend profile update
   * 3. State & storage synchronization
   * 4. Multi-component notification broadcast
   */
  const updateUserProfile = useCallback(async (payload, file = null) => {
    let finalAvatarUrl = payload.profileImageUrl || currentUser?.profileImageUrl;

    // 1. Upload device image if provided
    if (file) {
      const uploadRes = await authService.uploadAvatar(file);
      if (uploadRes && uploadRes.profileImageUrl) {
        finalAvatarUrl = uploadRes.profileImageUrl;
      }
    }

    // 2. Submit updated profile payload to Spring Boot
    const updatePayload = {
      ...payload,
      profileImageUrl: finalAvatarUrl
    };

    const updatedRes = await authService.updateCurrentUserProfile(updatePayload);
    const versioned = {
      ...(currentUser || {}),
      ...updatedRes,
      profileImageUrl: finalAvatarUrl,
      avatar: finalAvatarUrl,
      profileImage: finalAvatarUrl,
      avatarVersion: Date.now()
    };

    const normalized = normalizeUserProfile(versioned);
    setAndPersistUser(normalized);

    // 3. Broadcast globally to all listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ats:profile_updated', { detail: normalized }));
    }

    return normalized;
  }, [currentUser, setAndPersistUser]);

  const value = useMemo(() => ({
    currentUser,
    setCurrentUser: setAndPersistUser,
    updateUserProfile,
    refreshUserProfile,
    resolveAvatarUrl: (url, role) => resolveUserAvatar(url, role, currentUser?.avatarVersion)
  }), [currentUser, setAndPersistUser, updateUserProfile, refreshUserProfile]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    // Graceful fallback for components used outside provider or in isolated tests
    const stored = getStoredUser();
    return {
      currentUser: stored ? normalizeUserProfile(stored) : null,
      setCurrentUser: () => {},
      updateUserProfile: async () => {},
      refreshUserProfile: async () => {},
      resolveAvatarUrl: (url, role) => resolveUserAvatar(url, role, Date.now())
    };
  }
  return context;
}
