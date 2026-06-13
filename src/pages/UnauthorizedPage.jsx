import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertIcon } from "../components/shared/Icons";

const ROLE_HOME = {
  vendor:   "/vendor/dashboard",
  delivery: "/delivery/dashboard",
  admin:    "/admin/dashboard",
};

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  function goHome() {
    const dest = user ? (ROLE_HOME[user.role] ?? "/") : "/";
    navigate(dest, { replace: true });
  }

  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-sm z-10 text-center">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6 animate-pulse">
            <AlertIcon className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">Access Denied</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            You do not have the required permissions to view this dashboard page.
          </p>
          <button
            onClick={goHome}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:shadow-red-600/35 transition duration-200 cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

