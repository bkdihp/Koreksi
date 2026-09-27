import React from 'react';
import { CheckCircle2, Sliders, Layers, Key, BookOpen, Sparkles } from 'lucide-react';
import { SamplePreset } from '../types';
import { SAMPLE_PRESETS } from '../constants/presets';

interface NavbarProps {
  activeTab: 'scanner' | 'tuner' | 'batch' | 'answerKey';
  onSelectTab: (tab: 'scanner' | 'tuner' | 'batch' | 'answerKey') => void;
  selectedPresetId: string;
  onSelectPreset: (preset: SamplePreset) => void;
  onOpenDocs: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  selectedPresetId,
  onSelectPreset,
  onOpenDocs,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">Koreksi</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  OMR v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Optical Mark Recognition & Grading Engine</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => onSelectTab('scanner')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'scanner'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Grader</span>
            </button>

            <button
              onClick={() => onSelectTab('tuner')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tuner'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Layout Tuner</span>
            </button>

            <button
              onClick={() => onSelectTab('batch')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'batch'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Batch Scan</span>
            </button>

            <button
              onClick={() => onSelectTab('answerKey')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'answerKey'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Answer Key</span>
            </button>
          </nav>

          {/* Preset Selector & Docs */}
          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Preset:
              </span>
              <select
                value={selectedPresetId}
                onChange={(e) => {
                  const preset = SAMPLE_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) onSelectPreset(preset);
                }}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {SAMPLE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenDocs}
              title="Documentation & About"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
