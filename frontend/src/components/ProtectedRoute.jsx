import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute
 *
 * Props:
 *   children      — the component to render when access is granted
 *   allowedRoles  — optional array of roles permitted to access this route
 *                   e.g. ["organization", "admin"]
 *                   If omitted, any authenticated user can access.
 */
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // Not logged in
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  // If role restriction is specified, check it
  if (allowedRoles && allowedRoles.length > 0) {
    let user;
    try {
      user = JSON.parse(userStr);
    } catch {
      // Corrupt localStorage — force re-login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }

    if (!user || !allowedRoles.includes(user.role)) {
      // Authenticated but wrong role → send to unauthorized page
      // For now redirect to login with a replace so back button works
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;