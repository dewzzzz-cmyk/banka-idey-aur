interface Props {
  score?: number
}

export function AiScoreBadge({ score }: Props) {
  if (score == null) return null
  const cls =
    score >= 7.5 ? 'ai-score-badge green' :
    score >= 5   ? 'ai-score-badge yellow' :
                   'ai-score-badge red'
  return (
    <span className={cls}>
      ✦ {score.toFixed(1)}
    </span>
  )
}
