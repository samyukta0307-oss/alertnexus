/**
 * Centralized Warm-Dark SOC Theme Tokens
 *
 * Provides a unified color palette balancing warm charcoal surfaces
 * with dusty teal and soft coral accents, meeting high readability
 * and clear priority distinction standards.
 */

export const THEME = {
  // Base Backgrounds
  base: '#1c1921',
  surface: '#24202b',
  card: '#2d2736',
  cardHover: '#373042',
  input: '#1e1a24',

  // Primary Interactive Accent (Dusty Teal)
  teal: '#5ec8c0',
  tealHover: '#4eb8b0',
  tealBg: 'rgba(94, 200, 192, 0.12)',
  tealBorder: 'rgba(94, 200, 192, 0.35)',

  // Secondary Warm Accent (Soft Coral / Warm Amber)
  warm: '#e8a87c',
  warmHover: '#f0a868',
  warmBg: 'rgba(232, 168, 124, 0.12)',
  warmBorder: 'rgba(232, 168, 124, 0.35)',

  // Priority Tiers (Warm & Clear, Distinguishable)
  p1: '#e88080', // Critical (soft warm coral/red)
  p2: '#efa95f', // High (warm amber/orange)
  p3: '#e8d290', // Medium (soft warm yellow)
  p4: '#9aa5b1', // Low (cool muted gray-blue)

  // Success / Sage Green
  sage: '#8fbf9f',

  // Typography
  textMain: '#f0eae4',
  textMuted: '#a69c93',
  textSubtle: '#7d736b',

  // Borders
  border: 'rgba(255, 245, 235, 0.10)',
  borderProminent: 'rgba(255, 245, 235, 0.18)',

  // 3D Attack Stages (Balanced Warm-Cool Palette)
  stages: {
    reconnaissance: '#7ba7d7',       // Soft cool steel blue
    initial_access: '#5ec8c0',       // Dusty teal
    privilege_escalation: '#e8a87c', // Warm coral
    lateral_movement: '#efa95f',     // Warm amber
    exfiltration: '#e88080',         // Warm muted red
    persistence: '#ba9bc9',          // Soft dusty lavender
    none: '#9aa5b1'
  }
};

/**
 * Returns Tailwind-compatible priority badge, border, score and background classes.
 * @param {'P1'|'P2'|'P3'|'P4'} priority
 */
export function getPriorityStyles(priority) {
  switch (priority) {
    case 'P1':
      return {
        badge: 'bg-[#e88080]/15 text-[#e88080] border-[#e88080]/40 shadow-[0_0_12px_rgba(232,128,128,0.22)]',
        border: 'border-[#e88080]/30 hover:border-[#e88080]/60',
        score: 'text-[#e88080]',
        dot: 'bg-[#e88080]',
        bg: 'bg-[#e88080]/5',
        glow: 'shadow-[0_0_20px_rgba(232,128,128,0.12)]',
        label: 'CRITICAL'
      };
    case 'P2':
      return {
        badge: 'bg-[#efa95f]/15 text-[#efa95f] border-[#efa95f]/40 shadow-[0_0_10px_rgba(239,169,95,0.2)]',
        border: 'border-[#efa95f]/30 hover:border-[#efa95f]/60',
        score: 'text-[#efa95f]',
        dot: 'bg-[#efa95f]',
        bg: 'bg-[#efa95f]/5',
        glow: 'shadow-[0_0_16px_rgba(239,169,95,0.1)]',
        label: 'HIGH'
      };
    case 'P3':
      return {
        badge: 'bg-[#e8d290]/15 text-[#e8d290] border-[#e8d290]/35 shadow-[0_0_8px_rgba(232,210,144,0.15)]',
        border: 'border-[#e8d290]/25 hover:border-[#e8d290]/50',
        score: 'text-[#e8d290]',
        dot: 'bg-[#e8d290]',
        bg: 'bg-[#e8d290]/5',
        glow: 'shadow-[0_0_12px_rgba(232,210,144,0.08)]',
        label: 'MEDIUM'
      };
    case 'P4':
    default:
      return {
        badge: 'bg-[#9aa5b1]/15 text-[#9aa5b1] border-[#9aa5b1]/30',
        border: 'border-[#9aa5b1]/20 hover:border-[#9aa5b1]/40',
        score: 'text-[#9aa5b1]',
        dot: 'bg-[#9aa5b1]',
        bg: 'bg-[#9aa5b1]/5',
        glow: '',
        label: 'LOW'
      };
  }
}

