import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  headerRight?: ReactNode;
}

/** Wraps the existing .card / .card-header CSS classes with a real header slot API. */
export function Card({ header, headerRight, children, className = '', ...props }: CardProps) {
  return (
    <div className={`card ${className}`.trim()} {...props}>
      {header && (
        <div className="card-header" style={headerRight ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } : undefined}>
          <span>{header}</span>
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}
