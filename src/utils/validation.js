export const validateEmail = (email) => {
  if (!email || !email.trim()) return ''
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Invalid email format'
  return ''
}

export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) return 'Phone number is required'
  const phoneRegex = /^[0-9\s\-+()]+$/
  if (!phoneRegex.test(phone)) return 'Invalid phone number format'
  if (phone.replace(/\D/g, '').length < 10) return 'Phone number must be at least 10 digits'
  return ''
}

export const validateRequired = (value, fieldName) => {
  if (!value || !value.toString().trim()) return `${fieldName} is required`
  return ''
}

export const validateAmount = (amount, min = 50000, max = 5000000) => {
  if (!amount) return 'Amount is required'
  const numAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ''))
  if (isNaN(numAmount)) return 'Please enter a valid amount'
  if (numAmount < min) return `Minimum is ₦${(min / 1000).toFixed(0)}k`
  if (numAmount > max) return `Maximum is ₦${(max / 1000000).toFixed(1)}M`
  return ''
}

export const validateStep = (step, formData) => {
  const errors = {}

  switch (step) {
    case 1: {
      const nameError = validateRequired(formData.fullName || formData.patientName, 'Full name')
      if (nameError) errors.fullName = nameError
      const phoneError = validatePhone(formData.phone)
      if (phoneError) errors.phone = phoneError
      if (!formData.email || !formData.email.trim()) {
        errors.email = 'Email is required'
      } else {
        const emailError = validateEmail(formData.email)
        if (emailError) errors.email = emailError
      }
      if (!formData.state || !formData.state.trim()) errors.state = 'State is required'
      if (!formData.lga || !formData.lga.trim()) errors.lga = 'LGA is required'
      if (!formData.city || !formData.city.trim()) errors.city = 'City/Town is required'
      if (!formData.homeAddress || !formData.homeAddress.trim()) errors.homeAddress = 'Home address is required'
      const hasIdDoc =
        formData.documents &&
        formData.documents.id_document &&
        (formData.documents.id_document.fileName || formData.documents.id_document.url)
      if (!hasIdDoc) errors.id_document = 'Government-issued ID is required'
      const bvn = String(formData.bvn || '').trim()
      if (!bvn) errors.bvn = 'BVN is required'
      else if (!/^\d{11}$/.test(bvn)) errors.bvn = 'BVN must be exactly 11 digits'
      break
    }

    case 2: {
      if (!formData.treatmentCategory || !formData.treatmentCategory.trim()) {
        errors.treatmentCategory = 'Treatment category is required'
      }
      if (!formData.healthDescription || !formData.healthDescription.trim()) {
        errors.healthDescription = 'Brief description of health challenge is required'
      }
      if (!formData.urgency || !formData.urgency.trim()) {
        errors.urgency = 'Urgency is required'
      }
      break
    }

    case 3: {
      if (!formData.employmentSector || !formData.employmentSector.trim()) {
        errors.employmentSector = 'Employment sector is required'
      }
      if (!formData.monthlyExpenses || (typeof formData.monthlyExpenses === 'string' && !formData.monthlyExpenses.trim())) {
        errors.monthlyExpenses = 'Monthly expenses is required'
      }
      const incomeVal = formData.monthlyIncome ?? formData.monthlyIncomeRange
      if (!incomeVal || (typeof incomeVal === 'string' && !incomeVal.trim())) {
        errors.monthlyIncome = 'Monthly income is required'
      }
      const amountError = validateAmount(formData.requestedAmount ?? formData.estimatedCost)
      if (amountError) errors.requestedAmount = amountError
      if (!formData.preferredTenor && formData.preferredDuration == null) {
        errors.preferredTenor = 'Preferred repayment tenor is required'
      }
      if (!formData.repaymentMethod || !formData.repaymentMethod.trim()) {
        errors.repaymentMethod = 'Repayment method is required'
      }
      if (!formData.repaymentBankName || !formData.repaymentBankName.trim()) {
        errors.repaymentBankName = 'Repayment bank name is required'
      }
      const acct = String(formData.repaymentAccountNumber || '').replace(/\D/g, '')
      if (!acct) {
        errors.repaymentAccountNumber = 'Repayment account number is required'
      } else if (acct.length !== 10) {
        errors.repaymentAccountNumber = 'Account number must be exactly 10 digits'
      }
      if (formData.hasActiveLoans === true || formData.hasActiveLoans === 'yes') {
        const repayVal = formData.activeLoansMonthlyRepayment
        if (repayVal == null || (typeof repayVal === 'string' && !repayVal.trim())) {
          errors.activeLoansMonthlyRepayment = 'Monthly repayment amount is required when you have active loans'
        }
        if (!formData.lenderType || !formData.lenderType.trim()) {
          errors.lenderType = 'Lender type is required when you have active loans'
        }
      }
      break
    }

    case 4: {
      // Guarantor is required by our financing partner (P2Vest)
      if (!formData.coBorrowerName || !formData.coBorrowerName.trim()) {
        errors.coBorrowerName = 'Guarantor name is required'
      }
      const cPhoneError = validatePhone(formData.coBorrowerPhone)
      if (cPhoneError) errors.coBorrowerPhone = cPhoneError
      if (!formData.coBorrowerEmail || !formData.coBorrowerEmail.trim()) {
        errors.coBorrowerEmail = 'Guarantor email is required'
      } else {
        const cEmailError = validateEmail(formData.coBorrowerEmail)
        if (cEmailError) errors.coBorrowerEmail = cEmailError
      }
      const cBvn = String(formData.coBorrowerBvn || '').trim()
      if (!cBvn) errors.coBorrowerBvn = 'Guarantor BVN is required'
      else if (!/^\d{11}$/.test(cBvn)) errors.coBorrowerBvn = 'BVN must be exactly 11 digits'
      if (!formData.coBorrowerRelationship || !formData.coBorrowerRelationship.trim()) {
        errors.coBorrowerRelationship = 'Relationship to guarantor is required'
      }
      break
    }

    case 5: {
      Object.assign(errors, validateStep(1, formData))
      Object.assign(errors, validateStep(2, formData))
      Object.assign(errors, validateStep(3, formData))
      Object.assign(errors, validateStep(4, formData))
      if (!formData.consentDataProcessing) {
        errors.consentDataProcessing = 'Data processing consent is required'
      }
      if (!formData.consentTerms) {
        errors.consentTerms = 'Terms and conditions acceptance is required'
      }
      break
    }

    default:
      break
  }

  return errors
}
