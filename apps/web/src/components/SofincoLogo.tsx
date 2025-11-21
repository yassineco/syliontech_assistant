import React from 'react';

interface SofincoLogoProps {
  size?: number;
  className?: string;
}

export function SofincoLogo({ size = 32, className }: SofincoLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Sofinco Logo */}
      <g>
        {/* S */}
        <path
          d="M8 28.5C8 31.8 10.7 34.5 14 34.5H18C21.3 34.5 24 31.8 24 28.5V25.5C24 22.2 21.3 19.5 18 19.5H14C12.3 19.5 11 18.2 11 16.5V11.5C11 9.8 12.3 8.5 14 8.5H18C19.7 8.5 21 9.8 21 11.5"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* o */}
        <circle
          cx="34"
          cy="21.5"
          r="8"
          stroke="#00BCD4"
          strokeWidth="3"
          fill="none"
        />
        
        {/* f */}
        <path
          d="M50 13.5H58M50 13.5V29.5M50 13.5V8.5C50 7.4 50.9 6.5 52 6.5H56"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M50 21.5H56"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* i */}
        <circle
          cx="68"
          cy="9"
          r="2"
          fill="#00BCD4"
        />
        <path
          d="M68 13.5V29.5"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* n */}
        <path
          d="M78 29.5V13.5M78 13.5C78 13.5 78 13.5 82 13.5C85.3 13.5 88 16.2 88 19.5V29.5"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* c */}
        <path
          d="M108 16.5C106.3 14.8 103.9 13.5 101 13.5C96.6 13.5 93 17.1 93 21.5C93 25.9 96.6 29.5 101 29.5C103.9 29.5 106.3 28.2 108 26.5"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* o (second) */}
        <circle
          cx="118"
          cy="21.5"
          r="8"
          stroke="#00BCD4"
          strokeWidth="3"
          fill="none"
        />
      </g>
    </svg>
  );
}