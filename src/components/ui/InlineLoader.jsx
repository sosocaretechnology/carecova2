import logo from '../../assets/logo.png'

export default function InlineLoader({ label, subtitle }) {
  return (
    <div className="inline-loader">
      <div className="inline-loader-logo-wrap">
        <img src={logo} alt="CareCova" className="inline-loader-logo" />
      </div>
      <div className="inline-loader-text">
        <div className="inline-loader-label">{label}</div>
        {subtitle && <div className="inline-loader-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

