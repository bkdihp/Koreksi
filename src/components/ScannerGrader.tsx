import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  RefreshCw,
  Download,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import {
  OMRTemplate,
  AnswerKeyConfig,
  SheetEvaluationResult,
} from '../types';
import { evaluateOMRSheet, drawAnnotatedSheet, loadImage, generateSyntheticSheet } from '../utils/omrDetector';
import { exportResultsToCSV, downloadFile } from '../utils/csvHelper';

interface ScannerGraderProps {
  template: OMRTemplate;
  answerKey: AnswerKeyConfig;
  imageUrl: string;
  onUpdateImageUrl: (url: string) => void;
  onNavigateToTuner: () => void;
}

export const ScannerGrader: React.FC<ScannerGraderProps> = ({
  template,
  answerKey,
  imageUrl,
  onUpdateImageUrl,
  onNavigateToTuner,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<SheetEvaluationResult | null>(null);
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);

  // Overlay options
  const [showBubbles, setShowBubbles] = useState(true);
  const [showStatusColors, setShowStatusColors] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showConfidence, setShowConfidence] = useState(false);

  // Zoom scale
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number | null>(null);

  // Run evaluation whenever imageUrl, template, or answerKey changes
  useEffect(() => {
    let isMounted = true;

    async function processSheet() {
      if (!imageUrl) return;
      setLoading(true);
      try {
        const loadedImg = await loadImage(imageUrl);
        if (!isMounted) return;
        setActiveImage(loadedImg);

        const result = await evaluateOMRSheet(
          loadedImg,
          template,
          answerKey,
          imageUrl.split('/').pop() || 'Sheet_Scan'
        );

        if (!isMounted) return;
        setEvaluationResult(result);
      } catch (err) {
        console.error('Failed to process OMR sheet:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    processSheet();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, template, answerKey]);

  // Redraw annotated canvas when display options or results change
  useEffect(() => {
    if (!canvasRef.current || !activeImage || !evaluationResult) return;
    drawAnnotatedSheet(canvasRef.current, activeImage, template, evaluationResult, {
      showBubbles,
      showStatusColors,
      showCoordinates,
      showConfidence,
    });
  }, [evaluationResult, activeImage, template, showBubbles, showStatusColors, showCoordinates, showConfidence]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSynthetic = () => {
    // Generate clean synthetic sheet with current answer key marked
    const syntheticUrl = generateSyntheticSheet(template, answerKey.answers);
    onUpdateImageUrl(syntheticUrl);
  };

  const handleDownloadCSV = () => {
    if (!evaluationResult) return;
    const csv = exportResultsToCSV([evaluationResult]);
    downloadFile(csv, `${evaluationResult.sheetName}_graded.csv`);
  };

  const handleDownloadJSON = () => {
    if (!evaluationResult) return;
    const jsonStr = JSON.stringify(evaluationResult, null, 2);
    downloadFile(jsonStr, `${evaluationResult.sheetName}_report.json`, 'application/json');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>OMR Sheet Evaluator</span>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
          </h2>
          <p className="text-xs text-slate-400">
            Automated bubble recognition using adaptive intensity thresholding and scoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Scan</span>
          </button>

          <button
            onClick={handleGenerateSynthetic}
            title="Generate synthetic clean sample sheet"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate Test Sheet</span>
          </button>

          <button
            onClick={onNavigateToTuner}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tune Layout</span>
          </button>

          {evaluationResult && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Sheet Visualizer & Score Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Canvas Visualizer */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col space-y-3">
          {/* Canvas Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 text-xs">
            {/* Visual Overlays Toggles */}
            <div className="flex items-center gap-3">
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={showBubbles}
                  onChange={(e) => setShowBubbles(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Bubbles</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={showStatusColors}
                  onChange={(e) => setShowStatusColors(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Evaluation Marks</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={showCoordinates}
                  onChange={(e) => setShowCoordinates(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Labels</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={showConfidence}
                  onChange={(e) => setShowConfidence(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Darkness %</span>
              </label>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-1 hover:text-white text-slate-400 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-300">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-1 hover:text-white text-slate-400 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:text-white text-slate-400 rounded"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="relative min-h-[460px] max-h-[640px] flex items-center justify-center overflow-auto rounded-xl bg-slate-950 border border-slate-800/80 p-4">
            {loading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-10">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                <p className="text-sm font-medium text-slate-300">Evaluating sheet marks...</p>
              </div>
            )}

            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="shadow-2xl rounded border border-slate-700/60 overflow-hidden"
            >
              <canvas ref={canvasRef} className="block max-w-none" />
            </div>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Correct Mark
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Incorrect Mark
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-blue-400 inline-block" />
                Missed Key
              </span>
            </div>
            <span className="font-mono text-slate-500">
              Template: {template.pageDimensions[0]}x{template.pageDimensions[1]} px
            </span>
          </div>
        </div>

        {/* Right Column: Score Summary & Detailed Question Inspection */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Score Metric Cards */}
          {evaluationResult ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Evaluation Score</h3>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      {evaluationResult.totalScore}
                    </span>
                    <span className="text-lg text-slate-400 font-medium">
                      / {evaluationResult.maxScore} marks
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${
                      evaluationResult.percentage >= 60
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {evaluationResult.percentage}% Score
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {evaluationResult.percentage >= 60 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    evaluationResult.percentage >= 60 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, evaluationResult.percentage))}%` }}
                />
              </div>

              {/* Metric Counters */}
              <div className="grid grid-cols-4 gap-2 text-center pt-2">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-center text-emerald-400 mb-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-white">{evaluationResult.correctCount}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Correct</div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-center text-rose-400 mb-1">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-white">{evaluationResult.incorrectCount}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Wrong</div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-center text-slate-400 mb-1">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-white">{evaluationResult.unmarkedCount}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Blank</div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-center text-amber-400 mb-1">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-white">{evaluationResult.multiCount}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Multi</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center text-slate-400">
              <ImageIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No evaluation loaded.</p>
            </div>
          )}

          {/* Question Breakdown Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Question Breakdown</h3>
              <span className="text-xs text-slate-400 font-mono">
                {evaluationResult?.questions.length || 0} Questions
              </span>
            </div>

            <div className="overflow-y-auto max-h-[360px] divide-y divide-slate-800/60 mt-2">
              {evaluationResult?.questions.map((q, idx) => {
                const isSelected = selectedQuestionIdx === idx;
                return (
                  <div
                    key={q.questionLabel}
                    onClick={() => setSelectedQuestionIdx(isSelected ? null : idx)}
                    className={`py-2.5 px-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-800/80 ring-1 ring-indigo-500/40' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-xs font-bold text-slate-300 w-10">
                          {q.questionLabel.toUpperCase()}
                        </span>

                        {/* Status Icon */}
                        {q.status === 'correct' && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" /> Correct
                          </span>
                        )}
                        {q.status === 'incorrect' && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Wrong
                          </span>
                        )}
                        {q.status === 'unmarked' && (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            Blank
                          </span>
                        )}
                        {q.status === 'multi' && (
                          <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Multi-Mark
                          </span>
                        )}
                      </div>

                      {/* Marks / Answers */}
                      <div className="flex items-center space-x-3 text-xs">
                        <div className="text-right">
                          <span className="text-slate-400 text-[11px] block">Detected / Key</span>
                          <span className="font-mono font-bold text-white">
                            {q.detectedAnswers.length > 0 ? q.detectedAnswers.join(', ') : '—'}{' '}
                            <span className="text-slate-500 font-normal">/</span>{' '}
                            <span className="text-indigo-400">{q.correctAnswer || 'None'}</span>
                          </span>
                        </div>

                        <span
                          className={`font-mono font-bold text-xs px-2 py-1 rounded ${
                            q.score > 0
                              ? 'bg-emerald-950 text-emerald-400'
                              : q.score < 0
                              ? 'bg-rose-950 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {q.score > 0 ? `+${q.score}` : q.score}
                        </span>
                      </div>
                    </div>

                    {/* Expanded details when question is clicked */}
                    {isSelected && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 pl-2">
                        <p className="text-[11px] text-slate-400 mb-1.5 font-medium">
                          Bubble Darkness Metrics & Confidence:
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {q.bubbleMetrics.map((bm) => (
                            <div
                              key={bm.option}
                              className={`p-1.5 rounded text-center border text-[10px] ${
                                bm.isMarked
                                  ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
                              }`}
                            >
                              <div className="font-bold text-white text-xs">{bm.option}</div>
                              <div className="text-[9px] text-slate-400 font-mono">
                                Fill: {bm.fillPercentage}%
                              </div>
                              <div className="text-[8px] text-slate-500 font-mono">
                                Lum: {Math.round(bm.meanIntensity)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
