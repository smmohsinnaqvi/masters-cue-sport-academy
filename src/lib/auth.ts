export type UserRole = "admin" | "supervisor";

export type AcademySession = {
  role: UserRole;
  email: string;
  name: string;
};

export function canAccessRole(userRole: UserRole | null | undefined, requiredRole: UserRole) {
  if (!userRole) return false;
  if (userRole === "admin") {
    return true;
  }
  return userRole === requiredRole;
}

const AUTH_USERS: Record<UserRole, { email: string; password: string; name: string }> = {
  admin: {
    email: "admin@masterscue.com",
    password: "admin123",
    name: "Academy Owner",
  },
  supervisor: {
    email: "supervisor@masterscue.com",
    password: "supervisor123",
    name: "Supervisor",
  },
};

export const AUTH_STORAGE_KEY = "masters-academy-session";

export function getDemoCredentials(role: UserRole) {
  return AUTH_USERS[role];
}

export function getStoredSession(): AcademySession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AcademySession;
    if (!parsed?.role || !parsed?.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: AcademySession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function loginWithRole(role: UserRole, email: string, password: string) {
  const credential = AUTH_USERS[role];

  if (!credential) {
    return { ok: false, message: "Invalid role selected." };
  }

  if (email.trim().toLowerCase() !== credential.email || password !== credential.password) {
    return {
      ok: false,
      message: "Incorrect email or password for this role.",
    };
  }

  const session: AcademySession = {
    role,
    email: credential.email,
    name: credential.name,
  };

  saveSession(session);
  return { ok: true, session };
}

export function isAuthenticated(role?: UserRole) {
  const session = getStoredSession();
  if (!session) return false;
  if (!role) return true;
  return session.role === role;
}
