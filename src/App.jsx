import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { OrderProvider } from "./context/OrderContext";

import RoleRoute from "./routes/RoleRoute";

import LoginPage from "./pages/auth/LoginPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

import VendorDashboard from "./pages/vendor/VendorDashboard";
import TabletPage from "./pages/vendor/TabletPage";
import OrderQueuePage from "./pages/vendor/OrderQueuePage";
import CapacityPage from "./pages/vendor/CapacityPage";
import StaffPage from "./pages/vendor/StaffPage";
import ReportsPage from "./pages/vendor/ReportsPage";
import ApartmentManagementPage from "./pages/vendor/ApartmentManagementPage";

import DeliveryDashboard from "./pages/delivery/DeliveryDashboard";
import PickupJobsPage from "./pages/delivery/PickupJobsPage";
import ActiveDeliveryPage from "./pages/delivery/ActiveDeliveryPage";
import EarningsPage from "./pages/delivery/EarningsPage";
import CompletedOrdersPage from "./pages/delivery/CompletedOrdersPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import OrderManagementPage from "./pages/admin/OrderManagementPage";
import VendorManagementPage from "./pages/admin/VendorManagementPage";
import CustomerManagementPage from "./pages/admin/CustomerManagementPage";
import ApartmentsPage from "./pages/admin/ApartmentsPage";
import DeliveryManagementPage from "./pages/admin/DeliveryManagementPage";
import PricingPage from "./pages/admin/PricingPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrderProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Vendor routes */}
            <Route path="/vendor/dashboard" element={<RoleRoute allowedRole="vendor"><VendorDashboard /></RoleRoute>} />
            <Route path="/vendor/orders"    element={<RoleRoute allowedRole="vendor"><OrderQueuePage /></RoleRoute>} />
            <Route path="/vendor/capacity"  element={<RoleRoute allowedRole="vendor"><CapacityPage /></RoleRoute>} />
            <Route path="/vendor/staff"     element={<RoleRoute allowedRole="vendor"><StaffPage /></RoleRoute>} />
            <Route path="/vendor/reports"     element={<RoleRoute allowedRole="vendor"><ReportsPage /></RoleRoute>} />
            <Route path="/vendor/apartments" element={<RoleRoute allowedRole="vendor"><ApartmentManagementPage /></RoleRoute>} />
            <Route path="/vendor/tablet"    element={<RoleRoute allowedRole="vendor"><TabletPage /></RoleRoute>} />

            {/* Delivery routes */}
            <Route path="/delivery/dashboard" element={<RoleRoute allowedRole="delivery"><DeliveryDashboard /></RoleRoute>} />
            <Route path="/delivery/pickups"   element={<RoleRoute allowedRole="delivery"><PickupJobsPage /></RoleRoute>} />
            <Route path="/delivery/active"    element={<RoleRoute allowedRole="delivery"><ActiveDeliveryPage /></RoleRoute>} />
            <Route path="/delivery/earnings"   element={<RoleRoute allowedRole="delivery"><EarningsPage /></RoleRoute>} />
            <Route path="/delivery/completed" element={<RoleRoute allowedRole="delivery"><CompletedOrdersPage /></RoleRoute>} />

            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<RoleRoute allowedRole="admin"><AdminDashboard /></RoleRoute>} />
            <Route path="/admin/orders"    element={<RoleRoute allowedRole="admin"><OrderManagementPage /></RoleRoute>} />
            <Route path="/admin/vendors"     element={<RoleRoute allowedRole="admin"><VendorManagementPage /></RoleRoute>} />
            <Route path="/admin/customers"  element={<RoleRoute allowedRole="admin"><CustomerManagementPage /></RoleRoute>} />
            <Route path="/admin/apartments" element={<RoleRoute allowedRole="admin"><ApartmentsPage /></RoleRoute>} />
            <Route path="/admin/delivery"  element={<RoleRoute allowedRole="admin"><DeliveryManagementPage /></RoleRoute>} />
            <Route path="/admin/pricing"   element={<RoleRoute allowedRole="admin"><PricingPage /></RoleRoute>} />
            <Route path="/admin/analytics" element={<RoleRoute allowedRole="admin"><AnalyticsPage /></RoleRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
