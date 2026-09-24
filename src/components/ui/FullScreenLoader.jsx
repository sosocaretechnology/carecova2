import logo from '../../assets/logo.png'

/**
 * Content-area loader — fills the main content region without covering
 * the sidebar or topbar. Uses a flex layout to centre the spinner.
 */
export default function FullScreenLoader({ label = 'Loading…', subtitle }) {
  return (
    <div className="cc-content-loader">
      <img src={logo} alt="CareCova" className="cc-content-loader-logo" />
      {label && <p className="cc-content-loader-label">{label}</p>}
      {subtitle && <p className="cc-content-loader-sub">{subtitle}</p>}
    </div>
  )
}
