import React from 'react';

interface SylionTechLogoProps {
  size?: number;
  className?: string;
}

export function SylionTechLogo({ size = 32, className }: SylionTechLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 150 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* SylionTech Logo */}
      <g>
        {/* S */}
        <path
          d="M8 28.5C8 31.8 10.7 34.5 14 34.5H18C21.3 34.5 24 31.8 24 28.5V25.5C24 22.2 21.3 19.5 18 19.5H14C12.3 19.5 11 18.2 11 16.5V11.5C11 9.8 12.3 8.5 14 8.5H18C19.7 8.5 21 9.8 21 11.5"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* y */}
        <path
          d="M30 13.5L34 21.5L38 13.5M34 21.5L34 29.5"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* l */}
        <path
          d="M44 8.5V29.5"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* i */}
        <circle
          cx="52"
          cy="11"
          r="1.5"
          fill="#3B82F6"
        />
        <path
          d="M52 15.5V29.5"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* o */}
        <circle
          cx="62"
          cy="22.5"
          r="7"
          stroke="#3B82F6"
          strokeWidth="2.5"
          fill="none"
        />
        
        {/* n */}
        <path
          d="M75 29.5V15.5C75 15.5 75 13.5 77 13.5C79 13.5 79 15.5 79 15.5V29.5"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Tech part */}
        <g transform="translate(90, 0)">
          {/* T */}
          <path
            d="M4 13.5H16M10 13.5V29.5"
            stroke="#1D4ED8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* e */}
          <path
            d="M22 22.5H30M26 18.5C28.2 18.5 30 20.3 30 22.5V22.5C30 24.7 28.2 26.5 26 26.5H24C22.9 26.5 22 25.6 22 24.5V20.5C22 19.4 22.9 18.5 24 18.5H26Z"
            stroke="#1D4ED8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* c */}
          <path
            d="M40 18.5C37.8 18.5 36 20.3 36 22.5V22.5C36 24.7 37.8 26.5 40 26.5"
            stroke="#1D4ED8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* h */}
          <path
            d="M46 8.5V29.5M46 20.5C46 20.5 46 18.5 48 18.5C50 18.5 50 20.5 50 20.5V29.5"
            stroke="#1D4ED8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
        
        {/* Decorative elements */}
        <circle cx="20" cy="6" r="1" fill="#3B82F6" opacity="0.6"/>
        <circle cx="65" cy="8" r="1.5" fill="#1D4ED8" opacity="0.8"/>
        <circle cx="85" cy="35" r="1" fill="#3B82F6" opacity="0.4"/>
      </g>
    </svg>
  );
}

// Version texte simple pour les cas où le SVG n'est pas adapté
export function SylionTechTextLogo({ className }: { className?: string }) {
  return (
    <div className={`font-bold text-xl ${className}`}>
      <span className="text-blue-600">Sylion</span>
      <span className="text-blue-800">Tech</span>
    </div>
  );
}