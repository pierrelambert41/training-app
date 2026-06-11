// Source de vérité des couleurs côté JS (navigation, composants natifs).
// Doit rester synchronisé avec tailwind.config.js.
const colors = {
  background: '#0a0a0c',
  backgroundSurface: '#151519',
  backgroundElevated: '#1f1f25',
  contentPrimary: '#fafafa',
  contentSecondary: '#a1a1aa',
  contentMuted: '#71717a',
  contentPlaceholder: '#52525b',
  contentOnAccent: '#0a0a0c',
  accent: '#a3e635',
  accentHover: '#84cc16',
  statusSuccess: '#4ade80',
  statusWarning: '#fbbf24',
  statusDanger: '#f87171',
  statusInfo: '#38bdf8',
  aiAccent: '#a78bfa',
  border: '#232329',
  borderStrong: '#3a3a42',
  tintAccent: 'rgba(163, 230, 53, 0.14)',
  tintSuccess: 'rgba(74, 222, 128, 0.14)',
  tintWarning: 'rgba(251, 191, 36, 0.14)',
  tintDanger: 'rgba(248, 113, 113, 0.14)',
  tintInfo: 'rgba(56, 189, 248, 0.14)',
  tintAi: 'rgba(167, 139, 250, 0.14)',
} as const;

export { colors };
