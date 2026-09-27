import { SheetEvaluationResult, AnswerKeyConfig } from '../types';

/**
 * Generates CSV content from evaluated sheet results
 */
export function exportResultsToCSV(results: SheetEvaluationResult[]): string {
  if (results.length === 0) return '';

  // Get all question labels from the first result
  const firstResult = results[0];
  const qLabels = firstResult.questions.map((q) => q.questionLabel);

  const headers = [
    'Sheet Name',
    'Total Score',
    'Max Score',
    'Percentage (%)',
    'Status',
    'Answered',
    'Correct',
    'Incorrect',
    'Unmarked',
    'Multi-Marked',
    ...qLabels,
  ];

  const rows = results.map((res) => {
    const status = res.percentage >= 60 ? 'PASS' : 'FAIL';
    const qAnswers = res.questions.map((q) => q.detectedAnswers.join('+') || 'BLANK');

    return [
      `"${res.sheetName.replace(/"/g, '""')}"`,
      res.totalScore,
      res.maxScore,
      `${res.percentage}%`,
      status,
      res.answeredCount,
      res.correctCount,
      res.incorrectCount,
      res.unmarkedCount,
      res.multiCount,
      ...qAnswers,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Parses an answer key CSV (e.g., "q1,C\nq2,E")
 */
export function parseAnswerKeyCSV(csvContent: string): Record<string, string> {
  const lines = csvContent.split(/\r?\n/);
  const answers: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check comma or tab or space separator
    const parts = trimmed.split(/,|\t|;/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length >= 2) {
      const q = parts[0].toLowerCase();
      const ans = parts[1].toUpperCase();
      if (q && ans) {
        answers[q] = ans;
      }
    }
  }

  return answers;
}

/**
 * Exports current answer key to CSV format
 */
export function exportAnswerKeyToCSV(answerKey: AnswerKeyConfig): string {
  const rows: string[] = ['Question,Answer'];
  const sortedKeys = Object.keys(answerKey.answers).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  for (const q of sortedKeys) {
    rows.push(`${q},${answerKey.answers[q]}`);
  }

  return rows.join('\n');
}

/**
 * Triggers a browser file download
 */
export function downloadFile(content: string, fileName: string, mimeType: string = 'text/csv') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
