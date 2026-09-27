import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { ScannerGrader } from './components/ScannerGrader';
import { VisualTemplateTuner } from './components/VisualTemplateTuner';
import { BatchGrader } from './components/BatchGrader';
import { AnswerKeyEditor } from './components/AnswerKeyEditor';
import { DocsModal } from './components/DocsModal';
import { SAMPLE_PRESETS } from './constants/presets';
import { OMRTemplate, AnswerKeyConfig, SamplePreset } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'tuner' | 'batch' | 'answerKey'>('scanner');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SAMPLE_PRESETS[0].id);

  // Template, Answer Key, and active Image state
  const [template, setTemplate] = useState<OMRTemplate>(SAMPLE_PRESETS[0].template);
  const [answerKey, setAnswerKey] = useState<AnswerKeyConfig>(SAMPLE_PRESETS[0].answerKey);
  const [imageUrl, setImageUrl] = useState<string>(SAMPLE_PRESETS[0].imageUrl);

  // Docs Modal
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);

  const handleSelectPreset = (preset: SamplePreset) => {
    setSelectedPresetId(preset.id);
    setTemplate(preset.template);
    setAnswerKey(preset.answerKey);
    if (preset.imageUrl) {
      setImageUrl(preset.imageUrl);
    }
  };

  const handleSelectSheetForInspection = (sheetUrl: string) => {
    setImageUrl(sheetUrl);
    setActiveTab('scanner');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-indigo-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'scanner' && (
          <ScannerGrader
            template={template}
            answerKey={answerKey}
            imageUrl={imageUrl}
            onUpdateImageUrl={setImageUrl}
            onNavigateToTuner={() => setActiveTab('tuner')}
          />
        )}

        {activeTab === 'tuner' && (
          <VisualTemplateTuner
            template={template}
            onUpdateTemplate={setTemplate}
            imageUrl={imageUrl}
            onNavigateToGrader={() => setActiveTab('scanner')}
          />
        )}

        {activeTab === 'batch' && (
          <BatchGrader
            template={template}
            answerKey={answerKey}
            onSelectSheetForInspection={handleSelectSheetForInspection}
          />
        )}

        {activeTab === 'answerKey' && (
          <AnswerKeyEditor
            template={template}
            answerKey={answerKey}
            onUpdateAnswerKey={setAnswerKey}
            onNavigateToGrader={() => setActiveTab('scanner')}
          />
        )}
      </main>

      <DocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>Koreksi • Fast and Accurate Optical Mark Recognition (OMR) Checker</p>
      </footer>
    </div>
  );
};

export default App;
