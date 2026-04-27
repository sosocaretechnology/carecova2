import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import Partners from './pages/Partners'
import Apply from './pages/Apply'
import Welcome from './pages/Welcome'
import Track from './pages/Track'
import CustomerLogin from './pages/CustomerLogin'
import CustomerLayout from './components/customer/CustomerLayout'
import CustomerOverview from './pages/customer/CustomerOverview'
import CustomerLoans from './pages/customer/CustomerLoans'
import CustomerLoanDetail from './pages/customer/CustomerLoanDetail'
import Offer from './pages/Offer'
import Calculator from './pages/Calculator'
import ResumeApplication from './pages/ResumeApplication'
import EligibilityCheck from './pages/EligibilityCheck'
import PrivacyPolicy from './pages/PrivacyPolicy'
import MakePayment from './pages/MakePayment'
import PaymentConfirmation from './pages/PaymentConfirmation'
import Notifications from './pages/Notifications'
import FAQ from './pages/FAQ'
import Profile from './pages/Profile'
import AdminLogin from './pages/AdminLogin'
import AdminLayout from './components/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Applications from './pages/admin/Applications'
import ApplicationDetail from './pages/admin/ApplicationDetail'
import InformedDecision from './pages/admin/InformedDecision'
import ActiveLoans from './pages/admin/ActiveLoans'
import LoanDetail from './pages/admin/LoanDetail'
import Repayments from './pages/admin/Repayments'
import RulesConfig from './pages/admin/RulesConfig'
import AuditLog from './pages/admin/AuditLog'
import UserManagement from './pages/admin/UserManagement'
import RecoveryWorkbench from './pages/admin/RecoveryWorkbench'
import OrganizationWallets from './pages/admin/OrganizationWallets'
import ProviderManagement from './pages/admin/ProviderManagement'
// Credit Officer Portal
import CreditLayout from './pages/credit/CreditLayout'
import CreditDashboard from './pages/credit/CreditDashboard'
import DisbursementQueue from './pages/credit/DisbursementQueue'
import DisbursementCaseFile from './pages/credit/DisbursementCaseFile'
import { useAuth } from './hooks/useAuth'
import { useCustomerAuth } from './hooks/useCustomerAuth'
import RequireRoles from './components/auth/RequireRoles'
import { NotificationProvider } from './context/NotificationContext'
import './App.css'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, session } = useAuth()

  if (loading) return <div className="loading">Loading...</div>
  if (!isAuthenticated) return <Navigate to="/admin" replace />
  // Redirect credit officers away from /admin to their own portal
  if (session?.role === 'credit_officer') return <Navigate to="/credit/dashboard" replace />
  return children
}

function ProtectedCreditRoute({ children }) {
  const { isAuthenticated, loading, session } = useAuth()

  if (loading) return <div className="loading">Loading...</div>
  if (!isAuthenticated) return <Navigate to="/admin" replace />
  if (session?.role !== 'credit_officer' && session?.role !== 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }
  return children
}

function ProtectedCustomerRoute({ children }) {
  const { isAuthenticated, loading } = useCustomerAuth()
  if (loading) return <div className="loading">Loading...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/partners" element={<Navigate to="/" replace />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/resume" element={<ResumeApplication />} />
        <Route path="/eligibility" element={<EligibilityCheck />} />
        <Route path="/track" element={<Track />} />
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/portal" element={<ProtectedCustomerRoute><CustomerLayout /></ProtectedCustomerRoute>}>
          <Route index element={<CustomerOverview />} />
          <Route path="loans" element={<CustomerLoans />} />
          <Route path="loans/:id" element={<CustomerLoanDetail />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
        <Route path="/offer/:applicationId" element={<Offer />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/make-payment" element={<MakePayment />} />
        <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route
            path="dashboard"
            element={
              <RequireRoles allowedRoles={['admin', 'sales', 'support', 'credit_officer']}>
                <Dashboard />
              </RequireRoles>
            }
          />
          <Route
            path="applications"
            element={
              <RequireRoles allowedRoles={['admin', 'sales', 'support', 'credit_officer']}>
                <Applications />
              </RequireRoles>
            }
          />
          <Route
            path="applications/:id"
            element={
              <RequireRoles allowedRoles={['admin', 'sales', 'support', 'credit_officer']}>
                <ApplicationDetail />
              </RequireRoles>
            }
          />
          <Route
            path="applications/:id/informed-decision"
            element={
              <RequireRoles allowedRoles={['admin', 'credit_officer']}>
                <InformedDecision />
              </RequireRoles>
            }
          />
          <Route
            path="loans"
            element={
              <RequireRoles allowedRoles={['admin', 'sales', 'support', 'credit_officer']}>
                <ActiveLoans />
              </RequireRoles>
            }
          />
          <Route
            path="loans/:id"
            element={
              <RequireRoles allowedRoles={['admin', 'sales', 'support', 'credit_officer']}>
                <LoanDetail />
              </RequireRoles>
            }
          />
          <Route
            path="repayments"
            element={
              <RequireRoles allowedRoles={['admin', 'support', 'credit_officer']}>
                <Repayments />
              </RequireRoles>
            }
          />
          <Route
            path="wallets"
            element={
              <RequireRoles allowedRoles={['admin']}>
                <OrganizationWallets />
              </RequireRoles>
            }
          />
          <Route
            path="rules"
            element={
              <RequireRoles allowedRoles={['admin']}>
                <RulesConfig />
              </RequireRoles>
            }
          />
          <Route
            path="audit"
            element={
              <RequireRoles allowedRoles={['admin']}>
                <AuditLog />
              </RequireRoles>
            }
          />
          <Route
            path="users"
            element={
              <RequireRoles allowedRoles={['admin']}>
                <UserManagement />
              </RequireRoles>
            }
          />
          <Route
            path="providers"
            element={
              <RequireRoles allowedRoles={['admin']}>
                <ProviderManagement />
              </RequireRoles>
            }
          />
          <Route
            path="recovery"
            element={
              <RequireRoles allowedRoles={['admin', 'support', 'sales']}>
                <RecoveryWorkbench />
              </RequireRoles>
            }
          />
          <Route
            path="notifications"
            element={
              <RequireRoles allowedRoles={['admin', 'sales', 'support', 'credit_officer']}>
                <Notifications />
              </RequireRoles>
            }
          />
          <Route
            path="disbursements"
            element={
              <RequireRoles allowedRoles={['admin', 'credit_officer']}>
                <DisbursementQueue />
              </RequireRoles>
            }
          />
          <Route
            path="disbursements/:id"
            element={
              <RequireRoles allowedRoles={['admin', 'credit_officer']}>
                <DisbursementCaseFile />
              </RequireRoles>
            }
          />
        </Route>
        {/* Credit Officer Portal */}
        <Route path="/credit" element={<ProtectedCreditRoute><CreditLayout /></ProtectedCreditRoute>}>
          <Route path="dashboard" element={<CreditDashboard />} />
          <Route path="loans" element={<ActiveLoans />} />
          <Route path="loans/:id" element={<LoanDetail />} />
          <Route path="repayments" element={<Repayments />} />
          <Route path="disbursements" element={<DisbursementQueue />} />
          <Route path="disbursements/:id" element={<DisbursementCaseFile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Routes>
      </NotificationProvider>
    </BrowserRouter>
  )
}

export default App
