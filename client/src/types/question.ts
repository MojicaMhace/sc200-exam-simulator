export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'yes_no'
  | 'drag_drop'
  | 'hot_area'
  | 'case_study'

export interface OptionItem {
  key: string
  text: string
  explanation?: string
}

export interface YesNoStatement {
  id: string
  text: string
}

export interface AnswerSlot {
  id: string
  label: string
}

export interface CaseQuestion {
  id: string
  question: string
  options: OptionItem[]
}

export interface Question {
  id: string
  sequence: number
  title: string
  domain: string
  questionType: QuestionType | string
  scenario: string
  question: string
  options: OptionItem[]
  statements?: YesNoStatement[]
  answerSlots?: AnswerSlot[]
  hotAreas?: Array<{ id: string; label: string; x: number; y: number; width: number; height: number }>
  interactionImage?: string
  caseQuestions?: CaseQuestion[]
  originalAnswer?: string
  validatedAnswer?: string[]
  validationStatus: string
  sourceReviewDate?: string
}

export type UserAnswer = string | string[] | boolean | Record<string, string>
