import React, { useState, useRef } from 'react';
import {
  Layers,
  Upload,
  Play,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Trophy,
  BarChart3,
  Percent,
} from 'lucide-react';
import { OMRTemplate, AnswerKeyConfig, SheetEvaluationResult } from '../types';
import { evaluateOMRSheet, loadImage } from '../utils/omrDetector';
import { exportResultsToCSV, downloadFile } from '../utils/csvHelper';

interface BatchGraderProps {
  template: OMRTemplate;
  answerKey: AnswerKeyConfig;
  onSelectSheetForInspection: (imageUrl: string) => void;
}

interface BatchItem {
  id: string;
  name: string;
  url: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: SheetEvaluationResult;
}

export const BatchGrader: React.FC<BatchGraderProps> = ({
  template,
  answerKey,
  onSelectSheetForInspection,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initial batch includes standard repo sample sheets
  const [batchList, setBatchList] = useState<BatchItem[]>([
    {
      id: 'item-1',
      name: 'adrian_omr_1.png (Student A)',
      url: '/samples/adrian_omr_1.png',
      status: 'pending',
    },
    {
      id: 'item-2',
      name: 'adrian_omr_2.png (Student B)',
      url: '/samples/adrian_omr_2.png',
      status: 'pending',
    },
    {
      id: 'item-3',
      name: 'simple_omr.jpg (Student C)',
      url: '/samples/simple_omr.jpg',
      status: 'pending',
    },
  ]);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [selectedResultModal, setSelectedResultModal] = useState<SheetEvaluationResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BatchItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newItems.push({
        id: `upload-${Date.now()}-${i}`,
        name: file.name,
        url,
        status: 'pending',
      });
    }

    setBatchList((prev) => [...prev, ...newItems]);
  };

  const handleRunBatch = async () => {
    setIsProcessing(true);
    setCompletedCount(0);

    const currentList = [...batchList];

    for (let i = 0; i < currentList.length; i++) {
      currentList[i].status = 'processing';
      setBatchList([...currentList]);

      try {
        const img = await loadImage(currentList[i].url);
        const result = await evaluateOMRSheet(img, template, answerKey, currentList[i].name);
        currentList[i].status = 'done';
        currentList[i].result = result;
      } catch (err) {
        console.error(`Error grading ${currentList[i].name}:`, err);
        currentList[i].status = 'error';
      }

      setCompletedCount(i + 1);
      setBatchList([...currentList]);
    }

    setIsProcessing(false);
  };

  const completedResults = batchList
    .map((item) => item.result)
    .filter((res): res is SheetEvaluationResult => Boolean(res));

  // Calculate Batch Analytics
  const totalCompleted = completedResults.length;
  const avgScore =
    totalCompleted > 0
      ? Math.round(completedResults.reduce((acc, r) => acc + r.percentage, 0) / totalCompleted)
      : 0;
  const passedCount = completedResults.filter((r) => r.percentage >= 60).length;
  const passRate = totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0;
  const highestScore =
    totalCompleted > 0 ? Math.max(...completedResults.map((r) => r.totalScore)) : 0;
  const lowestScore =
    totalCompleted > 0 ? Math.min(...completedResults.map((r) => r.totalScore)) : 0;

  // Question difficulty stats (% correct)
  const questionSuccessRate: Record<string, { label: string; correct: number; total: number }> = {};
  for (const r of completedResults) {
    for (const q of r.questions) {
      if (!questionSuccessRate[q.questionLabel]) {
        questionSuccessRate[q.questionLabel] = { label: q.questionLabel, correct: 0, total: 0 };
      }
      questionSuccessRate[q.questionLabel].total++;
      if (q.status === 'correct') {
        questionSuccessRate[q.questionLabel].correct++;
      }
    }
  }

  const handleExportCSV = () => {
    if (completedResults.length === 0) return;
    const csv = exportResultsToCSV(completedResults);
    downloadFile(csv, `batch_omr_results_${Date.now()}.csv`);
  };

  const handleExportJSON = () => {
    if (completedResults.length === 0) return;
    const json = JSON.stringify(completedResults, null, 2);
    downloadFile(json, `batch_omr_results_${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Batch OMR Sheet Grader</span>
          </h2>
          <p className="text-xs text-slate-400">
            Process entire exam batches, surveys, and multi-sheet submissions at once
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add Sheet Images</span>
          </button>

          <button
            onClick={handleRunBatch}
            disabled={isProcessing || batchList.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-colors"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Grading ({completedCount}/{batchList.length})...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Grade All Sheets</span>
              </>
            )}
          </button>

          {completedResults.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Summary */}
      {completedResults.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{totalCompleted}</div>
              <div className="text-xs text-slate-400">Sheets Graded</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{avgScore}%</div>
              <div className="text-xs text-slate-400">Batch Average</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{passRate}%</div>
              <div className="text-xs text-slate-400">Pass Rate (≥ 60%)</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {highestScore} / {lowestScore}
              </div>
              <div className="text-xs text-slate-400">High / Low Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Sheets Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Batch Queue & Results</h3>
          <span className="text-xs font-mono text-slate-400">{batchList.length} items in batch</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Sheet Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Percentage</th>
                <th className="py-3 px-4 text-center">Breakdown (C / W / B)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {batchList.map((item, idx) => {
                const res = item.result;
                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-white max-w-[200px] truncate">
                      {item.name}
                    </td>

                    {/* Status badge */}
                    <td className="py-3 px-4">
                      {item.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400 border border-slate-700">
                          Pending
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 w-fit">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Evaluating
                        </span>
                      )}
                      {item.status === 'done' && res && (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            res.percentage >= 60
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {res.percentage >= 60 ? 'PASS' : 'FAIL'}
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Error
                        </span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-white">
                      {res ? `${res.totalScore} / ${res.maxScore}` : '—'}
                    </td>

                    {/* Percentage */}
                    <td className="py-3 px-4 text-center">
                      {res ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                res.percentage >= 60 ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${res.percentage}%` }}
                            />
                          </div>
                          <span className="font-mono font-semibold text-white">{res.percentage}%</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Breakdown */}
                    <td className="py-3 px-4 text-center font-mono">
                      {res ? (
                        <span className="text-[11px]">
                          <span className="text-emerald-400 font-bold">{res.correctCount}</span>
                          <span className="text-slate-500"> / </span>
                          <span className="text-rose-400 font-bold">{res.incorrectCount}</span>
                          <span className="text-slate-500"> / </span>
                          <span className="text-slate-400">{res.unmarkedCount}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {res && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedResultModal(res)}
                            title="Quick View Details"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectSheetForInspection(item.url)}
                            title="Open in Full Grader"
                            className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition-colors"
                          >
                            Inspect
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick View Modal */}
      {selectedResultModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-white text-base">{selectedResultModal.sheetName}</h4>
                <p className="text-xs text-slate-400">Score Summary & Question Breakdown</p>
              </div>
              <button
                onClick={() => setSelectedResultModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-base font-bold text-white">{selectedResultModal.totalScore}</div>
                <div className="text-[10px] text-slate-400">Total Score</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-base font-bold text-emerald-400">
                  {selectedResultModal.correctCount}
                </div>
                <div className="text-[10px] text-slate-400">Correct</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-base font-bold text-rose-400">
                  {selectedResultModal.incorrectCount}
                </div>
                <div className="text-[10px] text-slate-400">Wrong</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-base font-bold text-slate-400">
                  {selectedResultModal.unmarkedCount}
                </div>
                <div className="text-[10px] text-slate-400">Blank</div>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800">
              {selectedResultModal.questions.map((q) => (
                <div key={q.questionLabel} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-300">{q.questionLabel}</span>
                  <div className="flex items-center space-x-3">
                    <span>
                      Marked: <strong className="text-white">{q.detectedAnswers.join('+') || 'None'}</strong>
                    </span>
                    <span>
                      Key: <strong className="text-indigo-400">{q.correctAnswer}</strong>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        q.status === 'correct'
                          ? 'bg-emerald-950 text-emerald-400'
                          : q.status === 'incorrect'
                          ? 'bg-rose-950 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {q.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedResultModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
