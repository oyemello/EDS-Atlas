'use client';

// Lightweight gauge styled to match Carbon look and feel.
// No extra deps; uses SVG arc to render the value.

export default function ComplianceGauge({ value = 0, size = 96, stroke = 10 }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  const color =
    clamped >= 90 ? '#198038' :
    clamped >= 70 ? '#0f62fe' :
    clamped >= 50 ? '#f1c21b' :
    '#da1e28';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Compliance ${clamped}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e0e0e0"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="18"
          fontWeight="600"
          fill="#161616"
        >
          {clamped}%
        </text>
      </svg>
      <span style={{ fontSize: 12, color: '#525252', marginTop: 4 }}>Compliance</span>
    </div>
  );
}
