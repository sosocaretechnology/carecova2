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
      const nin = String(formData.nin || '').trim()
      if (!nin) errors.nin = 'NIN is required'
      else if (!/^\d{11}$/.test(nin)) errors.nin = 'NIN must be exactly 11 digits'
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
      // Guarantor is required
      if (!formData.guarantorName || !formData.guarantorName.trim()) {
        errors.guarantorName = 'Guarantor name is required'
      }
      const gPhoneError = validatePhone(formData.guarantorPhone)
      if (gPhoneError) errors.guarantorPhone = gPhoneError
      if (!formData.guarantorEmail || !formData.guarantorEmail.trim()) {
        errors.guarantorEmail = 'Guarantor email is required'
      } else {
        const gEmailError = validateEmail(formData.guarantorEmail)
        if (gEmailError) errors.guarantorEmail = gEmailError
      }
      const gBvn = String(formData.guarantorBvn || '').trim()
      if (!gBvn) errors.guarantorBvn = 'Guarantor BVN is required'
      else if (!/^\d{11}$/.test(gBvn)) errors.guarantorBvn = 'BVN must be exactly 11 digits'
      if (!formData.guarantorRelationship || !formData.guarantorRelationship.trim()) {
        errors.guarantorRelationship = 'Relationship to guarantor is required'
      }
      // Validate each co-borrower if any
      ;(formData.coBorrowers || []).forEach((cb, i) => {
        if (!cb.name || !cb.name.trim()) errors[`coBorrower_${i}_name`] = 'Name is required'
        const cbPhone = validatePhone(cb.phone)
        if (cbPhone) errors[`coBorrower_${i}_phone`] = cbPhone
        if (!cb.email || !cb.email.trim()) {
          errors[`coBorrower_${i}_email`] = 'Email is required'
        } else {
          const cbEmail = validateEmail(cb.email)
          if (cbEmail) errors[`coBorrower_${i}_email`] = cbEmail
        }
        const cbBvn = String(cb.bvn || '').trim()
        if (!cbBvn) errors[`coBorrower_${i}_bvn`] = 'BVN is required'
        else if (!/^\d{11}$/.test(cbBvn)) errors[`coBorrower_${i}_bvn`] = 'BVN must be exactly 11 digits'
        if (!cb.relationship || !cb.relationship.trim()) errors[`coBorrower_${i}_relationship`] = 'Relationship is required'
      })
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
