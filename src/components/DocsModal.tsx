import React from 'react';
import { BookOpen, CheckCircle, ExternalLink, HelpCircle, Layers, Sliders, X } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">About Koreksi OMR Engine</h3>
              <p className="text-xs text-slate-400">Optical Mark Recognition & Evaluation Architecture</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div>
            <h4 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              What is OMR?
            </h4>
            <p>
              Optical Mark Recognition (OMR) detects and interprets human-marked data on documents such as exams, surveys, and admission tests. By analyzing darkness and contrast relative to background paper, it reliably grades sheets even with xerox noise, variable lighting, or camera angles.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Template Layout Tuning (<code className="font-mono text-indigo-300">--setLayout</code>)
            </h4>
            <p>
              OMRChecker uses a standardized JSON configuration (<code>template.json</code>) defining:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-400">
              <li><strong className="text-slate-200">pageDimensions</strong>: Base width and height of the sheet in pixels.</li>
              <li><strong className="text-slate-200">bubbleDimensions</strong>: Width and height of an individual bubble.</li>
              <li><strong className="text-slate-200">origin [X, Y]</strong>: Coordinates of the top-left bubble in a question block.</li>
              <li><strong className="text-slate-200">bubblesGap</strong>: Horizontal distance between option choices (A, B, C, etc.).</li>
              <li><strong className="text-slate-200">labelsGap</strong>: Vertical distance between sequential questions.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white text-sm mb-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              Grading & Marking Schemes
            </h4>
            <p>
              Compatible with <code>evaluation.json</code> and <code>answer_key.csv</code>:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-400">
              <li><strong className="text-emerald-400">Correct</strong>: Standard positive marks (e.g. +1 or +4).</li>
              <li><strong className="text-rose-400">Incorrect</strong>: Negative marking penalty (e.g. -1 or -0.5).</li>
              <li><strong className="text-slate-400">Unmarked</strong>: Neutral score for blank/skipped questions.</li>
              <li><strong className="text-amber-400">Multi-Marked</strong>: Questions where candidate filled multiple options are penalized.</li>
            </ul>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Koreksi Web v2.0 • AI Studio
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
