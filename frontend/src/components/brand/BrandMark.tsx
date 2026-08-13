import React from 'react';

type Props = {
  size?: number;
  className?: string;
};

/** Logo de marca — mismo ícono de barras que la landing y el favicon */
const BrandMark: React.FC<Props> = ({ size = 32, className = '' }) => (
  <div
    className={`brand-mark ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 20V10M12 20V4M18 20v-7" />
    </svg>
  </div>
);

export default BrandMark;
