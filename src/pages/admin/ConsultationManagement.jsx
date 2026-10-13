import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Mail, Phone, RefreshCw, Search } from 'lucide-react'
import { adminService } from '../../services/adminService'
import './ConsultationManagement.css'

const PAGE_SIZE = 20
const STATUS_LABELS = {
  pending_confirmation: 'Pending confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  reschedule_requested: 'Reschedule requested',
}
const TRANSITIONS = {
  pending_confirmation: ['confirmed', 'reschedule_requested', 'cancelled'],
  confirmed: ['completed', 'reschedule_requested', 'cancelled'],
  reschedule_requested: ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
}

function toLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function formatDate(value, withTime = true) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  })
}

export default function ConsultationManagement() {
  const referenceFromUrl = useRef(new URLSearchParams(window.location.search).get('reference') || '')
  const initialReference = useRef(referenceFromUrl.current)
  const [searchInput, setSearchInput] = useState(referenceFromUrl.current)
  const [search, setSearch] = useState(referenceFromUrl.current)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [appointmentAt, setAppointmentAt] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const initialSelectionDone = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    adminService.getConsultationBookings({ status: statusFilter, search, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return
        const items = Array.isArray(data?.items) ? data.items : []
        setResult({ items, total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) })
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Consultation requests could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [statusFilter, search, page])

  useEffect(() => {
    const match = initialReference.current && result.items.find((item) => item.bookingReference === initialReference.current)
    if (!initialSelectionDone.current && match) {
      initialSelectionDone.current = true
      openBooking(match.id)
    }
  }, [result.items])

  const availableTransitions = useMemo(() => TRANSITIONS[selected?.status] || [], [selected?.status])
  const minimumAppointment = toLocalDateTime(new Date())

  const openBooking = async (id) => {
    setSelectedId(id)
    setSelected(null)
    setDetailLoading(true)
    setDetailError('')
    setSaveError('')
    setSaveMessage('')
    try {
      const booking = await adminService.getConsultationBooking(id)
      setSelected(booking)
      setNextStatus(booking.status)
      setAppointmentAt(toLocalDateTime(booking.appointmentAt || booking.preferredAt))
      setNote('')
    } catch (requestError) {
      setDetailError(requestError.message || 'Request details could not be loaded.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (!selected || saving) return
    setSaveError('')
    setSaveMessage('')
    if (nextStatus === 'confirmed' && !appointmentAt) {
      setSaveError('Set the agreed appointment date and time before confirming.')
      return
    }
    setSaving(true)
    try {
      const updated = await adminService.updateConsultationBooking(selected.id, {
        status: nextStatus || selected.status,
        ...(nextStatus === 'confirmed' && appointmentAt ? { appointmentAt: new Date(appointmentAt).toISOString() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      setSelected(updated)
      setNextStatus(updated.status)
      setAppointmentAt(toLocalDateTime(updated.appointmentAt))
      setNote('')
      setSaveMessage('Consultation request updated.')
      const freshList = await adminService.getConsultationBookings({ status: statusFilter, search, page, limit: PAGE_SIZE })
      setResult({
        items: Array.isArray(freshList?.items) ? freshList.items : [],
        total: Number(freshList?.total || 0),
        totalPages: Number(freshList?.totalPages || 1),
      })
    } catch (requestError) {
      setSaveError(requestError.message || 'The request could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page consultation-admin-page">
      <div className="consultation-admin-heading">
        <div>
          <p className="cc-eyebrow">Care coordination</p>
          <h1>Consultation requests</h1>
          <p>Review free consultation requests and confirm agreed appointment details.</p>
        </div>
        <button className="cc-button cc-button-secondary" type="button" onClick={() => window.location.reload()} aria-label="Refresh consultation requests">
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </div>

      <div className="consultation-admin-toolbar">
        <form className="consultation-admin-search" onSubmit={handleSearch} role="search">
          <label className="consultation-sr-only" htmlFor="consultation-admin-search">Search consultation requests</label>
          <Search size={17} aria-hidden="true" />
          <input id="consultation-admin-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search facility or request reference" />
          <button type="submit">Search</button>
        </form>
        <label className="consultation-admin-filter">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}>
            <option value="">All requests</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="consultation-admin-alert" role="alert">{error}</div>}

      <div className="consultation-admin-grid">
        <section className="consultation-admin-list" aria-label="Consultation request list">
          <div className="consultation-admin-list-head"><strong>{result.total} request{result.total === 1 ? '' : 's'}</strong><span>Newest first</span></div>
          {loading ? (
            <div className="consultation-admin-empty" role="status" aria-live="polite">Loading requests…</div>
          ) : result.items.length ? (
            <div className="consultation-admin-rows">
              {result.items.map((booking) => (
                <button key={booking.id} type="button" className={`consultation-admin-row${selectedId === booking.id ? ' is-selected' : ''}`} onClick={() => openBooking(booking.id)} aria-current={selectedId === booking.id ? 'true' : undefined}>
                  <span className="consultation-admin-row-top"><strong>{booking.fullName}</strong><span className={`consultation-status consultation-status-${booking.status}`}>{STATUS_LABELS[booking.status] || booking.status}</span></span>
                  <span className="consultation-admin-row-facility">{booking.facilityName}</span>
                  <span className="consultation-admin-row-bottom"><span>{booking.bookingReference}</span><span>{formatDate(booking.createdAt, false)}</span></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="consultation-admin-empty">No consultation requests match these filters.</div>
          )}
          <div className="consultation-admin-pagination">
            <span>Page {page} of {result.totalPages}</span>
            <div>
              <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={17} /></button>
              <button type="button" aria-label="Next page" disabled={page >= result.totalPages || loading} onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))}><ChevronRight size={17} /></button>
            </div>
          </div>
        </section>

        <section className="consultation-admin-detail" aria-label="Selected consultation request" aria-live="polite">
          {detailLoading ? (
            <div className="consultation-admin-empty" role="status">Loading request details…</div>
          ) : detailError ? (
            <div className="consultation-admin-alert" role="alert">{detailError}</div>
          ) : selected ? (
            <>
              <div className="consultation-detail-header">
                <div><span className={`consultation-status consultation-status-${selected.status}`}>{STATUS_LABELS[selected.status] || selected.status}</span><h2>{selected.fullName}</h2><p>{selected.bookingReference}</p></div>
                <span className="consultation-detail-price">Free · {selected.durationMinutes} min</span>
              </div>
              <div className="consultation-detail-contact">
                <a href={`tel:${selected.phone}`}><Phone size={16} aria-hidden="true" />{selected.phone}</a>
                <a href={`mailto:${selected.email}`}><Mail size={16} aria-hidden="true" />{selected.email}</a>
              </div>
              <dl className="consultation-detail-facts">
                <div><dt>Partner facility</dt><dd>{selected.facilityName}{selected.facilityAddress ? ` · ${selected.facilityAddress}` : ''}</dd></div>
                <div><dt>Submitted</dt><dd>{formatDate(selected.createdAt)}</dd></div>
                <div><dt>Preferred time</dt><dd>{formatDate(selected.preferredAt)}</dd></div>
                <div><dt>Confirmed appointment</dt><dd>{formatDate(selected.appointmentAt)}</dd></div>
                <div><dt>Payment</dt><dd>{selected.pricing?.launchOffer ? 'Free during launch · no payment required' : 'Payment not required'}</dd></div>
              </dl>
              <div className="consultation-detail-section"><h3>Reason for consultation</h3><p>{selected.reason || 'Restricted to support and admin staff.'}</p></div>
              <div className="consultation-detail-section"><h3>Relevant medical history</h3><p>{selected.healthHistory || 'No history was shared or it is not available for your staff role.'}</p></div>

              <form className="consultation-admin-update" onSubmit={handleUpdate}>
                <h3>Update request</h3>
                <label>Status
                  <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} disabled={!availableTransitions.length}>
                    <option value={selected.status}>{STATUS_LABELS[selected.status]}</option>
                    {availableTransitions.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                  </select>
                </label>
                {nextStatus === 'confirmed' && (
                  <label>Agreed appointment date and time
                    <span className="consultation-appointment-input"><CalendarDays size={17} aria-hidden="true" /><input type="datetime-local" min={minimumAppointment} value={appointmentAt} onChange={(event) => setAppointmentAt(event.target.value)} required /></span>
                  </label>
                )}
                <label>Operational note <span className="consultation-admin-muted">Optional · do not add clinical details</span>
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} placeholder="Brief note about the contact or scheduling outcome" />
                </label>
                {saveError && <div className="consultation-admin-alert" role="alert">{saveError}</div>}
                {saveMessage && <div className="consultation-admin-success" role="status">{saveMessage}</div>}
                <button type="submit" className="cc-button cc-button-primary" disabled={saving || (!availableTransitions.length && !note.trim())}>{saving ? 'Saving…' : 'Save update'}</button>
              </form>

              <div className="consultation-detail-section consultation-history"><h3>Update history</h3>
                <ol>
                  {(selected.statusHistory || []).map((change, index) => (
                    <li key={`${change.status}-${change.changedAt}-${index}`}><strong>{STATUS_LABELS[change.status] || change.status}</strong><span>{formatDate(change.changedAt)}</span>{change.note && <p>{change.note}</p>}</li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <div className="consultation-admin-empty">Select a request to review its details.</div>
          )}
        </section>
      </div>
    </div>
  )
}
