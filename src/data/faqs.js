export const faqs = [
  {
    id: 'missed-payment',
    category: 'repayment',
    question: 'What if I miss a payment?',
    answer: 'If you miss a payment, please contact us immediately. We understand that circumstances can change. We offer flexible payment arrangements and can help you reschedule your payment plan. Late fees may apply, but we work with you to find a solution that works.',
  },
  {
    id: 'job-impact',
    category: 'general',
    question: 'Will this affect my job?',
    answer: 'No, your loan application and repayment status are confidential. We do not contact your employer unless you explicitly authorize us to do so. Your employment information is only used for eligibility assessment and is kept strictly confidential.',
  },
  {
    id: 'cost-changes',
    category: 'application',
    question: 'What if treatment cost changes?',
    answer: 'If your treatment cost changes after approval, please contact us immediately. We can adjust your loan amount accordingly. If the cost increases, we may require additional documentation. If it decreases, we can reduce your loan amount and adjust your repayment schedule.',
  },
  {
    id: 'repayment-work',
    category: 'repayment',
    question: 'How does repayment work?',
    answer: 'Repayment is done in monthly installments over your chosen period (3, 6, or 12 months). Each month, you\'ll receive a reminder before your payment is due. You can pay via mobile wallet (OPay, Palmpay), bank transfer, or card payment. Payments are automatically recorded and reflected in your account.',
  },
  {
    id: 'cant-pay',
    category: 'repayment',
    question: 'What happens if I can\'t pay?',
    answer: 'If you\'re facing financial difficulties, please contact us as soon as possible. We offer hardship assistance programs and can work with you to adjust your payment plan. We believe in finding solutions that work for both parties. Early communication is key.',
  },
  {
    id: 'approval-time',
    category: 'application',
    question: 'How long does approval take?',
    answer: 'Most applications are reviewed within 24-48 hours. However, this can vary depending on the completeness of your application and the complexity of your case. You\'ll receive SMS and email notifications at each stage of the process.',
  },
  {
    id: 'eligibility',
    category: 'application',
    question: 'What makes me eligible?',
    answer: 'Eligibility is based on several factors including your employment status, the hospital you choose, and the treatment category. Generally, employed individuals, self-employed professionals, and business owners have higher eligibility amounts. Use our eligibility checker to see your estimated amount.',
  },
  {
    id: 'interest-rate',
    category: 'repayment',
    question: 'What is the interest rate?',
    answer: 'We charge a transparent monthly interest rate of 6%. This is clearly displayed in your loan calculator and repayment schedule. There are no hidden fees. The total amount you\'ll repay is calculated upfront and shown before you accept the loan.',
  },
  {
    id: 'early-payment',
    category: 'repayment',
    question: 'Can I pay early?',
    answer: 'Yes! You can make early payments or pay off your loan in full at any time. Early payments reduce your total interest. There are no penalties for early repayment. Simply use the "Make Payment" feature in your dashboard.',
  },
  {
    id: 'coverage',
    category: 'application',
    question: 'What procedures are covered?',
    answer: 'We cover elective, non-terminal medical procedures including IVF & Fertility treatments, Dental & Optical care, Wellness & Screening, and Cosmetic & Corrective procedures. We do not cover terminal illnesses, cash loans, non-medical expenses, or emergency procedures.',
  },
]

export const getFAQsByCategory = (category) => {
  if (!category) return faqs
  return faqs.filter((faq) => faq.category === category)
}

export const searchFAQs = (query) => {
  const lowerQuery = query.toLowerCase()
  return faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(lowerQuery) ||
      faq.answer.toLowerCase().includes(lowerQuery)
  )
}
