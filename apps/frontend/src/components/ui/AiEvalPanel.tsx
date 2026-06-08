import type { AiEvaluation } from '@portal/types'

interface Props {
  evaluation?: AiEvaluation | null
  onRefresh?: () => void
  isLoading?: boolean
}

const CRITERIA: [keyof AiEvaluation, string][] = [
  ['impact',      'Потенциал влияния'],
  ['feasibility', 'Реализуемость'],
  ['clarity',     'Проработанность'],
]

export function AiEvalPanel({ evaluation, onRefresh, isLoading }: Props) {
  return (
    <div className="ai-eval-panel">
      <div className="ai-eval-head">
        <span className="cur-field-l">✦ Оценка потенциала ИИ</span>
        {onRefresh && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? '…' : '↻ Переоценить'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="ai-eval-skeleton">
          <div className="sk" style={{ height: 14, width: '60%', marginBottom: 10 }} />
          <div className="sk" style={{ height: 14, width: '75%', marginBottom: 10 }} />
          <div className="sk" style={{ height: 14, width: '50%', marginBottom: 14 }} />
          <div className="sk" style={{ height: 40 }} />
        </div>
      ) : evaluation == null ? (
        <p className="ai-eval-empty">Оценка ещё не готова</p>
      ) : (
        <>
          <div className="ai-eval-bars">
            {CRITERIA.map(([key, label]) => {
              const val = evaluation[key] as number
              return (
                <div key={key} className="ai-eval-row">
                  <span className="ai-eval-label">{label}</span>
                  <div className="ai-eval-bar-wrap">
                    <div
                      className="ai-eval-bar-fill"
                      style={{ width: `${val * 10}%` }}
                    />
                  </div>
                  <span className="ai-eval-score">{val}/10</span>
                </div>
              )
            })}
          </div>
          <p className="ai-eval-summary">{evaluation.summary}</p>
          <span className="ai-eval-overall">
            Общий балл: <b>{evaluation.overall.toFixed(1)}</b>
          </span>
        </>
      )}
    </div>
  )
}
