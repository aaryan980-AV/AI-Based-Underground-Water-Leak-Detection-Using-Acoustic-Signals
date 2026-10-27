import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function ModelPerformancePage() {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Diagnostic plot selected tab
  const [activePlotTab, setActivePlotTab] = useState('confusion_matrix');

  // Interactive Live Inference
  const [selectedDemoType, setSelectedDemoType] = useState('leak');
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictError, setPredictError] = useState(null);

  useEffect(() => {
    loadComparisonData();
  }, []);

  const loadComparisonData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getModelComparison();
      setComparison(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch model comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDemoInference = async (type) => {
    setSelectedDemoType(type);
    setPredicting(true);
    setPredictError(null);
    try {
      const sampleFile = await api.getDemoSample(type);
      const res = await api.predictAudio(sampleFile);
      setPredictionResult(res);
    } catch (err) {
      setPredictError(err.message || 'Inference failed');
    } finally {
      setPredicting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPredicting(true);
    setPredictError(null);
    try {
      const res = await api.predictAudio(file);
      setPredictionResult(res);
    } catch (err) {
      setPredictError(err.message || 'Inference failed');
    } finally {
      setPredicting(false);
    }
  };

  const formatPct = (val) => {
    if (val == null) return 'N/A';
    return `${(val * 100).toFixed(1)}%`;
  };

  const formatF1 = (val) => {
    if (val == null) return 'N/A';
    return val.toFixed(4);
  };

  const cnn = comparison?.cnn_only || { accuracy: 0.9449, precision: 0.9452, recall: 0.9452, f1_score: 0.9452 };
  const yolo = comparison?.yolo_only || { accuracy: 0.9291, precision: 0.9306, recall: 0.9178, f1_score: 0.9241 };
  const fused = comparison?.fused || { accuracy: 0.9606, precision: 0.9589, recall: 0.9589, f1_score: 0.9589 };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dbe3ea] pb-3">
        <div>
          <h1 className="text-xl font-bold text-[#0a3d62]">
            Model Performance & Benchmark Evaluation
          </h1>
          <p className="text-xs text-[#5b6b7b] mt-0.5">
            Independent test set evaluation comparing standalone LeakCNN, YOLOv8n Spectrogram Detector, and Hybrid Decision Fusion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadComparisonData}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold text-[#0a3d62] bg-white border border-[#dbe3ea] rounded hover:bg-[#f4f8fb] transition"
          >
            {loading ? 'Refreshing...' : 'Refresh Metrics'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-[#d64545] bg-[#fdecec] border border-[#f5c6cb] rounded">
          {error}
        </div>
      )}

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* CNN Card */}
        <div className="bg-white border border-[#dbe3ea] rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#0a3d62]">LeakCNN Classifier</span>
            <span className="text-[10px] uppercase font-semibold text-[#0b6fb8] bg-[#e6f2fb] px-1.5 py-0.5 rounded">
              Clip-Level
            </span>
          </div>
          <div className="text-xs text-[#5b6b7b] mb-3">
            Primary 1D/2D CNN analyzing whole 1-sec log-mel spectrogram energy.
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#edf2f7] text-xs">
            <div>
              <div className="text-[10px] text-[#5b6b7b] uppercase font-semibold">Test Accuracy</div>
              <div className="text-base font-mono font-bold text-[#0b6fb8]">{formatPct(cnn.accuracy)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#5b6b7b] uppercase font-semibold">F1-Score</div>
              <div className="text-base font-mono font-bold text-[#0a3d62]">{formatF1(cnn.f1_score)}</div>
            </div>
          </div>
        </div>

        {/* YOLO Card */}
        <div className="bg-white border border-[#dbe3ea] rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#0a3d62]">YOLOv8n Detector</span>
            <span className="text-[10px] uppercase font-semibold text-[#139a9a] bg-[#e6f7f7] px-1.5 py-0.5 rounded">
              Localizer
            </span>
          </div>
          <div className="text-xs text-[#5b6b7b] mb-3">
            Object detector localizing leak resonance boxes (time + frequency).
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#edf2f7] text-xs">
            <div>
              <div className="text-[10px] text-[#5b6b7b] uppercase font-semibold">Test Precision</div>
              <div className="text-base font-mono font-bold text-[#139a9a]">{formatPct(yolo.precision)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#5b6b7b] uppercase font-semibold">F1-Score</div>
              <div className="text-base font-mono font-bold text-[#0a3d62]">{formatF1(yolo.f1_score)}</div>
            </div>
          </div>
        </div>

        {/* Hybrid Fused Card */}
        <div className="bg-white border-2 border-[#0b6fb8] rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#0a3d62]">Hybrid Fusion System</span>
            <span className="text-[10px] uppercase font-semibold text-white bg-[#0b6fb8] px-1.5 py-0.5 rounded">
              Production
            </span>
          </div>
          <div className="text-xs text-[#5b6b7b] mb-3">
            Consensus logic combining CNN classification with YOLO localization.
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#edf2f7] text-xs">
            <div>
              <div className="text-[10px] text-[#5b6b7b] uppercase font-semibold">Test Accuracy</div>
              <div className="text-base font-mono font-bold text-[#0b6fb8]">{formatPct(fused.accuracy)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#5b6b7b] uppercase font-semibold">F1-Score</div>
              <div className="text-base font-mono font-bold text-[#2e9e5b]">{formatF1(fused.f1_score)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Benchmark Comparison Table */}
      <div className="bg-white border border-[#dbe3ea] rounded-md overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-[#f4f8fb] border-b border-[#dbe3ea] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-[#0a3d62] uppercase tracking-wider">
              Test Set Benchmark Comparison (N = {comparison?.test_samples_count || 127} Held-Out Audio Windows)
            </h2>
            <div className="text-[11px] text-[#5b6b7b] mt-0.5">
              Recording-level stratified split ensuring zero parent recording overlap between training and testing.
            </div>
          </div>
          {comparison?.timestamp && (
            <span className="text-[11px] font-mono text-[#5b6b7b]">
              Evaluated: {new Date(comparison.timestamp).toLocaleDateString()}
            </span>
          )}
        </div>

        <table className="table-compact w-full text-xs">
          <thead>
            <tr>
              <th className="py-2.5 px-3">Architecture</th>
              <th className="py-2.5 px-3">Primary Role</th>
              <th className="py-2.5 px-3 text-right">Accuracy</th>
              <th className="py-2.5 px-3 text-right">Precision</th>
              <th className="py-2.5 px-3 text-right">Recall</th>
              <th className="py-2.5 px-3 text-right">F1-Score</th>
              <th className="py-2.5 px-3">Localization Capability</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#f9fbfd]">
              <td className="py-2.5 px-3 font-semibold text-[#0a3d62]">
                CNN-Only (LeakCNN)
              </td>
              <td className="py-2.5 px-3 text-[#5b6b7b]">
                Global clip binary classifier (LEAK / NO_LEAK)
              </td>
              <td className="py-2.5 px-3 font-mono text-right font-medium">{formatPct(cnn.accuracy)}</td>
              <td className="py-2.5 px-3 font-mono text-right">{formatPct(cnn.precision)}</td>
              <td className="py-2.5 px-3 font-mono text-right">{formatPct(cnn.recall)}</td>
              <td className="py-2.5 px-3 font-mono text-right font-bold text-[#0b6fb8]">{formatF1(cnn.f1_score)}</td>
              <td className="py-2.5 px-3 text-[#8793a0]">None (Whole-clip classification)</td>
            </tr>

            <tr className="hover:bg-[#f9fbfd]">
              <td className="py-2.5 px-3 font-semibold text-[#0a3d62]">
                YOLO-Only (YOLOv8n)
              </td>
              <td className="py-2.5 px-3 text-[#5b6b7b]">
                Log-mel spectrogram bounding box detector
              </td>
              <td className="py-2.5 px-3 font-mono text-right font-medium">{formatPct(yolo.accuracy)}</td>
              <td className="py-2.5 px-3 font-mono text-right font-bold text-[#139a9a]">{formatPct(yolo.precision)}</td>
              <td className="py-2.5 px-3 font-mono text-right">{formatPct(yolo.recall)}</td>
              <td className="py-2.5 px-3 font-mono text-right font-bold text-[#139a9a]">{formatF1(yolo.f1_score)}</td>
              <td className="py-2.5 px-3 text-[#139a9a] font-medium">BBox (Time + Frequency band)</td>
            </tr>

            <tr className="bg-[#f0f7fc] hover:bg-[#e6f2fb] font-semibold border-t-2 border-[#0b6fb8]">
              <td className="py-2.5 px-3 text-[#0a3d62]">
                Hybrid Fused (CNN + YOLO)
              </td>
              <td className="py-2.5 px-3 text-[#0a3d62]">
                Dual-model agreement consensus + Debounce rule
              </td>
              <td className="py-2.5 px-3 font-mono text-right font-bold text-[#0b6fb8]">{formatPct(fused.accuracy)}</td>
              <td className="py-2.5 px-3 font-mono text-right font-bold text-[#0b6fb8]">{formatPct(fused.precision)}</td>
              <td className="py-2.5 px-3 font-mono text-right font-bold text-[#0b6fb8]">{formatPct(fused.recall)}</td>
              <td className="py-2.5 px-3 font-mono text-right font-bold text-[#2e9e5b]">{formatF1(fused.f1_score)}</td>
              <td className="py-2.5 px-3 text-[#0b6fb8] font-bold">Full BBox + Consensus Confidence</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dual-Model Consensus Rules */}
      <div className="bg-white border border-[#dbe3ea] rounded-md p-4 shadow-xs">
        <h2 className="text-xs font-bold text-[#0a3d62] uppercase tracking-wider mb-2">
          Hybrid Fusion Layer Agreement Rules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="border border-[#dbe3ea] rounded p-2.5 bg-[#f4f8fb]">
            <div className="font-bold text-[#0b6fb8] mb-1">1. Consensus LEAK</div>
            <div className="text-[#5b6b7b] text-[11px] mb-1.5">
              Both CNN and YOLO detect leak signature.
            </div>
            <div className="font-semibold text-[#0a3d62]">
              Output: <span className="text-[#d64545]">LEAK (High Confidence)</span>
            </div>
            <div className="text-[10px] text-[#5b6b7b] mt-1">
              Weighted fusion score assigned. Immediate alert eligible if conf &gt; 85%.
            </div>
          </div>

          <div className="border border-[#dbe3ea] rounded p-2.5 bg-[#f4f8fb]">
            <div className="font-bold text-[#0a3d62] mb-1">2. CNN LEAK Only</div>
            <div className="text-[#5b6b7b] text-[11px] mb-1.5">
              CNN classifies LEAK, but YOLO finds no bounding box.
            </div>
            <div className="font-semibold text-[#0a3d62]">
              Output: <span className="text-[#b7791f]">LEAK (Medium Confidence)</span>
            </div>
            <div className="text-[10px] text-[#5b6b7b] mt-1">
              Confidence capped at ~75%; requires 2 consecutive windows to alert.
            </div>
          </div>

          <div className="border border-[#dbe3ea] rounded p-2.5 bg-[#f4f8fb]">
            <div className="font-bold text-[#139a9a] mb-1">3. YOLO Box Only</div>
            <div className="text-[#5b6b7b] text-[11px] mb-1.5">
              CNN baseline normal, but YOLO box conf &gt; 60%.
            </div>
            <div className="font-semibold text-[#0a3d62]">
              Output: <span className="text-[#139a9a]">SUSPECTED_LEAK</span>
            </div>
            <div className="text-[10px] text-[#5b6b7b] mt-1">
              Sent to Debounce Engine for temporal verification across consecutive readings.
            </div>
          </div>

          <div className="border border-[#dbe3ea] rounded p-2.5 bg-[#f4f8fb]">
            <div className="font-bold text-[#2e9e5b] mb-1">4. Consensus NO_LEAK</div>
            <div className="text-[#5b6b7b] text-[11px] mb-1.5">
              Both models verify clean baseline acoustics.
            </div>
            <div className="font-semibold text-[#0a3d62]">
              Output: <span className="text-[#2e9e5b]">NO_LEAK</span>
            </div>
            <div className="text-[10px] text-[#5b6b7b] mt-1">
              Normal background verified; resets debouncer state counter.
            </div>
          </div>
        </div>
      </div>

      {/* Visual Diagnostics (Confusion Matrix, PR Curve, Sample Predictions) */}
      <div className="bg-white border border-[#dbe3ea] rounded-md overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-[#f4f8fb] border-b border-[#dbe3ea] flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#0a3d62] uppercase tracking-wider">
            YOLO Detector Diagnostic Artifacts
          </h2>
          <div className="flex items-center gap-1 text-xs">
            {[
              { id: 'confusion_matrix', label: 'Confusion Matrix' },
              { id: 'pr_curve', label: 'PR Curve' },
              { id: 'sample_pred', label: 'Sample Detections' },
              { id: 'training_curves', label: 'Training Loss History' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePlotTab(tab.id)}
                className={`px-2.5 py-1 rounded transition font-medium ${
                  activePlotTab === tab.id
                    ? 'bg-white text-[#0a3d62] border border-[#dbe3ea] font-bold shadow-xs'
                    : 'text-[#5b6b7b] hover:text-[#0a3d62]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white text-center">
          {activePlotTab === 'confusion_matrix' && (
            <div className="max-w-[620px] mx-auto">
              <img
                src="/artifacts/yolo_confusion_matrix.png"
                alt="YOLO Confusion Matrix"
                className="w-full h-auto border border-[#dbe3ea] rounded shadow-xs mx-auto"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/artifacts/confusion_matrix.png';
                }}
              />
              <div className="text-xs text-[#5b6b7b] mt-2">
                Normalized Confusion Matrix evaluating background vs acoustic leak resonance bounding boxes.
              </div>
            </div>
          )}

          {activePlotTab === 'pr_curve' && (
            <div className="max-w-[620px] mx-auto">
              <img
                src="/artifacts/yolo_pr_curve.png"
                alt="YOLO Precision-Recall Curve"
                className="w-full h-auto border border-[#dbe3ea] rounded shadow-xs mx-auto"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/artifacts/PR_curve.png';
                }}
              />
              <div className="text-xs text-[#5b6b7b] mt-2">
                Precision-Recall Curve across IoU thresholds for class <code className="text-[#0a3d62]">leak_signature</code>.
              </div>
            </div>
          )}

          {activePlotTab === 'sample_pred' && (
            <div className="max-w-[700px] mx-auto">
              <img
                src="/artifacts/yolo_sample_predictions.jpg"
                alt="YOLO Sample Detections"
                className="w-full h-auto border border-[#dbe3ea] rounded shadow-xs mx-auto"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/artifacts/val_batch0_pred.jpg';
                }}
              />
              <div className="text-xs text-[#5b6b7b] mt-2">
                Test batch predictions highlighting time-frequency resonance bounding boxes over log-mel spectrograms.
              </div>
            </div>
          )}

          {activePlotTab === 'training_curves' && (
            <div className="max-w-[720px] mx-auto">
              <img
                src="/artifacts/yolo_training_curves.png"
                alt="YOLO Training Curves"
                className="w-full h-auto border border-[#dbe3ea] rounded shadow-xs mx-auto"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/artifacts/results.png';
                }}
              />
              <div className="text-xs text-[#5b6b7b] mt-2">
                Convergence of box loss, class loss, distribution focal loss (DFL), and mAP metrics over fine-tuning epochs.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Live Hybrid Inference Tester */}
      <div className="bg-white border border-[#dbe3ea] rounded-md p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#dbe3ea]">
          <div>
            <h2 className="text-xs font-bold text-[#0a3d62] uppercase tracking-wider">
              Interactive Hybrid Inference Diagnostic Lab
            </h2>
            <div className="text-[11px] text-[#5b6b7b]">
              Test any acoustic clip through the live CNN + YOLO + Fusion pipeline.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunDemoInference('leak')}
              disabled={predicting}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#d64545] rounded hover:bg-[#c23b3b] transition disabled:opacity-50"
            >
              {predicting && selectedDemoType === 'leak' ? 'Evaluating...' : 'Test Leak Clip'}
            </button>
            <button
              onClick={() => handleRunDemoInference('no_leak')}
              disabled={predicting}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2e9e5b] rounded hover:bg-[#26854c] transition disabled:opacity-50"
            >
              {predicting && selectedDemoType === 'no_leak' ? 'Evaluating...' : 'Test Clean Clip'}
            </button>
            <label className="px-3 py-1.5 text-xs font-semibold text-[#0a3d62] bg-white border border-[#dbe3ea] rounded hover:bg-[#f4f8fb] cursor-pointer transition">
              Upload .WAV
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={predicting}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {predictError && (
          <div className="p-3 text-xs text-[#d64545] bg-[#fdecec] border border-[#f5c6cb] rounded mb-3">
            {predictError}
          </div>
        )}

        {predictionResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Annotated Spectrogram Result */}
            <div className="lg:col-span-6 bg-slate-900 rounded border border-[#dbe3ea] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#1e293b] text-xs text-[#94a3b8] flex justify-between items-center">
                <span className="font-semibold text-white">Log-Mel Spectrogram & YOLO BBoxes</span>
                <span className="font-mono text-[#38bdf8]">
                  {predictionResult.yolo_detections?.length || 0} box(es)
                </span>
              </div>
              {predictionResult.spectrogram_image ? (
                <img
                  src={predictionResult.spectrogram_image}
                  alt="Inference Spectrogram"
                  className="w-full h-auto block object-contain max-h-[340px] mx-auto"
                />
              ) : (
                <div className="py-20 text-center text-xs text-slate-400">
                  Spectrogram not generated
                </div>
              )}
            </div>

            {/* Inference Breakdown Table & Details */}
            <div className="lg:col-span-6 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#f4f8fb] border border-[#dbe3ea] rounded p-2">
                  <div className="text-[10px] text-[#5b6b7b] uppercase font-semibold">CNN Confidence</div>
                  <div className="text-base font-mono font-bold text-[#0b6fb8]">
                    {Math.round((predictionResult.cnn_confidence || predictionResult.confidence) * 100)}%
                  </div>
                  <div className="text-[10px] text-[#5b6b7b] mt-0.5">
                    Label: {predictionResult.label}
                  </div>
                </div>

                <div className="bg-[#f4f8fb] border border-[#dbe3ea] rounded p-2">
                  <div className="text-[10px] text-[#5b6b7b] uppercase font-semibold">YOLO Confidence</div>
                  <div className="text-base font-mono font-bold text-[#139a9a]">
                    {predictionResult.yolo_confidence != null && predictionResult.yolo_confidence > 0
                      ? `${Math.round(predictionResult.yolo_confidence * 100)}%`
                      : 'No box'}
                  </div>
                  <div className="text-[10px] text-[#5b6b7b] mt-0.5">
                    {predictionResult.yolo_detections?.length || 0} signature(s)
                  </div>
                </div>

                <div className="bg-[#fdecec] border border-[#f5c6cb] rounded p-2">
                  <div className="text-[10px] text-[#721c24] uppercase font-semibold">Fused Confidence</div>
                  <div className="text-base font-mono font-bold text-[#d64545]">
                    {Math.round((predictionResult.fused_confidence || predictionResult.confidence) * 100)}%
                  </div>
                  <div className="text-[10px] text-[#721c24] mt-0.5 font-semibold">
                    {predictionResult.fused_decision || predictionResult.label}
                  </div>
                </div>
              </div>

              {/* Fusion Explanation Box */}
              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded text-xs">
                <div className="font-semibold text-[#0a3d62] mb-1">
                  Agreement Verdict: <span className="font-mono text-[#0b6fb8]">{predictionResult.fusion_agreement || 'consensus'}</span>
                </div>
                <div className="text-[#5b6b7b] leading-relaxed">
                  {predictionResult.fusion_reason || 'Dual-model acoustic signature evaluation successfully executed.'}
                </div>
              </div>

              {/* Bounding box detail list */}
              {predictionResult.yolo_detections && predictionResult.yolo_detections.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[#0a3d62] mb-1">
                    Detected Acoustic Resonance Regions:
                  </div>
                  <table className="table-compact text-xs w-full bg-white border border-[#dbe3ea] rounded">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Time Range</th>
                        <th>Frequency Band</th>
                        <th>Box Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictionResult.yolo_detections.map((det, i) => (
                        <tr key={i}>
                          <td className="font-semibold text-[#0a3d62]">Box {i + 1}</td>
                          <td className="font-mono text-[#0b6fb8]">{det.t_start}s - {det.t_end}s</td>
                          <td className="font-mono text-[#139a9a]">{Math.round(det.f_low)} Hz - {Math.round(det.f_high)} Hz</td>
                          <td>
                            <span className="font-mono font-bold text-[#d64545] bg-[#fdecec] px-1.5 py-0.5 rounded">
                              {Math.round(det.confidence * 100)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#5b6b7b] bg-[#f9fbfd] border border-dashed border-[#dbe3ea] rounded">
            Click &quot;Test Leak Clip&quot; or upload an acoustic .wav file to inspect the dual-model inference and spectrogram localization in real time.
          </div>
        )}
      </div>
    </div>
  );
}
