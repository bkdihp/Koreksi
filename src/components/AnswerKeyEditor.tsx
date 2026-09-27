import React, { useRef } from 'react';
import {
  Key,
  Download,
  Upload,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { OMRTemplate, AnswerKeyConfig, MarkingScheme } from '../types';
import { expandFieldLabels, getOptionsForFieldType } from '../utils/omrDetector';
import { exportAnswerKeyToCSV, parseAnswerKeyCSV, downloadFile } from '../utils/csvHelper';

interface AnswerKeyEditorProps {
  template: OMRTemplate;
  answerKey: AnswerKeyConfig;
  onUpdateAnswerKey: (newConfig: AnswerKeyConfig) => void;
  onNavigateToGrader: () => void;
}

export const AnswerKeyEditor: React.FC<AnswerKeyEditorProps> = ({
  template,
  answerKey,
  onUpdateAnswerKey,
  onNavigateToGrader,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get all question labels from template
  const allQuestions: { label: string; options: string[] }[] = [];
  for (const block of Object.values(template.fieldBlocks)) {
    const labels = expandFieldLabels(block.fieldLabels);
    const options = getOptionsForFieldType(block.fieldType);
    for (const l of labels) {
      allQuestions.push({ label: l, options });
    }
  }

  const handleSetAnswer = (questionLabel: string, answer: string) => {
    onUpdateAnswerKey({
      ...answerKey,
      answers: {
        ...answerKey.answers,
        [questionLabel]: answer,
      },
    });
  };

  const handleUpdateMarkingScheme = (updates: Partial<MarkingScheme>) => {
    onUpdateAnswerKey({
      ...answerKey,
      markingScheme: {
        ...answerKey.markingScheme,
        ...updates,
      },
    });
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsedAnswers = parseAnswerKeyCSV(content);
          onUpdateAnswerKey({
            ...answerKey,
            answers: {
              ...answerKey.answers,
              ...parsedAnswers,
            },
          });
        } catch (err) {
          console.error('Failed to import CSV:', err);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportCSV = () => {
    const csv = exportAnswerKeyToCSV(answerKey);
    downloadFile(csv, 'answer_key.csv');
  };

  const handleQuickPattern = (pattern: 'cycle' | 'allA' | 'clear') => {
    const newAnswers: Record<string, string> = {};
    const defaultOptions = ['A', 'B', 'C', 'D'];

    allQuestions.forEach((q, idx) => {
      if (pattern === 'allA') {
        newAnswers[q.label] = q.options[0] || 'A';
      } else if (pattern === 'cycle') {
        newAnswers[q.label] = q.options[idx % q.options.length] || defaultOptions[idx % 4];
      }
      // 'clear' leaves newAnswers empty
    });

    onUpdateAnswerKey({
      ...answerKey,
      answers: newAnswers,
    });
  };

  const totalMaxScore = allQuestions.length * answerKey.markingScheme.correct;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <span>Answer Key & Marking Scheme</span>
          </h2>
          <p className="text-xs text-slate-400">
            Define correct options and evaluation weights (evaluation.json & answer_key.csv)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onNavigateToGrader}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-colors"
          >
            <span>Apply to Grader</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Marking Scheme Configuration */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Marking Scheme</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Marks per Correct Answer
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={answerKey.markingScheme.correct}
                    onChange={(e) =>
                      handleUpdateMarkingScheme({ correct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-emerald-400 font-semibold px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                    +marks
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Penalty for Incorrect Answer
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.25"
                    value={answerKey.markingScheme.incorrect}
                    onChange={(e) =>
                      handleUpdateMarkingScheme({ incorrect: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-rose-400 font-semibold px-2 py-1 bg-rose-500/10 rounded border border-rose-500/20">
                    penalty
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Score for Unmarked / Blank
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={answerKey.markingScheme.unmarked}
                  onChange={(e) =>
                    handleUpdateMarkingScheme({ unmarked: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total Questions:</span>
                <span className="font-mono font-bold text-white">{allQuestions.length}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Maximum Obtainable:</span>
                <span className="font-mono font-bold text-emerald-400">{totalMaxScore} marks</span>
              </div>
            </div>
          </div>

          {/* Quick Setup Patterns */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Quick Key Fill</span>
            </h3>
            <p className="text-xs text-slate-400">Instantly populate or test answer patterns</p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => handleQuickPattern('cycle')}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors flex items-center justify-between"
              >
                <span>Cycle A → B → C → D → E</span>
                <span className="text-slate-400 font-mono">1, 2, 3..</span>
              </button>

              <button
                onClick={() => handleQuickPattern('allA')}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors flex items-center justify-between"
              >
                <span>All Option "A"</span>
                <span className="text-slate-400 font-mono">A, A, A..</span>
              </button>

              <button
                onClick={() => handleQuickPattern('clear')}
                className="w-full text-left px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-950/60 text-xs text-rose-300 border border-rose-900/50 transition-colors flex items-center justify-between"
              >
                <span>Clear All Answers</span>
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Answer Key Grid */}
        <div className="lg:col-span-8 bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">Answer Key Matrix</h3>
              <p className="text-xs text-slate-400">Click any option to set the official correct answer</p>
            </div>
            <span className="text-xs font-mono text-indigo-400">
              {Object.keys(answerKey.answers).filter((k) => answerKey.answers[k]).length} / {allQuestions.length} set
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {allQuestions.map((q) => {
              const currentAns = answerKey.answers[q.label] || '';
              return (
                <div
                  key={q.label}
                  className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-300 w-12">
                      {q.label.toUpperCase()}
                    </span>
                    {currentAns ? (
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {currentAns}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Unset</span>
                    )}
                  </div>

                  {/* Option buttons */}
                  <div className="flex items-center gap-1">
                    {q.options.map((opt) => {
                      const isSelected = currentAns === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleSetAnswer(q.label, opt)}
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
