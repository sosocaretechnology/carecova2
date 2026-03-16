import logo from '../../assets/logo.png'

export default function FullScreenLoader({ label = 'Loading CareCova…' }) {
  return (
    <div className="fullscreen-loader">
      <div className="fullscreen-loader-inner">
        <div className="fullscreen-loader-logo-wrap">
          <img src={logo} alt="CareCova" className="fullscreen-loader-logo" />
        </div>
        {label && <p className="fullscreen-loader-text">{label}</p>}
      </div>
    </div>
  )
}

