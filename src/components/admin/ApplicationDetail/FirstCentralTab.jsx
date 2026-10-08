import { useCallback, useEffect, useState } from 'react'
import { firstCentralService } from '../../../services/firstCentralService'
import FirstCentralCard from './FirstCentralCard'
import FirstCentralReportViewer from '../FirstCentralReportViewer'

export default function FirstCentralTab({ loan, onUpdated }) {
  const [savedReport, setSavedReport] = useState(null)
  const [loadingReport, setLoadingReport] = useState(true)
  const [reportError, setReportError] = useState('')

  const reloadReport = useCallback(async () => {
    if (!loan?.id) return
    try {
      setReportError('')
      const data = await firstCentralService.getSavedReport(loan.id)
      setSavedReport(data)
    } catch (error) {
      setReportError(error.message || 'Unable to load the saved FirstCentral report.')
    } finally {
      setLoadingReport(false)
    }
  }, [loan?.id])

  useEffect(() => {
    setLoadingReport(true)
    reloadReport()
  }, [reloadReport])

  const handleUpdated = () => {
    reloadReport()
    onUpdated?.()
  }

  return (
    <div className="cc-main-sections">
      <FirstCentralCard
        loan={loan}
        storedResult={savedReport?.summary || loan.firstCentralResult}
        storedCheckedAt={savedReport?.checkedAt || loan.firstCentralCheckedAt}
        onUpdated={handleUpdated}
      />

      {loadingReport && <div className="detail-card" style={{ color: '#64748b' }}>Loading the saved detailed bureau response…</div>}
      {reportError && <div className="alert-box alert-error">{reportError}</div>}
      {!loadingReport && !reportError && (
        <FirstCentralReportViewer
          report={savedReport?.report}
          summary={savedReport?.summary || loan.firstCentralResult}
          checkedAt={savedReport?.checkedAt || loan.firstCentralCheckedAt}
          applicationLabel={loan.applicationCode || loan.id}
        />
      )}
    </div>
  )
}
