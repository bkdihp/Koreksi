export type FieldType = 'QTYPE_MCQ4' | 'QTYPE_MCQ5' | 'QTYPE_INT' | 'QTYPE_YES_NO';

export interface FieldBlock {
  fieldType: FieldType;
  origin: [number, number]; // [x, y]
  fieldLabels: string[]; // e.g. ["q1..5"] or ["q1", "q2", ...]
  labelsGap: number; // vertical distance between rows
  bubblesGap: number; // horizontal distance between options
  direction?: 'vertical' | 'horizontal';
}

export interface OMRTemplate {
  name?: string;
  description?: string;
  pageDimensions: [number, number]; // [width, height]
  bubbleDimensions: [number, number]; // [width, height]
  fieldBlocks: Record<string, FieldBlock>;
}

export interface MarkingScheme {
  correct: number;
  incorrect: number;
  unmarked: number;
}

export interface AnswerKeyConfig {
  answers: Record<string, string>; // e.g. { "q1": "C", "q2": "E" }
  markingScheme: MarkingScheme;
}

export interface BubbleMetric {
  label: string;
  option: string;
  x: number;
  y: number;
  width: number;
  height: number;
  meanIntensity: number; // 0 (pure black) to 255 (pure white)
  fillPercentage: number; // 0% to 100%
  isMarked: boolean;
}

export interface QuestionResult {
  questionLabel: string;
  options: string[];
  detectedAnswers: string[]; // e.g. ["C"] or ["B", "C"] or []
  correctAnswer: string;
  status: 'correct' | 'incorrect' | 'unmarked' | 'multi';
  score: number;
  confidence: number;
  bubbleMetrics: BubbleMetric[];
}

export interface SheetEvaluationResult {
  sheetId: string;
  sheetName: string;
  imageUrl: string;
  evaluatedAt: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  unmarkedCount: number;
  multiCount: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  questions: QuestionResult[];
  rawImageWidth: number;
  rawImageHeight: number;
}

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  template: OMRTemplate;
  answerKey: AnswerKeyConfig;
}
