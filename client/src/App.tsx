import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun, Play, CheckCircle2 } from 'lucide-react'
import type { Question, UserAnswer } from './types/question'
import { QuestionCard } from './components/QuestionCard'
import { AnalyticsPanel } from './components/AnalyticsPanel'

type Screen = 'home' | 'exam' | 'results'

const API_BASE_URL = import.meta.env.VITE_API_URL
  || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : window.location.origin)

interface Summary {
  sessions: Array<{ id: number; started_at: string; mode: string; total_questions: number; score_percent: number | null }>
  byDomain: Array<{ domain: string; attempts: number; correct: number }>
}

interface ExamItem {
  instanceId: string
  question: Question
  section: 'questions' | 'case_studies'
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [questions, setQuestions] = useState<Question[]>([])
  const [examItems, setExamItems] = useState<ExamItem[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({})
  const [result, setResult] = useState<{ total: number; answered: number; unanswered: number; correct: number; scorePercent: number } | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    loadQuestions()
    loadSummary()
  }, [])

  async function loadQuestions() {
    const res = await fetch(`${API_BASE_URL}/api/questions`)
    const data = await res.json()
    setQuestions(data.questions)
  }

  async function loadSummary() {
    const res = await fetch(`${API_BASE_URL}/api/analytics/summary`)
    if (!res.ok) return
    const data = await res.json()
    setSummary(data)
  }

  async function startExam() {
    const res = await fetch(`${API_BASE_URL}/api/exam/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'Simulator', totalQuestions: 57 }),
    })
    const data = await res.json()
    setSessionId(data.sessionId)

    const byId = new Map(questions.map((q) => [q.id, q]))
    const standardItems = data.questionIds
      .map((id: string, index: number) => ({ instanceId: `question-${index + 1}`, question: byId.get(id), section: 'questions' as const }))
      .filter((item: { question?: Question }): item is ExamItem => Boolean(item.question))
    const caseItems = (data.caseQuestionIds || [])
      .map((id: string) => ({ instanceId: `case-${id}`, question: byId.get(id), section: 'case_studies' as const }))
      .filter((item: { question?: Question }): item is ExamItem => Boolean(item.question))
    setExamItems([...standardItems, ...caseItems])
    setAnswers({})
    setActiveIndex(0)
    setResult(null)
    setScreen('exam')
  }

  const activeItem = examItems[activeIndex]
  const activeQuestion = activeItem?.question
  const progress = useMemo(() => {
    if (examItems.length === 0) return 0
    return Math.round(((activeIndex + 1) / examItems.length) * 100)
  }, [activeIndex, examItems.length])

  async function submitExam() {
    if (!sessionId) return
    const payload = examItems
      .filter((item) => answers[item.instanceId] !== undefined)
      .map((item) => ({ questionId: item.question.id, answer: answers[item.instanceId] }))

    const res = await fetch(`${API_BASE_URL}/api/exam/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: payload }),
    })

    const data = await res.json()
    setResult(data)
    setScreen('results')
    loadSummary()
  }

  function renderHome() {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 p-6 text-white shadow-lg dark:border-slate-800">
          <h1 className="text-2xl font-bold">SC-200 Exam Simulator & Security Analyst Assessment</h1>
          <p className="mt-2 text-sm text-cyan-50">
            Local interactive training with timed exams, KQL-centered practice style questions, case scenarios, and analytics.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={startExam}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-sky-700"
            >
              <Play size={16} /> Start SC-200 Practice Exam
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-base font-semibold">Imported Questions</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Loaded: {questions.length} authored questions. The simulator uses an SC-200-style blueprint: environment management, incident response, and threat hunting, followed by case-study practice.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-base font-semibold">Question Modes</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Single-answer multiple choice</li>
              <li>Multiple-answer selection</li>
              <li>Yes/No proposed-solution flow</li>
              <li>Drag-and-drop sequencing (mouse + keyboard)</li>
              <li>Separate case-study section after the scored questions</li>
            </ul>
          </div>
        </div>

        {summary && <AnalyticsPanel rows={summary.byDomain} />}
      </div>
    )
  }

  function renderExam() {
    if (!activeQuestion) return null
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{activeItem.section === 'case_studies' ? 'Case study' : 'Question'} {activeIndex + 1} of {examItems.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
            <div className="h-full bg-sky-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <QuestionCard
          question={activeQuestion}
          currentAnswer={answers[activeItem.instanceId]}
          onAnswer={(answer) => setAnswers((prev) => ({ ...prev, [activeItem.instanceId]: answer }))}
        />
        {activeItem.section === 'case_studies' && (
          <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-100">
            Case study section: use the scenario details above to answer each case question.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            disabled={activeIndex === 0}
          >
            Previous
          </button>
          <button
            onClick={() => setActiveIndex((i) => Math.min(examItems.length - 1, i + 1))}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
            disabled={activeIndex === examItems.length - 1}
          >
            Next
          </button>
          <button
            onClick={submitExam}
            className="ml-auto rounded-md bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            Submit Exam
          </button>
        </div>
      </div>
    )
  }

  function renderResults() {
    if (!result) return null
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-slate-900">
          <div className="mb-2 inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={18} />
            <span className="font-semibold">Exam Complete</span>
          </div>
          <p className="text-sm">Score: {result.correct}/{result.total} ({result.scorePercent.toFixed(1)}%)</p>
          <p className="mt-1 text-sm">Answered: {result.answered} · Unanswered: {result.unanswered}</p>
        </div>

        <button
          onClick={() => {
            setScreen('home')
            loadQuestions()
          }}
          className="rounded-md bg-sky-600 px-4 py-2 text-white"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist text-ink transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-semibold tracking-wide">LOCAL HOSTED TRAINING APP</p>
          <button
            onClick={() => setDark((v) => !v)}
            className="rounded-md border border-slate-300 p-2 dark:border-slate-700"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {screen === 'home' && renderHome()}
        {screen === 'exam' && renderExam()}
        {screen === 'results' && renderResults()}
      </div>
    </div>
  )
}

export default App
