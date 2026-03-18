# Frontend Implementation Checklist (CareCova Engineering Spec)

This checklist is derived from **CARECOVA_Engineering_Spec_Frontend_Backend_Implementation.docx** (in this folder). It lists what the frontend must implement or align so that the full system (application → sales → admin → disbursement → loans → repayment → recovery → wallets) works with the backend.

**Reference:** Keep the canonical spec in sync with `docs/SYSTEM_IMPLEMENTATION.md` when it exists; the Word doc and markdown should match.

---

## 1. Status model – use backend as single source of truth

**Requirement:** StatusBadge, tabs, and filters must use **backend status enums** for applications, loans, repayments, and wallets. No hard-coded status strings in the UI that diverge from the API.

| Area | Backend enums (spec) | Current frontend | Action |
|------|----------------------|------------------|--------|
| **Application** | `submitted`, `under_sales_review`, `sales_rejected`, `pending_admin_review`, `admin_rejected`, `approved_for_disbursement`, `in_disbursement_queue`, `disbursement_processing`, `disbursed`, `cancelled` | Uses `pending`, `approved`, `rejected`, `active`, etc. in `StatusBadge`, `trackingService`, `adminService` | Map existing frontend statuses to spec enums; extend `StatusBadge` and any filters to accept/display spec values. Ensure API responses drive display. |
| **Loan** | `pending_activation`, `active`, `partially_paid`, `overdue`, `completed`, `defaulted` | Similar but not identical | Use backend loan status in Active Loans, Loan Detail, and Recovery. |
| **Repayment** | `scheduled`, `due`, `payment_processing`, `paid`, `partial`, `failed`, `overdue` | Local/mock only | When repayment APIs exist, consume these statuses in Repayments page and loan detail. |
| **Wallet tx** | `pending`, `success`, `failed`, `reversed` | N/A | Use in Org Wallet and Sales Wallet transaction lists when backend wallet endpoints are live. |

**Files to touch:** `src/components/StatusBadge.jsx`, `src/services/trackingService.js`, `src/data/riskConfig.js` (if status-dependent), dashboard filters and queue tabs in `src/pages/admin/*`, `src/pages/credit/*`.

---

## 2. Role mapping

**Requirement:** Map backend roles consistently to frontend roles via a single mapper in the service layer.

**Backend roles (spec):** `applicant`, `sales_agent`, `admin`, `credit_officer`, `recovery_officer`, `super_admin`.

**Current:** `src/services/adminService.js` has `mapBackendRole()` mapping `super_admin` → `admin`, `credit_admin` → `credit_officer`, `customer_service` → `support`, etc.

**Action:** Align `mapBackendRole()` with the spec role names. Ensure sidebar and `RequireRoles` in `App.jsx` use the same mapping so that `sales_agent`, `credit_officer`, `recovery_officer` are correctly gated.

**Files:** `src/services/adminService.js`, `src/components/auth/RequireRoles.jsx`, `src/components/admin/AdminSidebar.jsx`, `src/App.jsx`.

---

## 3. Application submission (Apply flow)

**Requirement:** Public apply payload must match backend contract so that applicant, employment, application, identity, and documents are stored correctly.

**Spec request shape (section 8.1):**  
`applicant` (firstName, lastName, phone, email, dob, gender, address, city, state), `employment` (employmentType, employerName, jobTitle, monthlyIncome, monthlyExpenses), `application` (requestedAmount, hospitalName, hospitalAddress, treatmentCategory, treatmentDescription, treatmentEstimate, repaymentDueDay, preferredRepaymentMethod), `identity` (bvn, nin), `documents` (array of { documentType, fileUrl }).

**Current:** `src/pages/Apply.jsx` uses `buildPayload()` that spreads `formData` (fullName, phone, email, bvn, nin, applicantPhoto, documents, hospital, location, coBorrower, etc.) and sends to `loanService.submitApplication()`.

**Action:** Ensure `buildPayload()` (or a DTO layer before the API call) outputs the structure the backend expects (e.g. nested `applicant`, `employment`, `application`, `identity`, `documents`). If the backend already accepts a flatter payload, document that in SYSTEM_IMPLEMENTATION.md and keep frontend in sync. Add applicant photo URL to `documents` if backend expects it there.

**Files:** `src/pages/Apply.jsx`, `src/services/loanService.js`.

---

## 4. Application list and detail (admin)

**Requirement:** Use `/admin/loan-applications` and `/admin/loan-applications/:id` for list and detail. Remove placeholder/mock-only data once backend routes are ready.

**Current:** `adminService.getAllLoans()` and `getLoanById()` already call these endpoints when `USE_BACKEND` is true. `normalizeLoanFromApi()` normalizes response for UI.

**Action:** Confirm backend returns the spec’s application fields and statuses. Replace any remaining mock branches (e.g. when no token) with redirect to login or clear “no backend” messaging. Ensure Application Detail page shows only data from API (no local storage fallback for production).

**Files:** `src/services/adminService.js`, `src/pages/admin/Applications.jsx`, `src/pages/admin/ApplicationDetail.jsx`.

---

## 5. Sales review (Stage 1)

**Requirement:** Sales agent approves or rejects; backend moves status to `pending_admin_review` or `sales_rejected` and records notes.

**Spec endpoints:**  
- `POST /api/admin/loan-applications/:id/sales-approve`  
- `POST /api/admin/loan-applications/:id/sales-reject`  
- (Optional) `POST /api/admin/loan-applications/:id/add-note`

**Current:** Stage 1 is handled via `adminService.approveStage1(loanId, data)` which currently updates local storage only (no backend call in the codebase).

**Action:** Add `adminService.salesApprove(loanId, payload)` and `adminService.salesReject(loanId, reason)` that call the spec endpoints. Wire `SalesDataCollection` (or equivalent) to call these and refresh application detail from API. Remove or bypass local-storage-only approval path when backend is configured.

**Files:** `src/services/adminService.js`, `src/components/admin/ApplicationDetail/SalesDataCollection.jsx`, `src/pages/admin/ApplicationDetail.jsx`.

---

## 6. Admin approval (Stage 2)

**Requirement:** Admin approves (with approved amount, duration, notes, commission overrides) or rejects. Backend creates disbursement queue entry and sets status to `approved_for_disbursement`.

**Spec endpoints:**  
- `POST /api/admin/loan-applications/:id/admin-approve`  
- `POST /api/admin/loan-applications/:id/admin-reject`  
- `POST /api/admin/loan-applications/:id/modify-offer` (if supported)

**Spec admin-approve body (8.2):** approvedAmount, durationMonths, serviceFee, totalRepayable, totalInterest, notes, commissionOverrides.

**Current:** `adminService.approveLoan(loanId, terms)` and `rejectLoan(loanId, reason)` exist but operate on local storage when not using backend; backend endpoints may differ from spec.

**Action:** Implement or align `approveLoan` / `rejectLoan` (and any modify-offer) with the spec URLs and request bodies. DecisionPanel should send the spec payload and handle response (e.g. queueItemId, status). Ensure status shown in UI is the one returned by the API.

**Files:** `src/services/adminService.js`, `src/components/admin/ApplicationDetail/DecisionPanel.jsx`.

---

## 7. Disbursement queue and case file

**Requirement:** Credit officer uses dedicated disbursement endpoints for queue list and confirm/fail actions.

**Spec endpoints:**  
- `GET /api/admin/disbursement-queue` – list  
- `GET /api/admin/disbursement-queue/:id` – case file  
- `POST /api/admin/disbursements/:applicationId/confirm` – confirm payout (body: payoutMethod, hospitalAccountName, hospitalBankName, hospitalAccountNumber)  
- `POST /api/admin/disbursements/:applicationId/fail` – mark failed (body: failureReason)

**Current:** `adminService.getDisbursementQueue()` and `confirmDisbursement()` / `requestDisbursementCorrection()` use in-memory loan list and local storage. DisbursementQueue and DisbursementCaseFile pages depend on this.

**Action:** Add `getDisbursementQueue()` and `getDisbursementCaseFile(id)` that call the spec list and detail endpoints. Add `confirmDisbursement(applicationId, payload)` and `failDisbursement(applicationId, payload)` that call the spec confirm/fail endpoints. Update DisbursementQueue and DisbursementCaseFile to use these and display backend status (e.g. ready, processing, success, failed). Replace any simulation-only logic with real API calls when backend is ready.

**Files:** `src/services/adminService.js`, `src/pages/credit/DisbursementQueue.jsx`, `src/pages/credit/DisbursementCaseFile.jsx`, `src/pages/credit/CreditDashboard.jsx`.

---

## 8. Active loans and loan detail

**Requirement:** List and detail come from backend loans API; filters use backend status and metadata.

**Spec endpoints:**  
- `GET /api/admin/loans` – list (filters: status, owner, date range, overdue flag)  
- `GET /api/admin/loans/:id` – detail (summary, schedule, repayments, wallet refs)

**Current:** Active Loans and Loan Detail may be using the same `getAllLoans()` / `getLoanById()` as applications, or a mix of application and loan concepts.

**Action:** Introduce `adminService.getLoans(filters)` and `adminService.getLoanById(loanId)` that call `/api/admin/loans` and `/api/admin/loans/:id` when the backend exposes them. Use these on Active Loans and Loan Detail pages. Keep application endpoints for application-detail flow; use loan endpoints for post-disbursement loan lifecycle.

**Files:** `src/services/adminService.js`, `src/pages/admin/ActiveLoans.jsx`, `src/pages/admin/LoanDetail.jsx`.

---

## 9. Repayments

**Requirement:** Record repayments via API; display repayment history from API.

**Spec endpoints:**  
- `POST /api/admin/repayments` – body: loanId, amount, paymentChannel, paymentReference, paidAt?, payerType?, payerName?  
- `GET /api/admin/repayments?loanId=:loanId` – list for a loan

**Current:** Repayment recording and wallet updates are done in `adminService.recordPayment()` against local storage. Repayments page uses `getWalletTransactions()` and `getWalletBalance()` (local).

**Action:** Add `adminService.recordRepayment(payload)` and `adminService.getRepaymentsByLoan(loanId)` calling the spec endpoints. Repayments page and any “record payment” UI should call `recordRepayment` and then refresh loan/repayment data from API. Replace local wallet balance/transaction reads with org wallet endpoints when available.

**Files:** `src/services/adminService.js`, `src/pages/admin/Repayments.jsx`, `src/pages/admin/LoanDetail.jsx`.

---

## 10. Recovery workbench

**Requirement:** Recovery queue and case updates use dedicated recovery endpoints.

**Spec endpoints:**  
- `GET /api/admin/recovery-cases` – list (filters: status, officer, overdue age, promise date)  
- `PATCH /api/admin/recovery-cases/:id` – body: status?, recoveryNote?, promiseToPayDate?

**Current:** `adminService.addRecoveryNote(loanId, note)` and Recovery Workbench use local storage and loan-centric data.

**Action:** Add `getRecoveryCases(filters)` and `updateRecoveryCase(id, payload)` calling the spec endpoints. Recovery Workbench should load the list from `getRecoveryCases()` and update notes/status/promise-to-pay via `updateRecoveryCase()`. When backend is not ready, keep current behavior behind a flag or document as Phase 4.

**Files:** `src/services/adminService.js`, `src/pages/admin/RecoveryWorkbench.jsx`.

---

## 11. Organization wallet

**Requirement:** Org wallet summary and transaction history come from backend.

**Spec endpoints:**  
- `GET /api/admin/wallet/org` – summary (balance, today credits/debits, pending, recent refs)  
- `GET /api/admin/wallet/org/transactions` – list (type, status, date filters)

**Current:** `getWallets()`, `getWalletOverview()`, `getWalletTransactions()` return empty arrays or local storage data.

**Action:** Implement `getOrgWalletSummary()` and `getOrgWalletTransactions(filters)` that call the spec endpoints. Use them on the Org Wallet / Repayments page (and any super-admin finance view). Remove or bypass local wallet balance updates for production.

**Files:** `src/services/adminService.js`, `src/pages/admin/OrganizationWallets.jsx`, `src/pages/admin/Repayments.jsx`.

---

## 12. Sales commission wallet

**Requirement:** Sales wallet summary, transactions, and withdrawals use backend.

**Spec endpoints:**  
- `GET /api/admin/wallet/sales/:userId` – summary (total earned, locked, available, withdrawn)  
- `GET /api/admin/wallet/sales/:userId/transactions` – list  
- `POST /api/admin/wallet/sales/:userId/withdraw` – body: amount

**Current:** `commissionService.getWalletAggregates(username)` and related commission logic use local storage. Sales dashboard shows commission from this.

**Action:** Add `getSalesWalletSummary(userId)`, `getSalesWalletTransactions(userId)`, and `withdrawSalesCommission(userId, amount)` in adminService calling the spec endpoints. Sales dashboard and any “withdraw” UI should use these. When backend is ready, replace or backfill from `commissionService` with API data.

**Files:** `src/services/adminService.js`, `src/services/commissionService.js`, `src/components/admin/Dashboard/SalesDashboardView.jsx`.

---

## 13. Notifications and settings

**Requirement:** In-app notifications and system settings (rules config) come from API.

**Spec endpoints:**  
- `GET /api/notifications` – current user notifications  
- `PATCH /api/notifications/:id/read`  
- `GET /api/admin/settings` – rules config  
- `PATCH /api/admin/settings` – update (restricted roles)

**Current:** Notifications and Rules Config may be local or stubbed.

**Action:** Add notification fetch and mark-read API calls; add settings get/patch for admin. Wire NotificationCenter and RulesConfig page to these endpoints. Use backend settings (interest %, commission %, grace period, etc.) where the UI displays or uses config.

**Files:** `src/services/adminService.js` (or a small notification/settings service), `src/components/NotificationCenter.jsx`, `src/pages/admin/RulesConfig.jsx`.

---

## 14. Frontend rules (from spec)

- **Backend is authoritative** for status transitions, balances, commissions, and permissions. Frontend must not override or invent final values.
- **Display values** (amounts, dates, statuses) must come from backend responses; frontend may only preview or mirror them.
- **Role-based access** must be enforced server-side; frontend only mirrors for UX (routes and menu visibility).
- **New endpoints** should be documented (e.g. in SYSTEM_IMPLEMENTATION.md) before frontend integrates them.

---

## 15. Phased rollout (frontend side)

- **Phase 1:** Application + sales + admin review – wire Apply, Application list/detail, SalesDataCollection, DecisionPanel to backend; align statuses and roles.
- **Phase 2:** Disbursement + loans – wire Disbursement Queue and Case File, Active Loans, Loan Detail to backend loans and disbursement APIs.
- **Phase 3:** Repayment + wallets – wire Repayments, Org Wallet, Sales Wallet to backend repayment and wallet APIs.
- **Phase 4:** Recovery + analytics – wire Recovery Workbench and any reporting to backend recovery and analytics APIs.

Use this checklist to track which endpoints and pages are already backend-driven and which still need to be implemented or switched from mock to API.
