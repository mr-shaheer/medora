export default function Robot() {
  return (
    <svg className="robot" viewBox="0 0 320 400" role="img" aria-label="Medora, a friendly clinical assistant robot">
      <defs>
        <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#E3EEF2" /></linearGradient>
        <filter id="bl"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <ellipse cx="160" cy="372" rx="70" ry="10" fill="#00D4E0" opacity=".45" filter="url(#bl)" />
      <g className="float">
        <rect x="92" y="205" width="136" height="150" rx="56" fill="url(#sh)" stroke="#D5E3E8" />
        <path d="M152 214c-14 44-6 80 22 92" fill="none" stroke="#1B2A30" strokeWidth="4" strokeLinecap="round" />
        <circle cx="206" cy="232" r="9" fill="#fff" stroke="#1B2A30" strokeWidth="4" />
        <path d="M193 262h22M204 251v22" stroke="var(--cyan)" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="86" cy="270" rx="20" ry="36" fill="url(#sh)" stroke="#D5E3E8" />
        <g transform="rotate(14 240 290)"><rect x="214" y="256" width="52" height="68" rx="7" fill="#27323A" /><rect x="220" y="263" width="40" height="54" rx="3" fill="#3A4852" /></g>
        <circle cx="236" cy="312" r="13" fill="#fff" stroke="#D5E3E8" />
        <ellipse cx="62" cy="126" rx="15" ry="28" fill="var(--cyan)" /><ellipse cx="258" cy="126" rx="15" ry="28" fill="var(--cyan)" />
        <ellipse cx="160" cy="124" rx="100" ry="84" fill="url(#sh)" stroke="#D5E3E8" />
        <rect x="86" y="74" width="148" height="100" rx="48" fill="#06090B" />
        <path d="M118 128q15-18 30 0M172 128q15-18 30 0M148 150q12 10 24 0" fill="none" stroke="#3EE8F5" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
