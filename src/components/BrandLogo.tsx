import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  href?: string;
  variant?: 'autovideo' | 'autora';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  href = '/',
  variant = 'autora',
  showText = true,
  size = 'md',
  className = '',
  style = {},
}) => {
  const iconDimensions = {
    sm: { box: 28, svg: 16, radius: 6 },
    md: { box: 36, svg: 22, radius: 8 },
    lg: { box: 44, svg: 26, radius: 10 },
  }[size];

  const fontSizes = {
    sm: '1rem',
    md: '1.25rem',
    lg: '1.5rem',
  }[size];

  return (
    <Link
      href={href}
      className={`brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '8px' : '10px',
        textDecoration: 'none',
        ...style,
      }}
    >
      <div
        className="logo-icon"
        style={{
          width: `${iconDimensions.box}px`,
          height: `${iconDimensions.box}px`,
          borderRadius: `${iconDimensions.radius}px`,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={iconDimensions.svg}
          height={iconDimensions.svg}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
        </svg>
      </div>

      {showText && (
        <span
          className="logo-text"
          style={{ fontSize: fontSizes }}
        >
          {variant === 'autora' ? (
            <>
              Auto<span className="highlight">RA</span>
            </>
          ) : (
            <>
              Auto<span className="highlight">Video</span>
            </>
          )}
        </span>
      )}
    </Link>
  );
};
