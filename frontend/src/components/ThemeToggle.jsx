import { Clinic, MedoraBot, ThemeScenery } from './ThemeArt.jsx';
import { useTheme } from '../theme.jsx';

export default function ThemeToggle({ size = 'sm', className = '' }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle--${size} ${className}`.trim()}
      role="switch"
      aria-checked={dark}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <span className="tt-scene" aria-hidden="true">
        <span className="tt-sky tt-sky--day" />
        <span className="tt-sky tt-sky--night" />
        <ThemeScenery />
        <Clinic />
        <span className="tt-orb">
          <span className="tt-sun" />
          <span className="tt-moon">
            <span className="tt-crater tt-crater--1" />
            <span className="tt-crater tt-crater--2" />
            <span className="tt-crater tt-crater--3" />
          </span>
        </span>
        <span className="tt-bot">
          <span className="tt-beam" />
          <MedoraBot />
        </span>
        <span className="tt-vignette" />
      </span>
    </button>
  );
}
