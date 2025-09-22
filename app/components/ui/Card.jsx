// components/ui/Card.jsx

/**
 * Card Component
 * Props:
 * - children: Card content
 * - title: Card title (optional)
 * - subtitle: Card subtitle (optional)
 * - className: additional CSS classes
 * - padding: 'sm', 'md', 'lg' (default: 'md')
 * - shadow: 'sm', 'md', 'lg', 'xl' (default: 'md')
 */

export default function Card({
  children,
  title,
  subtitle,
  className = '',
  padding = 'md',
  shadow = 'md',
  ...props
}) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const cardClasses = `
    bg-white rounded-lg border border-gray-200
    ${shadowClasses[shadow]} ${paddingClasses[padding]} ${className}
  `;

  return (
    <div className={cardClasses} {...props}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}