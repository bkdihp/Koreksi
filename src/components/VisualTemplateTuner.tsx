import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Download,
  Upload,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { OMRTemplate, FieldBlock, FieldType } from '../types';
import { expandFieldLabels, getOptionsForFieldType, loadImage } from '../utils/omrDetector';
import { downloadFile } from '../utils/csvHelper';

interface VisualTemplateTunerProps {
  template: OMRTemplate;
  onUpdateTemplate: (newTemplate: OMRTemplate) => void;
  imageUrl: string;
  onNavigateToGrader: () => void;
}

export const VisualTemplateTuner: React.FC<VisualTemplateTunerProps> = ({
  template,
  onUpdateTemplate,
  imageUrl,
  onNavigateToGrader,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Active block being edited
  const blockKeys = Object.keys(template.fieldBlocks);
  const [selectedBlockKey, setSelectedBlockKey] = useState<string>(blockKeys[0] || 'MCQ_Block_1');

  // Load image
  useEffect(() => {
    let isMounted = true;
    if (imageUrl) {
      loadImage(imageUrl)
        .then((img) => {
          if (isMounted) setActiveImage(img);
        })
        .catch((err) => console.error('Tuner failed to load image:', err));
    }
    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  // Keep selectedBlockKey valid
  useEffect(() => {
    if (!template.fieldBlocks[selectedBlockKey] && blockKeys.length > 0) {
      setSelectedBlockKey(blockKeys[0]);
    }
  }, [template, selectedBlockKey, blockKeys]);

  // Render canvas with template overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const [tplW, tplH] = template.pageDimensions;
    canvas.width = tplW;
    canvas.height = tplH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background image if available, else clean neutral canvas
    if (activeImage) {
      ctx.drawImage(activeImage, 0, 0, tplW, tplH);
    } else {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, tplW, tplH);
    }

    const [bubbleW, bubbleH] = template.bubbleDimensions;

    // Draw all field blocks
    for (const bKey of Object.keys(template.fieldBlocks)) {
      const block = template.fieldBlocks[bKey];
      const isSelected = bKey === selectedBlockKey;
      const labels = expandFieldLabels(block.fieldLabels);
      const options = getOptionsForFieldType(block.fieldType);
      const [originX, originY] = block.origin;

      const blockWidth = (options.length - 1) * block.bubblesGap + bubbleW;
      const blockHeight = (labels.length - 1) * block.labelsGap + bubbleH;

      // Draw bounding box for the block
      ctx.strokeStyle = isSelected ? '#4f46e5' : 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      if (isSelected) {
        ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
        ctx.fillRect(originX - 6, originY - 6, blockWidth + 12, blockHeight + 12);
      }
      ctx.strokeRect(originX - 6, originY - 6, blockWidth + 12, blockHeight + 12);

      // Block header badge
      ctx.fillStyle = isSelected ? '#4f46e5' : '#64748b';
      ctx.fillRect(originX - 6, originY - 24, Math.max(90, bKey.length * 8 + 14), 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(bKey, originX - 2, originY - 11);

      // Draw bubbles and labels
      for (let r = 0; r < labels.length; r++) {
        const rowY = originY + r * block.labelsGap;
        const qLabel = labels[r];

        // Question label on the left
        ctx.fillStyle = isSelected ? '#1e1b4b' : '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(qLabel, originX - 10, rowY + bubbleH / 2 + 4);

        for (let c = 0; c < options.length; c++) {
          const opt = options[c];
          const colX = originX + c * block.bubblesGap;
          const centerX = colX + bubbleW / 2;
          const centerY = rowY + bubbleH / 2;
          const radius = Math.min(bubbleW, bubbleH) / 2;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(100, 116, 139, 0.6)';
          ctx.lineWidth = isSelected ? 2 : 1.2;
          ctx.stroke();

          // Option label inside
          ctx.fillStyle = isSelected ? '#1d4ed8' : '#64748b';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(opt, centerX, centerY);
        }
      }
    }
  }, [template, selectedBlockKey, activeImage]);

  // Block modification helpers
  const currentBlock = template.fieldBlocks[selectedBlockKey];

  const updateCurrentBlock = (updates: Partial<FieldBlock>) => {
    if (!currentBlock) return;
    const updatedBlock = { ...currentBlock, ...updates };
    onUpdateTemplate({
      ...template,
      fieldBlocks: {
        ...template.fieldBlocks,
        [selectedBlockKey]: updatedBlock,
      },
    });
  };

  const handleNudge = (dx: number, dy: number) => {
    if (!currentBlock) return;
    const [x, y] = currentBlock.origin;
    updateCurrentBlock({
      origin: [Math.max(0, x + dx), Math.max(0, y + dy)],
    });
  };

  const handleAddNewBlock = () => {
    const newKey = `MCQ_Block_${blockKeys.length + 1}`;
    const newBlock: FieldBlock = {
      fieldType: 'QTYPE_MCQ5',
      origin: [60, 60],
      fieldLabels: [`q${(blockKeys.length * 5) + 1}..${(blockKeys.length + 1) * 5}`],
      labelsGap: 50,
      bubblesGap: 40,
    };
    onUpdateTemplate({
      ...template,
      fieldBlocks: {
        ...template.fieldBlocks,
        [newKey]: newBlock,
      },
    });
    setSelectedBlockKey(newKey);
  };

  const handleDeleteBlock = (keyToDelete: string) => {
    if (blockKeys.length <= 1) return; // Keep at least one
    const newFieldBlocks = { ...template.fieldBlocks };
    delete newFieldBlocks[keyToDelete];
    const remainingKeys = Object.keys(newFieldBlocks);
    onUpdateTemplate({
      ...template,
      fieldBlocks: newFieldBlocks,
    });
    setSelectedBlockKey(remainingKeys[0]);
  };

  const handleExportTemplateJSON = () => {
    const jsonStr = JSON.stringify(template, null, 2);
    downloadFile(jsonStr, 'template.json', 'application/json');
  };

  const handleCopyJSON = () => {
    const jsonStr = JSON.stringify(template, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleImportTemplateJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.pageDimensions && parsed.bubbleDimensions && parsed.fieldBlocks) {
            onUpdateTemplate(parsed as OMRTemplate);
          } else {
            alert('Invalid template.json schema. Required: pageDimensions, bubbleDimensions, fieldBlocks');
          }
        } catch (err) {
          console.error('Failed to parse template JSON:', err);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Visual Template Layout Tuner</span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              --setLayout
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Calibrate bubble grid origins, spacing, and dimensions live over the sheet scan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportTemplateJSON}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import template.json</span>
          </button>

          <button
            onClick={handleExportTemplateJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleCopyJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Copied!' : 'Copy Config'}</span>
          </button>

          <button
            onClick={onNavigateToGrader}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-colors"
          >
            <span>Test in Grader</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Studio: Canvas visualizer (left) + Tuning Controls (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visualizer Canvas */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col space-y-3">
          {/* Viewport controls */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">
              Live Preview: {template.pageDimensions[0]} × {template.pageDimensions[1]} px
            </span>

            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-1 hover:text-white text-slate-400 rounded"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-300">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-1 hover:text-white text-slate-400 rounded"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:text-white text-slate-400 rounded"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="relative min-h-[480px] max-h-[660px] flex items-center justify-center overflow-auto rounded-xl bg-slate-950 border border-slate-800/80 p-4">
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

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span>Blue circles: Template layout coordinates. Purple box: Selected block.</span>
            <span>Origin: [{currentBlock?.origin[0]}, {currentBlock?.origin[1]}]</span>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Block Selector & Add Block */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Field Blocks</span>
              </h3>

              <button
                onClick={handleAddNewBlock}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Block</span>
              </button>
            </div>

            {/* Block Pills */}
            <div className="flex flex-wrap gap-2">
              {blockKeys.map((key) => {
                const isSelected = key === selectedBlockKey;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                    }`}
                    onClick={() => setSelectedBlockKey(key)}
                  >
                    <span>{key}</span>
                    {blockKeys.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBlock(key);
                        }}
                        className="text-slate-400 hover:text-rose-400 ml-1 p-0.5 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Block Tuner Controls */}
            {currentBlock && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                {/* Field Type & Labels */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Field Type</label>
                    <select
                      value={currentBlock.fieldType}
                      onChange={(e) => updateCurrentBlock({ fieldType: e.target.value as FieldType })}
                      className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="QTYPE_MCQ5">MCQ 5 (A-E)</option>
                      <option value="QTYPE_MCQ4">MCQ 4 (A-D)</option>
                      <option value="QTYPE_INT">Numeric (0-9)</option>
                      <option value="QTYPE_YES_NO">Yes / No (Y, N)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Question Labels</label>
                    <input
                      type="text"
                      value={currentBlock.fieldLabels.join(', ')}
                      onChange={(e) =>
                        updateCurrentBlock({
                          fieldLabels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g. q1..5 or q1, q2, q3"
                      className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Origin Position Nudge Pad */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold">Origin Position [X, Y]</span>
                    <span className="font-mono text-indigo-400">
                      X: {currentBlock.origin[0]}px, Y: {currentBlock.origin[1]}px
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    {/* Left */}
                    <button
                      onClick={() => handleNudge(-5, 0)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 font-mono"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => handleNudge(-1, 0)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Up / Down */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleNudge(0, -1)}
                        className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleNudge(0, 1)}
                        className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Right */}
                    <button
                      onClick={() => handleNudge(1, 0)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleNudge(5, 0)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 font-mono"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* Spacing Sliders */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Bubbles Gap (Horizontal Option Spacing)</span>
                      <span className="font-mono text-indigo-400 font-bold">{currentBlock.bubblesGap}px</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={120}
                      value={currentBlock.bubblesGap}
                      onChange={(e) => updateCurrentBlock({ bubblesGap: parseInt(e.target.value, 10) })}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Labels Gap (Vertical Question Spacing)</span>
                      <span className="font-mono text-indigo-400 font-bold">{currentBlock.labelsGap}px</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={150}
                      value={currentBlock.labelsGap}
                      onChange={(e) => updateCurrentBlock({ labelsGap: parseInt(e.target.value, 10) })}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Global Dimensions */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Global Dimensions</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bubble Size (W × H)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={template.bubbleDimensions[0]}
                    onChange={(e) =>
                      onUpdateTemplate({
                        ...template,
                        bubbleDimensions: [parseInt(e.target.value, 10) || 20, template.bubbleDimensions[1]],
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg px-2 py-1.5 text-white font-mono text-center"
                  />
                  <span className="text-slate-500">×</span>
                  <input
                    type="number"
                    value={template.bubbleDimensions[1]}
                    onChange={(e) =>
                      onUpdateTemplate({
                        ...template,
                        bubbleDimensions: [template.bubbleDimensions[0], parseInt(e.target.value, 10) || 20],
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg px-2 py-1.5 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Page Dimensions (W × H)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={template.pageDimensions[0]}
                    onChange={(e) =>
                      onUpdateTemplate({
                        ...template,
                        pageDimensions: [parseInt(e.target.value, 10) || 300, template.pageDimensions[1]],
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg px-2 py-1.5 text-white font-mono text-center"
                  />
                  <span className="text-slate-500">×</span>
                  <input
                    type="number"
                    value={template.pageDimensions[1]}
                    onChange={(e) =>
                      onUpdateTemplate({
                        ...template,
                        pageDimensions: [template.pageDimensions[0], parseInt(e.target.value, 10) || 400],
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg px-2 py-1.5 text-white font-mono text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
