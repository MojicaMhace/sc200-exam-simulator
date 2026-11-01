import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { AnswerFeedback, Question, UserAnswer } from '../types/question'
import { getOptionExplanation, getYesNoExplanation } from '../data/optionExplanations'

interface Props {
  question: Question
  onAnswer: (answer: UserAnswer) => void
  currentAnswer?: UserAnswer
  submittedAnswer?: UserAnswer
  feedback?: AnswerFeedback
  onCheckAnswer?: () => void
  showCheckButton?: boolean
}

function OptionFeedback({
  optionKey,
  expected,
  questionId,
  explanation,
  revealed = true,
}: {
  optionKey: string
  expected: string[]
  questionId: string
  explanation?: string
  revealed?: boolean
}) {
  const correct = expected.includes(optionKey)
  if (!revealed || expected.length === 0) return null
  const teachingExplanation = explanation || getOptionExplanation(questionId, optionKey)

  return (
    <p className={`mt-1 text-xs ${correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
      <span className="font-semibold">{correct ? 'Why this choice works:' : 'Why this choice does not fit:'}</span>{' '}
      {teachingExplanation || (correct
        ? 'This option best satisfies the requirement described in the scenario.'
        : `This option does not satisfy the requirement as well as option ${expected.join(', ')}.`)}
    </p>
  )
}

function DraggableItem({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800"
      {...attributes}
      {...listeners}
      tabIndex={0}
      role="button"
      aria-label={`Drag item ${text}`}
    >
      {text}
    </div>
  )
}

function DropSlot({ id, label, value, text }: { id: string; label: string; value?: string; text?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`flex min-h-12 items-center gap-2 rounded-md border-2 border-dashed p-2 text-sm ${isOver ? 'border-sky-500 bg-sky-50 dark:bg-sky-950' : 'border-slate-300 dark:border-slate-700'}`}>
      <span className="w-32 text-xs font-semibold text-slate-500">{label}</span>
      <span>{text || (value ? value : 'Drop an option here')}</span>
    </div>
  )
}

export function QuestionCard({ question, onAnswer, currentAnswer, submittedAnswer, feedback, onCheckAnswer, showCheckButton = false }: Props) {
  const answerLocked = submittedAnswer !== undefined
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  )

  function renderByType() {
    if (question.questionType === 'yes_no') {
      const statements = question.statements || [{ id: 'statement-1', text: question.question }]
      const selected = Array.isArray(currentAnswer) ? currentAnswer : []
      return (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-[1fr_80px_80px] border-b bg-slate-100 p-2 text-xs font-semibold dark:bg-slate-800">
            <span>Proposed solution</span><span className="text-center">Yes</span><span className="text-center">No</span>
          </div>
          {statements.map((statement, index) => (
            <div key={statement.id} className="grid grid-cols-[1fr_80px_80px] items-center gap-2 border-b p-3 last:border-b-0">
              <span className="text-sm">{index + 1}. {statement.text}</span>
              {['YES', 'NO'].map((value) => (
                <div key={value}>
                  <label className="flex cursor-pointer justify-center">
                    <input
                      type="radio"
                      name={`${question.id}-${statement.id}`}
                      checked={selected[index] === value}
                      disabled={answerLocked}
                      onChange={() => {
                        const updated = [...selected]
                          updated[index] = value
                          onAnswer(updated)
                      }}
                      aria-label={`${value} for statement ${index + 1}`}
                    />
                  </label>
                  {selected[index] && (
                    <OptionFeedback
                      optionKey={value}
                      expected={feedback?.correctAnswer[index] ? [feedback.correctAnswer[index]] : []}
                      questionId={question.id}
                      explanation={getYesNoExplanation(question.id, index, value)}
                      revealed={Boolean(feedback)}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    }

    if (question.questionType === 'drag_drop') {
      const slots = question.answerSlots || []
      const placements = Array.isArray(currentAnswer) ? currentAnswer : []
      const placedKeys = new Set(placements.filter(Boolean))
      const available = question.options.filter((option) => !placedKeys.has(option.key))
      return (
        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-300">
            Drag each value into the correct answer area. Each correct placement earns one point.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event
              if (!over || !String(over.id).startsWith('slot-')) return
              const slotIndex = Number(String(over.id).replace('slot-', ''))
              if (answerLocked) return
              const updated = [...placements]
              const previousIndex = updated.indexOf(String(active.id))
              if (previousIndex >= 0) updated[previousIndex] = ''
              updated[slotIndex] = String(active.id)
              onAnswer(updated)
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Values</p>
                {available.map((option) => <DraggableItem key={option.key} id={option.key} text={`${option.key}) ${option.text}`} />)}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Answer area</p>
                {slots.map((slot, index) => {
                  const value = placements[index]
                  const option = question.options.find((item) => item.key === value)
                  return (
                    <div key={slot.id}>
                      <DropSlot id={`slot-${index}`} label={slot.label} value={value} text={option?.text} />
                      {value && (
                        <OptionFeedback
                          optionKey={value}
                          expected={feedback?.correctAnswer[index] ? [feedback.correctAnswer[index]] : []}
                          questionId={question.id}
                          explanation={option?.explanation}
                          revealed={Boolean(feedback)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </DndContext>
        </div>
      )
    }

    if (question.questionType === 'multiple_choice') {
      const current = Array.isArray(currentAnswer) ? currentAnswer : []
      return (
        <div className="mt-4 space-y-2">
          {question.options.map((opt) => {
            const checked = current.includes(opt.key)
            return (
              <label key={opt.key} className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-300 p-2 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...current, opt.key]
                      : current.filter((x) => x !== opt.key)
                    onAnswer(updated)
                  }}
                />
                <span className="text-sm">{opt.key}) {opt.text}</span>
                <OptionFeedback
                  optionKey={opt.key}
                  expected={feedback?.correctAnswer || []}
                  questionId={question.id}
                  explanation={opt.explanation}
                  revealed={Boolean(feedback)}
                />
              </label>
            )
          })}
        </div>
      )
    }

    if (question.questionType === 'case_study') {
      const caseQuestions = question.caseQuestions || [{ id: 'case-1', question: question.question, options: question.options }]
      const selectedAnswers = currentAnswer && !Array.isArray(currentAnswer) && typeof currentAnswer === 'object'
        ? currentAnswer
        : {}
      return (
        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-900 dark:bg-slate-800">
          <p className="mb-3 text-sm font-semibold">Case study questions</p>
          <div className="space-y-4">
            {caseQuestions.map((caseQuestion, index) => (
              <div key={caseQuestion.id} className="border-b border-sky-200 pb-3 last:border-b-0 last:pb-0 dark:border-sky-900">
                <p className="mb-2 text-sm font-medium">{index + 1}. {caseQuestion.question}</p>
                <div className="space-y-2">
                  {caseQuestion.options.map((opt) => (
                    <div key={opt.key}>
                      <button
                        onClick={() => {
                          if (!answerLocked) {
                            onAnswer({ ...selectedAnswers, [caseQuestion.id]: opt.key })
                          }
                        }}
                        disabled={answerLocked}
                        aria-pressed={selectedAnswers[caseQuestion.id] === opt.key}
                        className={`block w-full rounded-md border px-3 py-2 text-left text-sm dark:bg-slate-900 ${selectedAnswers[caseQuestion.id] === opt.key ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200 dark:bg-sky-950' : 'border-slate-300 bg-white dark:border-slate-700'}`}
                      >
                        {opt.key}) {opt.text}
                      </button>
                      {selectedAnswers[caseQuestion.id] && (
                        <OptionFeedback
                          optionKey={opt.key}
                          expected={feedback?.correctAnswer[index] ? [feedback.correctAnswer[index]] : []}
                          questionId={question.id}
                          explanation={opt.explanation}
                          revealed={Boolean(feedback)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="mt-4 space-y-2">
        {question.options.map((opt) => (
          <div key={opt.key}>
            <button
              onClick={() => onAnswer(opt.key)}
              disabled={answerLocked}
              aria-pressed={currentAnswer === opt.key}
              className={`block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${currentAnswer === opt.key ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200 dark:bg-sky-950' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
            >
              {opt.key}) {opt.text}
            </button>
            {currentAnswer !== undefined && (
              <OptionFeedback
                optionKey={opt.key}
                expected={feedback?.correctAnswer || []}
                questionId={question.id}
                explanation={opt.explanation}
                revealed={Boolean(feedback)}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{question.scenario}</p>
      {question.questionType !== 'case_study' && question.question.trim() !== question.scenario.trim() && (
        <p className="mt-3 font-medium text-slate-800 dark:text-slate-100">{question.question}</p>
      )}
      {renderByType()}
      {showCheckButton && !feedback && currentAnswer !== undefined && (
        <button
          type="button"
          onClick={onCheckAnswer}
          className="mt-4 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Check Answer
        </button>
      )}
      {feedback && (
        <div className={`mt-5 space-y-3 rounded-lg border p-4 ${feedback.correct ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950' : 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950'}`}>
          <p className="font-bold">{feedback.correct ? 'Correct — well done!' : 'Incorrect — let us learn from this.'}</p>
          <p className="text-sm"><span className="font-semibold">Correct answer:</span>{' '}
            {feedback.correctAnswer.map((key) => {
              const option = question.options.find((item) => item.key === key)
              return `${key}) ${option?.text || key}`
            }).join('; ')}
          </p>
          <p className="text-sm"><span className="font-semibold">Why it is correct:</span> {feedback.correctAnswerExplanation}</p>
          <p className="text-sm"><span className="font-semibold">What this question is testing:</span> {feedback.topic}</p>
          <p className="text-sm"><span className="font-semibold">Technical concept:</span> {feedback.technicalConcept}</p>
          <p className="text-sm"><span className="font-semibold">Important clue:</span> {feedback.decisiveClue}</p>
          {feedback.practicalExample && <p className="text-sm"><span className="font-semibold">Practical example:</span> {feedback.practicalExample}</p>}
          {feedback.correctedQuery && <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{feedback.correctedQuery}</pre>}
          <div className="space-y-1">
            <p className="text-sm font-semibold">Why each choice works or does not fit:</p>
            {Object.entries(feedback.optionFeedback).map(([key, explanation]) => (
              <p key={key} className="text-sm"><span className="font-semibold">{key}:</span> {explanation}</p>
            ))}
          </div>
          {feedback.references.length > 0 && (
            <p className="text-sm">
              <span className="font-semibold">Learn more from Microsoft:</span>{' '}
              {feedback.references.map((reference) => <a key={reference} className="mr-2 underline" href={reference} target="_blank" rel="noreferrer">{reference}</a>)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
