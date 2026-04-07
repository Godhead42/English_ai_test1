// ────────────────────────────────────────────────
//  Score & colour helpers
// ────────────────────────────────────────────────

export function getScoreColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 65) return 'text-amber-400';
  return 'text-red-400';
}

export function getScoreBg(score: number) {
  if (score >= 85) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
  if (score >= 65) return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
  return 'from-red-500/20 to-red-500/5 border-red-500/30';
}

export function getScoreLabel(score: number) {
  if (score >= 90) return 'Excellent!';
  if (score >= 75) return 'Great Job!';
  if (score >= 60) return 'Good Effort!';
  if (score >= 40) return 'Keep Practicing';
  return 'Try Again';
}
