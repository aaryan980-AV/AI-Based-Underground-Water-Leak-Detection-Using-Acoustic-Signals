import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileAudio, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Sparkles,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { api } from '../utils/api';

export default function DetectPage() {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setResult(null);

    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);

    // Automatically trigger prediction
    setLoading(true);
    try {
      const pred = await api.predictAudio(selectedFile);
      setResult(pred);
    } catch (err) {
      setError(err.message || 'Failed to analyze acoustic file.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Demo presets: loads pre-existing WAV samples from the backend or dataset
  const loadDemoPreset = async (type) => {
    setLoading(true);
    setError(null);
    try {
      // Create a synthesized demo sample or request backend trigger
      const dummyBuffer = new Float32Array(8000);
      for (let i = 0; i < 8000; i++) {
        // synthesize acoustic leak hiss vs ambient hum
        if (type === 'leak') {
          dummyBuffer[i] = (Math.random() - 0.5) * 0.4 + Math.sin(i * 0.25) * 0.2;
        } else {
          dummyBuffer[i] = Math.sin(i * 0.04) * 0.05 + (Math.random() - 0.5) * 0.02;
        }
      }

      // Convert to WAV Blob
      const wavBlob = exportWAV(dummyBuffer, 8000);
      const demoFile = new File([wavBlob], `${type}_demo_sample.wav`, { type: 'audio/wav' });
      await handleFileChange(demoFile);
    } catch (e) {
      setError('Could not generate demo sample: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5" />
          <span>Acoustic Neural Inference</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          AI Acoustic Leak Inspector
        </h1>
        <p className="text-sm text-gray-400">
          Upload any acoustic hydrophone or noise logger clip to compute normalized log-mel spectrograms and predict pipeline pipe integrity in real-time.
        </p>
      </div>

      {/* Preset Quick Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs text-gray-400 font-medium">Quick Demo Preset:</span>
        <button
          onClick={() => loadDemoPreset('leak')}
          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Simulate Leak Acoustic Wave</span>
        </button>
        <button
          onClick={() => loadDemoPreset('normal')}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center gap-1.5"
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Simulate Ambient Pipe Audio</span>
        </button>
      </div>

      {/* Audio Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) {
            handleFileChange(e.dataTransfer.files[0]);
          }
        }}
        className="group relative border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-3xl p-8 lg:p-12 text-center bg-gray-900/40 hover:bg-gray-900/70 transition-all cursor-pointer shadow-xl backdrop-blur-sm"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
              {file ? file.name : 'Choose an audio file or drag & drop'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Supports WAV, MP3, FLAC, OGG acoustic hydrophone recordings
            </p>
          </div>
          {file && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/80 px-3 py-1 rounded-full border border-white/10">
              <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
              <span>{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="p-4 rounded-2xl bg-gray-900/80 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayback}
              className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold transition shadow-lg shadow-cyan-500/20"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <div>
              <div className="text-sm font-bold text-white">{file?.name}</div>
              <div className="text-xs text-gray-400">Audio playback stream ready</div>
            </div>
          </div>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 rounded-2xl bg-gray-900/60 border border-white/10 flex flex-col items-center justify-center gap-3 text-cyan-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-sm font-semibold text-gray-300">
            Extracting Log-Mel Spectrogram & Evaluating CNN Logits...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Prediction Output & Visualizations */}
      {result && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-400">
          
          {/* Main Classification Result Banner */}
          <div className={`p-6 lg:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
            result.is_leak
              ? 'bg-gradient-to-br from-rose-950/70 via-gray-900 to-red-950/40 border-rose-500/50 shadow-rose-950/40'
              : 'bg-gradient-to-br from-emerald-950/70 via-gray-900 to-teal-950/40 border-emerald-500/50 shadow-emerald-950/40'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl border ${
                  result.is_leak 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {result.is_leak ? (
                    <AlertTriangle className="w-10 h-10" />
                  ) : (
                    <CheckCircle className="w-10 h-10" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-gray-400">
                      Prediction Verdict
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      result.is_leak ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/30 text-emerald-300'
                    }`}>
                      {result.label}
                    </span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black text-white mt-1">
                    {result.is_leak ? 'Active Pipe Leak Detected' : 'Normal Acoustic Baseline'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {result.is_leak
                      ? 'Acoustic signature exhibits distinct high-energy turbulent cavitation frequencies.'
                      : 'Audio matches laminar background flow with no turbulent acoustic anomalies.'}
                  </p>
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="bg-gray-950/70 border border-white/10 rounded-2xl p-4 min-w-[180px] text-center space-y-2">
                <div className="text-xs text-gray-400 font-semibold uppercase">Confidence Score</div>
                <div className={`text-4xl font-black tracking-tight ${
                  result.is_leak ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {(result.confidence * 100).toFixed(1)}%
                </div>
                {/* Confidence Bar */}
                <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${result.is_leak ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Waveform & Spectrogram Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Waveform Visualizer */}
            <div className="p-5 rounded-2xl bg-gray-900/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Acoustic Waveform (Time Domain)</span>
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">8,000 Hz Normalised</span>
              </div>

              {/* Canvas Waveform Simulation */}
              <div className="h-44 bg-gray-950 rounded-xl border border-white/5 p-3 flex items-center justify-center">
                {result.waveform ? (
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${result.waveform.length} 100`}>
                    <line x1="0" y1="50" x2={result.waveform.length} y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                    <polyline
                      fill="none"
                      stroke={result.is_leak ? '#ef4444' : '#06b6d4'}
                      strokeWidth="1.5"
                      points={result.waveform.map((val, idx) => `${idx},${50 - val * 45}`).join(' ')}
                    />
                  </svg>
                ) : (
                  <span className="text-xs text-gray-500">Waveform data unavailable</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                Peak amplitude dynamic range sampled across fixed 1.0 second evaluation window.
              </p>
            </div>

            {/* Log-Mel Spectrogram Heatmap */}
            <div className="p-5 rounded-2xl bg-gray-900/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Log-Mel Spectrogram (Frequency Domain)</span>
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">64 Mel Bins</span>
              </div>

              {/* Spectrogram Grid */}
              <div className="h-44 bg-gray-950 rounded-xl border border-white/5 p-2 overflow-hidden flex flex-col">
                {result.spectrogram ? (
                  <div className="w-full h-full flex flex-col-reverse justify-between">
                    {result.spectrogram.map((row, rIdx) => (
                      <div key={rIdx} className="flex h-full w-full">
                        {row.map((val, cIdx) => {
                          // Normalize value for color intensity
                          const norm = Math.min(1, Math.max(0, (val + 60) / 60));
                          const color = result.is_leak
                            ? `rgba(239, 68, 68, ${norm * 0.9 + 0.1})`
                            : `rgba(6, 182, 212, ${norm * 0.9 + 0.1})`;
                          return (
                            <div
                              key={cIdx}
                              className="flex-1 h-full"
                              style={{ backgroundColor: color }}
                              title={`Freq bin: ${rIdx}, Time: ${cIdx}, dB: ${val}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 m-auto">Spectrogram data unavailable</span>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>0 Hz (Low Freq)</span>
                <span>4,000 Hz (Nyquist Limit)</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

// Utility: convert Float32Array to 16-bit PCM WAV Blob
function exportWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
