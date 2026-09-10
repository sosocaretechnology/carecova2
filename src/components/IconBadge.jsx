/**
 * Flat on-color icon badge — wraps any icon in a solid colored rounded square.
 * Usage: <IconBadge color="green"><SomeIcon size={18} /></IconBadge>
 *
 * Colors: green | blue | violet | amber | red | orange | teal | cyan |
 *         indigo | rose | sky | slate | emerald | pink | lime
 * Sizes:  xs | sm | md | lg
 */
export default function IconBadge({ children, color = 'green', size = 'sm', className = '' }) {
  return (
    <span className={`icon-badge icon-badge--${color} icon-badge--${size}${className ? ' ' + className : ''}`}>
      {children}
    </span>
  )
}
