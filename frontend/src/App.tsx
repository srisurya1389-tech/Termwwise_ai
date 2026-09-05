import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public & Landing
import Landing from './pages/Landing';

// Auth Pages
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import ForgotPassword from './pages/Auth/ForgotPassword';

// Admin Portal Pages (NovaCraft Manufacturing)
import Dashboard from './pages/Dashboard';
import Receivables from './pages/Receivables';
import InvoiceDetail from './pages/InvoiceDetail';
import Buyers from './pages/Buyers';
import BuyerDetail from './pages/BuyerDetail';
import CashFlow from './pages/CashFlow';
import Priorities from './pages/Priorities';
import Negotiations from './pages/Negotiations';
import NegotiationWorkspace from './pages/NegotiationWorkspace';
import AdminCustomerRequests from './pages/AdminCustomerRequests';
import Outcomes from './pages/Outcomes';
import Insights from './pages/Insights';
import Integrations from './pages/Integrations';

// Customer Portal Pages (ABC Industries)
import CustomerDashboard from './pages/Customer/CustomerDashboard';
import CustomerInvoices from './pages/Customer/CustomerInvoices';
import CustomerInvoiceDetail from './pages/Customer/CustomerInvoiceDetail';
import CustomerPayments from './pages/Customer/CustomerPayments';
import CustomerRequests from './pages/Customer/CustomerRequests';
import CustomerNotifications from './pages/Customer/CustomerNotifications';
import CustomerProfile from './pages/Customer/CustomerProfile';

import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Landing & Authentication */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* ========================================================= */}
          {/* ADMIN PORTAL (NovaCraft Manufacturing)                     */}
          {/* ========================================================= */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receivables"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Receivables />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receivables/:invoiceId"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <InvoiceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyers"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Buyers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyers/:buyerId"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <BuyerDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash-flow"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <CashFlow />
              </ProtectedRoute>
            }
          />
          <Route
            path="/priorities"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Priorities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/negotiations"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Negotiations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/negotiations/:negotiationId"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <NegotiationWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customer-requests"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminCustomerRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/outcomes"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Outcomes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Insights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/integrations"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Integrations />
              </ProtectedRoute>
            }
          />

          {/* ========================================================= */}
          {/* CUSTOMER PORTAL (ABC Industries)                          */}
          {/* ========================================================= */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/invoices"
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <CustomerInvoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/invoices/:id"
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <CustomerInvoiceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/payments"
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <CustomerPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/requests"
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <CustomerRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/notifications"
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <CustomerNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute requiredRole="CUSTOMER">
                <CustomerProfile />
              </ProtectedRoute>
            }
          />

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
