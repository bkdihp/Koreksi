import {
  OMRTemplate,
  FieldBlock,
  FieldType,
  AnswerKeyConfig,
  BubbleMetric,
  QuestionResult,
  SheetEvaluationResult,
} from '../types';

/**
 * Expands label ranges like "q1..5" into ["q1", "q2", "q3", "q4", "q5"]
 */
export function expandFieldLabels(labels: string[]): string[] {
  const result: string[] = [];
  for (const label of labels) {
    const rangeMatch = label.match(/^([a-zA-Z_]+)(\d+)\.\.(\d+)$/);
    if (rangeMatch) {
      const prefix = rangeMatch[1];
      const start = parseInt(rangeMatch[2], 10);
      const end = parseInt(rangeMatch[3], 10);
      for (let i = start; i <= end; i++) {
        result.push(`${prefix}${i}`);
      }
    } else {
      result.push(label);
    }
  }
  return result;
}

/**
 * Returns the options for a given field type
 */
export function getOptionsForFieldType(fieldType: FieldType): string[] {
  switch (fieldType) {
    case 'QTYPE_MCQ5':
      return ['A', 'B', 'C', 'D', 'E'];
    case 'QTYPE_MCQ4':
      return ['A', 'B', 'C', 'D'];
    case 'QTYPE_INT':
      return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    case 'QTYPE_YES_NO':
      return ['Y', 'N'];
    default:
      return ['A', 'B', 'C', 'D'];
  }
}

/**
 * Loads an image from URL or data URI into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image from ${src}: ${err}`));
    img.src = src;
  });
}

/**
 * Optical Mark Recognition detector using HTML Canvas
 */
export async function evaluateOMRSheet(
  imageSource: HTMLImageElement | string,
  template: OMRTemplate,
  answerKey: AnswerKeyConfig,
  sheetName: string = 'OMR Sheet'
): Promise<SheetEvaluationResult> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;

  const [tplWidth, tplHeight] = template.pageDimensions;
  const [bubbleW, bubbleH] = template.bubbleDimensions;

  // Offscreen canvas matching template dimensions exactly
  const canvas = document.createElement('canvas');
  canvas.width = tplWidth;
  canvas.height = tplHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to create canvas 2d context for image processing');
  }

  // Draw image stretched/scaled to template dimensions
  ctx.drawImage(img, 0, 0, tplWidth, tplHeight);
  const imgData = ctx.getImageData(0, 0, tplWidth, tplHeight);
  const data = imgData.data;

  // Helper to get pixel grayscale at (x, y)
  const getGrayscale = (x: number, y: number): number => {
    const clampedX = Math.max(0, Math.min(tplWidth - 1, Math.floor(x)));
    const clampedY = Math.max(0, Math.min(tplHeight - 1, Math.floor(y)));
    const idx = (clampedY * tplWidth + clampedX) * 4;
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  };

  // Compute paper background mean intensity across sample regions
  let paperSampleSum = 0;
  let paperSampleCount = 0;
  for (let py = 10; py < tplHeight; py += 30) {
    for (let px = 10; px < tplWidth; px += 30) {
      paperSampleSum += getGrayscale(px, py);
      paperSampleCount++;
    }
  }
  const paperBaseline = paperSampleCount > 0 ? paperSampleSum / paperSampleCount : 240;

  const questionResults: QuestionResult[] = [];
  let answeredCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unmarkedCount = 0;
  let multiCount = 0;
  let totalScore = 0;

  // Process each field block
  for (const blockKey of Object.keys(template.fieldBlocks)) {
    const block = template.fieldBlocks[blockKey];
    const labels = expandFieldLabels(block.fieldLabels);
    const options = getOptionsForFieldType(block.fieldType);
    const [originX, originY] = block.origin;

    for (let qIdx = 0; qIdx < labels.length; qIdx++) {
      const qLabel = labels[qIdx];
      const bubbleRowY = originY + qIdx * block.labelsGap;

      const bubbleMetrics: BubbleMetric[] = [];
      const stripIntensities: number[] = [];

      // Sample every bubble in this question row
      for (let optIdx = 0; optIdx < options.length; optIdx++) {
        const option = options[optIdx];
        const bubbleX = originX + optIdx * block.bubblesGap;
        const bubbleY = bubbleRowY;

        // Inset by 18% to focus on the center where pencil marks are placed
        const insetX = bubbleW * 0.18;
        const insetY = bubbleH * 0.18;
        const sampleW = bubbleW - insetX * 2;
        const sampleH = bubbleH - insetY * 2;

        let pixelSum = 0;
        let sampleCount = 0;
        let darkPixelCount = 0;

        for (let sy = 0; sy < sampleH; sy += 2) {
          for (let sx = 0; sx < sampleW; sx += 2) {
            const val = getGrayscale(bubbleX + insetX + sx, bubbleY + insetY + sy);
            pixelSum += val;
            sampleCount++;
            if (val < 165) {
              darkPixelCount++;
            }
          }
        }

        const meanIntensity = sampleCount > 0 ? pixelSum / sampleCount : 255;
        const fillPercentage = sampleCount > 0 ? Math.min(100, Math.round((darkPixelCount / sampleCount) * 100)) : 0;

        stripIntensities.push(meanIntensity);
        bubbleMetrics.push({
          label: qLabel,
          option,
          x: bubbleX,
          y: bubbleY,
          width: bubbleW,
          height: bubbleH,
          meanIntensity,
          fillPercentage,
          isMarked: false, // determined below
        });
      }

      // Determine marked bubbles for this question
      // Paper brightness is typically ~220-250. Filled bubble is usually < 140-160.
      const minIntensity = Math.min(...stripIntensities);
      const maxIntensity = Math.max(...stripIntensities);
      const contrast = maxIntensity - minIntensity;

      const detectedAnswers: string[] = [];
      for (let i = 0; i < bubbleMetrics.length; i++) {
        const bm = bubbleMetrics[i];
        // Condition 1: High absolute fill percentage (> 30%)
        // Condition 2: Mean intensity significantly lower than paper baseline (< 175) AND has significant contrast
        // Condition 3: Is closest to min intensity with at least 25 margin from paper baseline
        const isMarked =
          bm.fillPercentage >= 28 ||
          (bm.meanIntensity < 175 && (contrast > 28 || bm.meanIntensity < paperBaseline - 45)) ||
          (contrast > 35 && bm.meanIntensity === minIntensity && bm.meanIntensity < 195);

        if (isMarked) {
          bm.isMarked = true;
          detectedAnswers.push(bm.option);
        }
      }

      const expectedAnswer = answerKey.answers[qLabel] || '';
      let status: 'correct' | 'incorrect' | 'unmarked' | 'multi' = 'unmarked';
      let qScore = 0;

      if (detectedAnswers.length === 0) {
        status = 'unmarked';
        unmarkedCount++;
        qScore = answerKey.markingScheme.unmarked;
      } else if (detectedAnswers.length > 1) {
        status = 'multi';
        multiCount++;
        answeredCount++;
        qScore = answerKey.markingScheme.incorrect;
      } else {
        answeredCount++;
        const detected = detectedAnswers[0];
        if (expectedAnswer && detected.toUpperCase() === expectedAnswer.toUpperCase()) {
          status = 'correct';
          correctCount++;
          qScore = answerKey.markingScheme.correct;
        } else {
          status = 'incorrect';
          incorrectCount++;
          qScore = answerKey.markingScheme.incorrect;
        }
      }

      totalScore += qScore;

      // Confidence metric based on contrast
      const confidence = Math.min(100, Math.max(30, Math.round((contrast / 150) * 100)));

      questionResults.push({
        questionLabel: qLabel,
        options,
        detectedAnswers,
        correctAnswer: expectedAnswer,
        status,
        score: qScore,
        confidence,
        bubbleMetrics,
      });
    }
  }

  const totalQuestions = questionResults.length;
  const maxScore = totalQuestions * answerKey.markingScheme.correct;
  const percentage = maxScore > 0 ? Math.max(0, Math.round((totalScore / maxScore) * 100)) : 0;

  return {
    sheetId: 'sheet-' + Math.random().toString(36).substring(2, 9),
    sheetName,
    imageUrl: typeof imageSource === 'string' ? imageSource : img.src,
    evaluatedAt: new Date().toLocaleTimeString(),
    totalQuestions,
    answeredCount,
    correctCount,
    incorrectCount,
    unmarkedCount,
    multiCount,
    totalScore,
    maxScore,
    percentage,
    questions: questionResults,
    rawImageWidth: img.naturalWidth || tplWidth,
    rawImageHeight: img.naturalHeight || tplHeight,
  };
}

/**
 * Draws an annotated visualization of the evaluated OMR sheet
 */
export function drawAnnotatedSheet(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  template: OMRTemplate,
  result: SheetEvaluationResult,
  options: {
    showBubbles?: boolean;
    showStatusColors?: boolean;
    showCoordinates?: boolean;
    showConfidence?: boolean;
  } = {}
) {
  const {
    showBubbles = true,
    showStatusColors = true,
    showCoordinates = false,
    showConfidence = false,
  } = options;

  const [tplW, tplH] = template.pageDimensions;
  canvas.width = tplW;
  canvas.height = tplH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Draw base image
  ctx.drawImage(image, 0, 0, tplW, tplH);

  // Group metrics by question
  for (const q of result.questions) {
    for (const b of q.bubbleMetrics) {
      const isExpected = q.correctAnswer && b.option.toUpperCase() === q.correctAnswer.toUpperCase();
      const isMarked = b.isMarked;

      if (showBubbles) {
        ctx.beginPath();
        const radius = Math.min(b.width, b.height) / 2;
        const centerX = b.x + b.width / 2;
        const centerY = b.y + b.height / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

        if (showStatusColors) {
          if (isMarked && isExpected) {
            // Correct mark -> Green highlight
            ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
            ctx.fill();
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 3;
            ctx.stroke();
          } else if (isMarked && !isExpected) {
            // Incorrect mark -> Red highlight
            ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
            ctx.fill();
            ctx.strokeStyle = '#b91c1c';
            ctx.lineWidth = 3;
            ctx.stroke();
          } else if (!isMarked && isExpected) {
            // Expected answer that student missed -> Blue outline dashed ring
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            // Normal unmarked bubble outline
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } else {
          ctx.strokeStyle = isMarked ? '#e11d48' : '#3b82f6';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Option letter inside or nearby if requested
        if (showCoordinates) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.option, centerX, centerY);
        }
      }

      // Confidence badge
      if (showConfidence && isMarked) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(b.x - 2, b.y - 12, 32, 11);
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${bmFill(b.fillPercentage)}%`, b.x, b.y - 3);
      }
    }
  }
}

function bmFill(val: number): number {
  return Math.min(100, Math.max(0, Math.round(val)));
}

/**
 * Creates a synthetic clean OMR sheet image for testing when no image is loaded
 */
export function generateSyntheticSheet(template: OMRTemplate, markedAnswers: Record<string, string>): string {
  const [tplW, tplH] = template.pageDimensions;
  const [bubbleW, bubbleH] = template.bubbleDimensions;

  const canvas = document.createElement('canvas');
  canvas.width = tplW;
  canvas.height = tplH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background sheet
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, tplW, tplH);

  // Border alignment marks (like registration markers in OMR sheets)
  ctx.fillStyle = '#0f172a';
  const markerSize = 16;
  ctx.fillRect(8, 8, markerSize, markerSize);
  ctx.fillRect(tplW - markerSize - 8, 8, markerSize, markerSize);
  ctx.fillRect(8, tplH - markerSize - 8, markerSize, markerSize);
  ctx.fillRect(tplW - markerSize - 8, tplH - markerSize - 8, markerSize, markerSize);

  // Draw title banner
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OMR ANSWER SHEET', tplW / 2, 28);
  ctx.font = '10px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`KOREKSI ENGINE v2.0 - [${tplW}x${tplH}]`, tplW / 2, 42);

  // Draw fields
  for (const blockKey of Object.keys(template.fieldBlocks)) {
    const block = template.fieldBlocks[blockKey];
    const labels = expandFieldLabels(block.fieldLabels);
    const options = getOptionsForFieldType(block.fieldType);
    const [originX, originY] = block.origin;

    for (let qIdx = 0; qIdx < labels.length; qIdx++) {
      const qLabel = labels[qIdx];
      const bubbleRowY = originY + qIdx * block.labelsGap;

      // Question label
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(qLabel.toUpperCase(), originX - 12, bubbleRowY + bubbleH / 2 + 4);

      // Bubbles
      for (let optIdx = 0; optIdx < options.length; optIdx++) {
        const opt = options[optIdx];
        const bubbleX = originX + optIdx * block.bubblesGap;
        const centerX = bubbleX + bubbleW / 2;
        const centerY = bubbleRowY + bubbleH / 2;
        const radius = Math.min(bubbleW, bubbleH) / 2;

        const isMarked = markedAnswers[qLabel] && markedAnswers[qLabel].toUpperCase() === opt.toUpperCase();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

        if (isMarked) {
          // Pencil fill simulation
          ctx.fillStyle = '#262626';
          ctx.fill();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Option letter inside
          ctx.fillStyle = '#475569';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(opt, centerX, centerY);
        }
      }
    }
  }

  return canvas.toDataURL('image/png');
}
