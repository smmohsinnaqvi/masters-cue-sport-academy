export type UserRole = "admin" | "supervisor";

export type AcademySession = {
  role: UserRole;
  email: string;
  name: string;
};

export function canAccessRole(userRole: UserRole | null | undefined, requiredRole: UserRole) {
  if (userRole === "admin") return true;
  return userRole === requiredRole;
}
