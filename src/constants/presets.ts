import { SamplePreset } from '../types';

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'adrian-omr-5mcq',
    name: 'Adrian OMR 5-Question (Sample 1 & 2)',
    description: 'Standard 5-question MCQ sheet with 5 choices (A, B, C, D, E). Used in core OMRChecker test suite.',
    imageUrl: '/samples/adrian_omr_1.png',
    template: {
      name: 'Adrian 5-MCQ Template',
      description: '5 questions with 5 options each (A-E)',
      pageDimensions: [300, 400],
      bubbleDimensions: [25, 25],
      fieldBlocks: {
        MCQ_Block_1: {
          fieldType: 'QTYPE_MCQ5',
          origin: [65, 60],
          fieldLabels: ['q1..5'],
          labelsGap: 52,
          bubblesGap: 41,
        },
      },
    },
    answerKey: {
      answers: {
        q1: 'C',
        q2: 'E',
        q3: 'A',
        q4: 'B',
        q5: 'B',
      },
      markingScheme: {
        correct: 1,
        incorrect: 0,
        unmarked: 0,
      },
    },
  },
  {
    id: 'adrian-omr-negative-marking',
    name: 'Adrian OMR with Negative Grading (Sample 2)',
    description: 'Alternative scan with weighted marking (+4 for correct, -1 for incorrect penalty).',
    imageUrl: '/samples/adrian_omr_2.png',
    template: {
      name: 'Adrian 5-MCQ Negative Marking',
      description: '5 questions with negative marking penalty',
      pageDimensions: [300, 400],
      bubbleDimensions: [25, 25],
      fieldBlocks: {
        MCQ_Block_1: {
          fieldType: 'QTYPE_MCQ5',
          origin: [65, 60],
          fieldLabels: ['q1..5'],
          labelsGap: 52,
          bubblesGap: 41,
        },
      },
    },
    answerKey: {
      answers: {
        q1: 'C',
        q2: 'E',
        q3: 'A',
        q4: 'B',
        q5: 'B',
      },
      markingScheme: {
        correct: 4,
        incorrect: -1,
        unmarked: 0,
      },
    },
  },
  {
    id: 'antibodyy-simple-omr',
    name: 'Antibodyy Community Simple OMR (10 Questions)',
    description: '10-question evaluation sheet with 4 choices (A, B, C, D).',
    imageUrl: '/samples/simple_omr.jpg',
    template: {
      name: '10-Question Standard Template',
      description: '10 questions with 4 choices (A-D)',
      pageDimensions: [400, 600],
      bubbleDimensions: [22, 22],
      fieldBlocks: {
        MCQ_Block_1: {
          fieldType: 'QTYPE_MCQ4',
          origin: [85, 75],
          fieldLabels: ['q1..10'],
          labelsGap: 46,
          bubblesGap: 48,
        },
      },
    },
    answerKey: {
      answers: {
        q1: 'A',
        q2: 'B',
        q3: 'C',
        q4: 'D',
        q5: 'A',
        q6: 'B',
        q7: 'C',
        q8: 'D',
        q9: 'A',
        q10: 'C',
      },
      markingScheme: {
        correct: 1,
        incorrect: 0,
        unmarked: 0,
      },
    },
  },
  {
    id: 'exam-20-mcq',
    name: 'High School 20-Question Dual-Column Exam',
    description: '20 questions formatted across 2 columns of 10 questions each with 4 options (A-D).',
    imageUrl: '', // Can be generated or uploaded
    template: {
      name: '20-Question Dual Column',
      description: '20 questions split into Section 1 and Section 2',
      pageDimensions: [600, 800],
      bubbleDimensions: [26, 26],
      fieldBlocks: {
        Col_1: {
          fieldType: 'QTYPE_MCQ4',
          origin: [70, 100],
          fieldLabels: ['q1..10'],
          labelsGap: 62,
          bubblesGap: 46,
        },
        Col_2: {
          fieldType: 'QTYPE_MCQ4',
          origin: [340, 100],
          fieldLabels: ['q11..20'],
          labelsGap: 62,
          bubblesGap: 46,
        },
      },
    },
    answerKey: {
      answers: {
        q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'A',
        q6: 'B', q7: 'C', q8: 'D', q9: 'A', q10: 'B',
        q11: 'C', q12: 'D', q13: 'A', q14: 'B', q15: 'C',
        q16: 'D', q17: 'A', q18: 'B', q19: 'C', q20: 'D',
      },
      markingScheme: {
        correct: 2,
        incorrect: -0.5,
        unmarked: 0,
      },
    },
  },
];
