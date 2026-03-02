import { sampleLoans } from '../data/sampleLoans'
import { mockApplications } from '../data/mockApplications'
import { computeRiskScore } from '../utils/riskScoring'

const STORAGE_KEY = 'carecova_loans'

const TENOR_TO_MONTHS = { '1': 1, '2': 2, '3-4': 4, '6': 6 }

const initializeLoans = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleLoans))
    return sampleLoans
  }
  return JSON.parse(stored)
}

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
    return loans
  } catch (error) {
    console.error('Error reading loans from localStorage:', error)
    return initializeLoans()
  }
}

const saveLoans = (loans) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans))
  } catch (error) {
    console.error('Error saving loans to localStorage:', error)
  }
}

const generateLoanId = () => {
  const loans = getLoans()
  const lastId = loans.length > 0 ? loans[loans.length - 1].id : 'LN-100000'
  const lastNum = parseInt(lastId.split('-')[1])
  return `LN-${String(lastNum + 1).padStart(6, '0')}`
}

function preferredDurationMonths(data) {
  if (data.preferredDuration != null) return parseInt(data.preferredDuration, 10)
  const tenor = data.preferredTenor
  return tenor && TENOR_TO_MONTHS[tenor] != null ? TENOR_TO_MONTHS[tenor] : 6
}

export const loanService = {
  submitApplication: async (applicationData) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const name = applicationData.fullName || applicationData.patientName
          const phone = applicationData.phone
          const requestedAmount = parseFloat(applicationData.requestedAmount || applicationData.estimatedCost)
          if (!name || !phone || !applicationData.state || !applicationData.lga || !applicationData.city || !applicationData.homeAddress || !applicationData.preferredContact) {
            reject(new Error('Applicant and location fields are required'))
            return
          }
          if (!applicationData.treatmentCategory || !applicationData.healthDescription || !applicationData.urgency || !applicationData.hospitalPreference) {
            reject(new Error('Treatment information is required'))
            return
          }
          if (applicationData.hospitalPreference === 'have_hospital' && !(applicationData.hospitalName || '').trim()) {
            reject(new Error('Hospital name is required when you have a hospital'))
            return
          }
          if (!applicationData.employmentType || !(applicationData.monthlyIncome ?? applicationData.monthlyIncomeRange) || !requestedAmount || (!applicationData.preferredTenor && applicationData.preferredDuration == null) || !applicationData.repaymentMethod) {
            reject(new Error('Financial information is required'))
            return
          }
          if (applicationData.hasActiveLoans === true || applicationData.hasActiveLoans === 'yes') {
            if (applicationData.activeLoansMonthlyRepayment == null || !(applicationData.lenderType || '').trim()) {
              reject(new Error('Active loans details are required when you have active loans'))
              return
            }
          }
          if (applicationData.addGuarantor === true || applicationData.addGuarantor === 'yes') {
            if (!(applicationData.guarantorName || '').trim() || !(applicationData.guarantorPhone || '').trim() || !(applicationData.guarantorRelationship || '').trim()) {
              reject(new Error('Guarantor details are required when adding a guarantor'))
              return
            }
          }
          if (!applicationData.consentDataProcessing || !applicationData.consentTerms) {
            reject(new Error('Consent is required'))
            return
          }

          const preferredDuration = preferredDurationMonths(applicationData)
          const payload = {
            ...applicationData,
            patientName: name,
            estimatedCost: requestedAmount,
            preferredDuration,
          }
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
            stage: 1, // Start at stage 1
            assignedTo: null,
            submittedAt: new Date().toISOString(),
            documents: applicationData.documents || {},
            medicalInsights: null,
            financialClarification: null,
            repaymentStrategy: null,
            applicantBio: null,
          }

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
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const loans = getLoans()
        const loan = loans.find((l) => l.id === id)
        if (loan) {
          resolve(loan)
        } else {
          reject(new Error('Application not found'))
        }
      }, 300)
    })
  },

  getAllApplications: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getLoans())
      }, 300)
    })
  },

  acceptOffer: async (loanId, otp) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const loans = getLoans()
        const loan = loans.find((l) => l.id === loanId)
        if (!loan) {
          reject(new Error('Application not found'))
          return
        }
        if (loan.status !== 'approved') {
          reject(new Error('No offer available for this application'))
          return
        }
        const MOCK_OTP = '123456'
        if (otp !== MOCK_OTP) {
          reject(new Error('Invalid OTP. For demo use 123456.'))
          return
        }
        loan.offerAcceptedAt = new Date().toISOString()
        saveLoans(loans)
        resolve(loan)
      }, 300)
    })
  },
}
