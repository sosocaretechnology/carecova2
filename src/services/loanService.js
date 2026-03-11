import { mockApplications } from '../data/mockApplications'
import { computeRiskScore } from '../utils/riskScoring'
import { customerAuthService } from './customerAuthService'

const STORAGE_KEY = 'carecova_loans'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''
const USE_BACKEND = !!API_BASE_URL

const TENOR_TO_MONTHS = { '1': 1, '2': 2, '3-4': 4, '6': 6 }

const getLoans = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    let loans = stored ? JSON.parse(stored) : initializeLoans()
    // Ensure demo overdue loan exists for customer care/sales follow-up simulation
    if (!loans.some((l) => l.id === 'LN-100011')) {
      const demo = mockApplications.find((m) => m.id === 'LN-100011')
      if (demo) {
        loans = [...loans, JSON.parse(JSON.stringify(demo))]
        saveLoans(loans)
      }
    }
    // Ensure presentation demo customer exists (Track with ID "LN-DEMO")
    if (!loans.some((l) => l.id === 'LN-DEMO')) {
      const presentationDemo = mockApplications.find((m) => m.id === 'LN-DEMO')
      if (presentationDemo) {
        loans = [...loans, JSON.parse(JSON.stringify(presentationDemo))]
        saveLoans(loans)
      }
    }
    return loans
  } catch (error) {
    console.error('Error reading loans from localStorage:', error)
    return []
  }
}

const saveLoans = (loans) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans))
  } catch (error) {
    console.error('Error saving loans to localStorage:', error)
  }
}

const upsertLoan = (loan) => {
  const loans = getLoans()
  const index = loans.findIndex((item) => item.id === loan.id)
  if (index >= 0) loans[index] = { ...loans[index], ...loan }
  else loans.push(loan)
  saveLoans(loans)
  return loan
}

const findLocalLoan = (id) => getLoans().find((loan) => loan.id === id)

function generateLoanId() {
  const n = Math.floor(Date.now() / 1000) % 1000000
  return `LN-${String(n).padStart(6, '0')}`
}

function preferredDurationMonths(data) {
  if (data.preferredDuration != null) return parseInt(data.preferredDuration, 10)
  const tenor = data.preferredTenor
  return tenor && TENOR_TO_MONTHS[tenor] != null ? TENOR_TO_MONTHS[tenor] : 6
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value
      .map(cleanObject)
      .filter((item) => item !== undefined)
  }

  if (value && typeof value === 'object') {
    const output = {}
    Object.entries(value).forEach(([key, val]) => {
      const cleaned = cleanObject(val)
      if (cleaned !== undefined) output[key] = cleaned
    })
    return Object.keys(output).length ? output : undefined
  }

  if (value === undefined) return undefined
  return value
}

function normalizeDocument(file) {
  if (!file || typeof file !== 'object') return null

  const normalized = cleanObject({
    fileName: file.fileName,
    fileSize: toNumber(file.fileSize),
    mimeType: file.mimeType,
    url: file.url,
    storageKey: file.storageKey,
  })

  return normalized || null
}

function buildApiPayload(data) {
  const name = (data.fullName || data.patientName || '').trim()
  const requestedAmount = toNumber(data.requestedAmount ?? data.estimatedCost)
  const preferredDuration = preferredDurationMonths(data)

  const location = data.location || {}
  const gps = location.gps || {}

  const addGuarantor = data.addGuarantor === true || data.addGuarantor === 'yes'
  const hasActiveLoans = data.hasActiveLoans === true || data.hasActiveLoans === 'yes'

  const coBorrower = data.coBorrower || (
    data.addCoBorrower === true || data.addCoBorrower === 'yes'
      ? {
          name: data.coBorrowerName,
          phone: data.coBorrowerPhone,
          relationship: data.coBorrowerRelationship,
          employmentSector: data.coBorrowerEmploymentSector,
          employerName: data.coBorrowerEmployerName,
          monthlyIncome: data.coBorrowerMonthlyIncome,
        }
      : undefined
  )

  const payload = {
    fullName: name,
    patientName: data.patientName || name,
    phone: data.phone,
    email: data.email,

    state: data.state,
    lga: data.lga,
    city: data.city,
    homeAddress: data.homeAddress,
    landmark: data.landmark,
    gpsLat: toNumber(data.gpsLat),
    gpsLng: toNumber(data.gpsLng),
    preferredContact: data.preferredContact || 'call',

    treatmentCategory: data.treatmentCategory,
    procedureOrService: data.procedureOrService,
    healthDescription: data.healthDescription,
    urgency: data.urgency,
    hospitalPreference: data.hospitalPreference,
    hospitalName: data.hospitalName,
    hospitalAddress: data.hospitalAddress,

    employmentType: data.employmentType,
    employmentSector: data.employmentSector,
    employerName: data.employerName,
    jobTitle: data.jobTitle,
    salaryFrequency: data.salaryFrequency,
    monthlyIncome: toNumber(data.monthlyIncome) ?? data.monthlyIncome,
    monthlyIncomeRange: data.monthlyIncomeRange,
    monthlyExpenses: toNumber(data.monthlyExpenses) ?? data.monthlyExpenses,
    requestedAmount,
    estimatedCost: requestedAmount,
    preferredTenor: data.preferredTenor,
    preferredDuration,

    repaymentMethod: data.repaymentMethod,
    repaymentBankName: data.repaymentBankName,
    repaymentAccountNumber: data.repaymentAccountNumber,

    hasActiveLoans,
    activeLoansMonthlyRepayment: toNumber(data.activeLoansMonthlyRepayment) ?? data.activeLoansMonthlyRepayment,
    lenderType: data.lenderType,

    addGuarantor,
    guarantorName: data.guarantorName ?? data.coBorrowerName,
    guarantorPhone: data.guarantorPhone ?? data.coBorrowerPhone,
    guarantorRelationship: data.guarantorRelationship ?? data.coBorrowerRelationship,
    guarantorAddress: data.guarantorAddress,
    guarantorEmploymentType: data.guarantorEmploymentType ?? data.coBorrowerEmploymentSector,

    coBorrower,

    documents: {
      treatment_estimate: normalizeDocument(data.documents?.treatment_estimate),
      id_document: normalizeDocument(data.documents?.id_document),
      payslip: normalizeDocument(data.documents?.payslip),
    },

    consentDataProcessing: !!data.consentDataProcessing,
    consentTerms: !!data.consentTerms,
    consentMarketing: !!data.consentMarketing,

    location: {
      state: location.state ?? data.state,
      lga: location.lga ?? data.lga,
      city: location.city ?? data.city,
      address: location.address ?? data.homeAddress,
      gpsLat: toNumber(location.gpsLat ?? gps.lat),
      gpsLng: toNumber(location.gpsLng ?? gps.lng),
    },

    hospital: {
      name: data.hospital?.name ?? data.hospitalName,
      address: data.hospital?.address ?? data.hospitalAddress,
      isPartnerSuggested: data.hospital?.isPartnerSuggested ?? data.isPartnerSuggested,
      suggestedHospitalId: data.hospital?.suggestedHospitalId ?? data.suggestedHospitalId,
    },

    internalRiskMetrics: data.internalRiskMetrics,
  }

  return cleanObject(payload)
}

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (isJson && (Array.isArray(body?.message) ? body.message.join(', ') : body?.message)) ||
      (typeof body === 'string' ? body : 'Request failed')
    throw new Error(message)
  }

  return body
}

function normalizeLoan(data) {
  if (!data) return data

  const normalized = {
    ...data,
    id: data.id || data._id,
    patientName: data.patientName || data.fullName,
    hospital:
      data.hospital ||
      data.hospitalName ||
      data.hospitalDetails?.name ||
      '—',
    estimatedCost: toNumber(data.estimatedCost ?? data.requestedAmount) || 0,
    requestedAmount: toNumber(data.requestedAmount ?? data.estimatedCost) || 0,
    preferredDuration:
      data.preferredDuration ??
      (data.preferredTenor ? TENOR_TO_MONTHS[data.preferredTenor] : undefined),
    status: data.status || 'pending',
  }

  return normalized
}

function validateApplicationData(applicationData) {
  const name = applicationData.fullName || applicationData.patientName
  const phone = applicationData.phone
  const requestedAmount = parseFloat(applicationData.requestedAmount || applicationData.estimatedCost)
  if (!name || !phone || !applicationData.state || !applicationData.lga || !applicationData.city || !applicationData.homeAddress || !applicationData.preferredContact) {
    throw new Error('Applicant and location fields are required')
  }
  if (!applicationData.treatmentCategory || !applicationData.healthDescription || !applicationData.urgency || !applicationData.hospitalPreference) {
    throw new Error('Treatment information is required')
  }
  if (applicationData.hospitalPreference === 'have_hospital' && !(applicationData.hospitalName || '').trim()) {
    throw new Error('Hospital name is required when you have a hospital')
  }
  if (!applicationData.employmentType || !(applicationData.monthlyIncome ?? applicationData.monthlyIncomeRange) || !requestedAmount || (!applicationData.preferredTenor && applicationData.preferredDuration == null) || !applicationData.repaymentMethod) {
    throw new Error('Financial information is required')
  }
  if (applicationData.hasActiveLoans === true || applicationData.hasActiveLoans === 'yes') {
    if (applicationData.activeLoansMonthlyRepayment == null || !(applicationData.lenderType || '').trim()) {
      throw new Error('Active loans details are required when you have active loans')
    }
  }
  if (applicationData.addGuarantor === true || applicationData.addGuarantor === 'yes') {
    if (!(applicationData.guarantorName || '').trim() || !(applicationData.guarantorPhone || '').trim() || !(applicationData.guarantorRelationship || '').trim()) {
      throw new Error('Guarantor details are required when adding a guarantor')
    }
  }
  if (!applicationData.consentDataProcessing || !applicationData.consentTerms) {
    throw new Error('Consent is required')
  }
}

export const loanService = {
  submitApplication: async (applicationData) => {
    validateApplicationData(applicationData)
    const name = applicationData.fullName || applicationData.patientName

    if (USE_BACKEND) {
      try {
        const payload = buildApiPayload(applicationData)
        const created = await request('/loan-applications', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        const normalized = normalizeLoan(created)
        if (!normalized.id) normalized.id = created?.data?.id ?? created?.id ?? created?._id ?? generateLoanId()
        const customer = customerAuthService.findOrCreateCustomer(
          applicationData.phone,
          applicationData.email,
          applicationData.fullName || name
        )
        normalized.customerId = customer.id
        upsertLoan(normalized)
        return normalized
      } catch (err) {
        throw err
      }
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const requestedAmount = parseFloat(applicationData.requestedAmount || applicationData.estimatedCost)
          const preferredDuration = preferredDurationMonths(applicationData)
          const payload = { ...applicationData, patientName: name, estimatedCost: requestedAmount, preferredDuration }
          const risk = computeRiskScore(payload)

          const newLoan = {
            id: generateLoanId(),
            patientName: name,
            fullName: applicationData.fullName || name,
            phone: applicationData.phone,
            email: applicationData.email || '',
            state: applicationData.state,
            lga: applicationData.lga,
            city: applicationData.city,
            homeAddress: applicationData.homeAddress,
            landmark: applicationData.landmark || '',
            gpsLat: applicationData.gpsLat,
            gpsLng: applicationData.gpsLng,
            preferredContact: applicationData.preferredContact,
            treatmentCategory: applicationData.treatmentCategory,
            procedureOrService: applicationData.procedureOrService || '',
            healthDescription: applicationData.healthDescription,
            urgency: applicationData.urgency,
            hospitalPreference: applicationData.hospitalPreference,
            hospitalName: applicationData.hospitalName || '',
            hospitalAddress: applicationData.hospitalAddress || '',
            hospital: applicationData.hospitalPreference === 'have_hospital' ? (applicationData.hospitalName || '') : 'Any partner near me',
            employmentType: applicationData.employmentType,
            employmentSector: applicationData.employmentSector || '',
            employerName: applicationData.employerName || '',
            jobTitle: applicationData.jobTitle || '',
            monthlyIncome: applicationData.monthlyIncome,
            monthlyIncomeRange: applicationData.monthlyIncomeRange,
            monthlyExpenses: applicationData.monthlyExpenses,
            requestedAmount,
            estimatedCost: requestedAmount,
            preferredTenor: applicationData.preferredTenor,
            preferredDuration,
            repaymentMethod: applicationData.repaymentMethod,
            hasActiveLoans: applicationData.hasActiveLoans,
            activeLoansMonthlyRepayment: applicationData.activeLoansMonthlyRepayment,
            lenderType: applicationData.lenderType,
            addGuarantor: applicationData.addGuarantor,
            guarantorName: applicationData.guarantorName,
            guarantorPhone: applicationData.guarantorPhone,
            guarantorRelationship: applicationData.guarantorRelationship,
            guarantorAddress: applicationData.guarantorAddress,
            guarantorEmploymentType: applicationData.guarantorEmploymentType,
            applicantPhoto: applicationData.applicantPhoto || null,
            riskScore: risk.riskScore,
            riskTier: risk.riskTier,
            riskReasons: risk.riskReasons,
            riskRecommendation: risk.riskRecommendation,
            status: 'pending',
            stage: 1,
            assignedTo: null,
            submittedAt: new Date().toISOString(),
            documents: applicationData.documents || {},
            medicalInsights: null,
            financialClarification: null,
            repaymentStrategy: null,
            applicantBio: null,
          }
          const customer = customerAuthService.findOrCreateCustomer(
            applicationData.phone,
            applicationData.email,
            applicationData.fullName || name
          )
          newLoan.customerId = customer.id
          const loans = getLoans()
          loans.push(newLoan)
          saveLoans(loans)
          resolve(newLoan)
        } catch (error) {
          reject(error)
        }
      }, 500)
    })
  },

  getApplication: async (id) => {
    if (!id?.trim()) throw new Error('Application not found')

    const localLoan = findLocalLoan(id.trim())

    if (USE_BACKEND) {
      try {
        const remote = await request(`/loan-applications/${id.trim()}`)
        const normalizedRemote = normalizeLoan(remote)
        const merged = localLoan
          ? {
              ...normalizedRemote,
              offerAcceptedAt: localLoan.offerAcceptedAt,
              repaymentSchedule: localLoan.repaymentSchedule || normalizedRemote.repaymentSchedule,
              totalRepayment: localLoan.totalRepayment || normalizedRemote.totalRepayment,
              monthlyInstallment: localLoan.monthlyInstallment || normalizedRemote.monthlyInstallment,
              outstandingBalance: localLoan.outstandingBalance || normalizedRemote.outstandingBalance,
              totalPaid: localLoan.totalPaid || normalizedRemote.totalPaid,
            }
          : normalizedRemote
        upsertLoan(merged)
        return merged
      } catch (error) {
        if (localLoan) return localLoan
        throw error
      }
    }

    if (!localLoan) throw new Error('Application not found')
    return localLoan
  },

  getAllApplications: async () => {
    return getLoans()
  },

  acceptOffer: async (loanId, otp) => {
    const loan = await loanService.getApplication(loanId)

    if (!loan) {
      throw new Error('Application not found')
    }
    if (loan.status !== 'approved') {
      throw new Error('No offer available for this application')
    }

    const MOCK_OTP = '123456'
    if (otp !== MOCK_OTP) {
      throw new Error('Invalid OTP. For demo use 123456.')
    }

    const updated = {
      ...loan,
      offerAcceptedAt: new Date().toISOString(),
    }
    upsertLoan(updated)
    return updated
  },

  getLoansByCustomerId: async (customerId, customerPhone) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const loans = getLoans()
        const norm = (p) => (p || '').replace(/\D/g, '').slice(-10)
        const match = (loan) =>
          loan.customerId === customerId ||
          (customerPhone && norm(loan.phone) === norm(customerPhone))
        resolve(loans.filter(match))
      }, 300)
    })
  },
}
