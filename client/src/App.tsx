import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "./store";
import { isTokenExpired } from "./utils/token";
import { login } from "./store/userSlice";

function App() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { token, isLoggedIn, role } = useSelector((state: RootState) => state.user);
  
  useEffect(() => {
    console.log("=== App.tsx Debug ===");
    console.log("Redux token:", token);
    console.log("Redux isLoggedIn:", isLoggedIn);
    const storedToken = localStorage.getItem("token");
    console.log("Stored token in localStorage:", storedToken ? "Exists" : "Not found");
    const storedUser = localStorage.getItem("user");
    console.log("Stored user in localStorage:", storedUser ? "Exists" : "Not found");
    
    let isStoredTokenValid = false;
    let parsedUserRole = role;
    if (storedToken && storedUser) {
      try {
        isStoredTokenValid = !isTokenExpired(storedToken);
        console.log("Stored token is valid:", isStoredTokenValid);
        if (isStoredTokenValid && !isLoggedIn) {
          const parsedUser = JSON.parse(storedUser);
          parsedUserRole = parsedUser.role;
          console.log("Restoring login from localStorage");
          dispatch(
            login({
              id: parsedUser._id || parsedUser.id,
              name: parsedUser.name,
              email: parsedUser.email,
              role: parsedUser.role,
              token: storedToken
            })
          );
        }
      } catch (e) {
        console.error("Error checking stored token or restoring user:", e);
      }
    }

    let isReduxTokenValid = false;
    if (token) {
      try {
        isReduxTokenValid = !isTokenExpired(token);
        console.log("Redux token is valid:", isReduxTokenValid);
      } catch (e) {
        console.error("Error checking Redux token:", e);
      }
    }

    const isValidToken = isReduxTokenValid || isStoredTokenValid;
    console.log("Final isTokenValid:", isValidToken);
    
    if (isValidToken) {
      const finalRole = role || parsedUserRole;
      if (finalRole === "admin") {
        console.log("Navigating to /dashboard (admin)");
        navigate("/dashboard", { replace: true });
      } else {
        console.log("Navigating to /dashboard/pos (staff)");
        navigate("/dashboard/pos", { replace: true });
      }
    } else {
      console.log("Navigating to /login");
      navigate("/login", { replace: true });
    }
  }, [navigate, token, isLoggedIn, role, dispatch]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg font-semibold text-gray-700">Redirecting to Odoo Cafe...</p>
    </div>
  );
}

export default App;
