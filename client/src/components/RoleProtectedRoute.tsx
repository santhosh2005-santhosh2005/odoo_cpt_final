import { Navigate, Outlet, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import type { AppDispatch, RootState } from "../store";
import { login, logout } from "../store/userSlice";
import { isTokenExpired } from "../utils/token";

interface RoleProtectedRouteProps {
  allowedRoles: string[];
}

export default function RoleProtectedRoute({ allowedRoles }: RoleProtectedRouteProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { token, role } = useSelector((state: RootState) => state.user);
  const location = useLocation();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restoreSession = () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      
      if (storedToken && storedUser && !isTokenExpired(storedToken)) {
        if (!token) {
          const userData = JSON.parse(storedUser);
          dispatch(
            login({
              id: userData._id || userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              token: storedToken
            })
          );
        }
      } else {
        dispatch(logout());
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("sessionId");
      }
      setIsRestoring(false);
    };

    restoreSession();
  }, [dispatch, token]);

  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const validToken =
    token && !isTokenExpired(token) ? token : localStorage.getItem("token");

  if (!validToken || isTokenExpired(validToken || "")) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's role is allowed
  const storedUser = localStorage.getItem("user");
  let currentRole = role;
  if (!currentRole && storedUser) {
    try {
      currentRole = JSON.parse(storedUser).role;
    } catch (e) {
      // ignore
    }
  }

  if (!allowedRoles.includes(currentRole || "")) {
    // Redirect to appropriate dashboard
    if (currentRole === "admin") {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard/pos" replace />;
    }
  }

  return <Outlet />;
}
