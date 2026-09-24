import logo from '../../assets/logo.png'

/**
 * Section-level loader — sits inline within content, does not block the page.
 */
export default function InlineLoader({ label = 'Loading…', subtitle }) {
  return (
    <div className="cc-inline-loader">
      <img src={logo} alt="CareCova" className="cc-inline-loader-logo" />
      <div>
        <div className="cc-inline-loader-text">{label}</div>
        {subtitle && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
