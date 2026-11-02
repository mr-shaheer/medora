// Decorative vector artwork for the day/night theme switch.
// Everything is inline SVG/CSS so the switch stays crisp at every size.

const star = (x, y, size) => ({
  x,
  y,
  path: (() => {
    const arm = 2.2 * size;
    const halfLength = 3.5 * size;
    const step = (halfLength * 2 - arm) / 2;
    return `M${-arm / 2} ${-halfLength}h${arm}v${step}h${step}v${arm}h${-step}v${step}h${-arm}v${-step}h${-step}v${-arm}h${step}z`;
  })(),
});

const STARS = [
  star(24, 15, 1),
  star(50, 9, 0.72),
  star(80, 19, 0.9),
  star(108, 12, 1.08),
  star(143, 8, 0.64),
  star(176, 17, 0.88),
  star(207, 11, 0.72),
];

export function ThemeScenery() {
  return (
    <>
      <span className="tt-aurora" />

      <svg className="tt-clouds" viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true">
        <g className="tt-cloud tt-cloud--1">
          <ellipse className="tt-cloud-shape" cx="30" cy="30" rx="10.5" ry="6.4" />
          <ellipse className="tt-cloud-shape" cx="42" cy="25.5" rx="13" ry="8.5" />
          <ellipse className="tt-cloud-shape" cx="54" cy="30" rx="9" ry="6" />
          <rect className="tt-cloud-shape" x="29" y="27" width="26" height="8" rx="4" />
        </g>
        <g className="tt-cloud tt-cloud--2">
          <ellipse className="tt-cloud-shape" cx="132" cy="20" rx="9" ry="5.4" />
          <ellipse className="tt-cloud-shape" cx="142" cy="15.8" rx="11" ry="7" />
          <ellipse className="tt-cloud-shape" cx="152" cy="20" rx="7" ry="5" />
          <rect className="tt-cloud-shape" x="131" y="17.4" width="22" height="7" rx="3.5" />
        </g>
      </svg>

      <svg className="tt-stars" viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true">
        {STARS.map(({ x, y, path }, i) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <path
              className={`tt-star${i === 1 || i === 4 ? ' tt-star--twinkle' : ''}`}
              style={{ '--i': i }}
              d={path}
            />
          </g>
        ))}
      </svg>

      <svg className="tt-hills" viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="tt-hill tt-hill--back"
          d="M0 57C22 52 38 55 58 53C82 51 92 44 120 44C148 44 160 51 184 53C206 55 222 53 240 55V72H0Z"
        />
        <path
          className="tt-hill-rim"
          d="M0 57C22 52 38 55 58 53C82 51 92 44 120 44C148 44 160 51 184 53C206 55 222 53 240 55"
        />
        <path
          className="tt-hill tt-hill--front"
          d="M0 65C24 61 44 66 70 64C96 62 104 57 132 57C160 57 168 62 194 64C214 65 228 63 240 64V72H0Z"
        />
      </svg>
    </>
  );
}

export function Clinic() {
  return (
    <span className="tt-clinic">
      <span className="tt-clinic-roof" />
      <span className="tt-clinic-body">
        <span className="tt-clinic-window" />
        <span className="tt-clinic-plus" />
      </span>
    </span>
  );
}

export function MedoraBot() {
  return (
    <svg className="tt-bot-svg" viewBox="0 0 48 58" aria-hidden="true">
      <ellipse className="tt-bot-shadow" cx="24" cy="55.5" rx="11" ry="2.4" />
      <path className="tt-bot-stem" d="M24 11V5" />
      <circle className="tt-bot-antenna-dot" cx="24" cy="3.4" r="2.2" />
      <rect className="tt-bot-arm" x="3.5" y="36" width="7" height="13" rx="3.5" />
      <rect className="tt-bot-arm" x="37.5" y="36" width="7" height="13" rx="3.5" />
      <rect className="tt-bot-head" x="8" y="11" width="32" height="24" rx="11" />
      <rect className="tt-bot-visor" x="13" y="17" width="22" height="13" rx="6.5" />
      <path className="tt-bot-eye" d="M17.5 23.5q2.3-3.2 4.6 0M25.9 23.5q2.3-3.2 4.6 0" />
      <rect className="tt-bot-body" x="15" y="37" width="18" height="13" rx="6.5" />
      <path className="tt-bot-plus" d="M24 39.5v5M21.5 42h5" />
    </svg>
  );
}
