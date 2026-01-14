// assets/qrscan.js
// Camera QR scanning using BarcodeDetector.
// NOTE: Both BarcodeDetector and getUserMedia require a secure context (HTTPS).

export const ScanState = {
  running: false,
  stream: null,
  track: null,
  detector: null,
  torchOn: false,
  lastValue: ''
};

export async function startScan(opts = {}) {
  const video = document.getElementById('scanVideo');
  const status = document.getElementById('scanStatus');

  if (ScanState.running) return;

  if ('BarcodeDetector' in window) {
    try {
      ScanState.detector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch (e) {
      ScanState.detector = null;
    }
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    status.textContent = 'Browser tidak mendukung akses kamera.';
    throw new Error('getUserMedia not supported');
  }

  status.textContent = 'Meminta izin kamera…';

  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  ScanState.stream = stream;
  ScanState.track = stream.getVideoTracks()[0] || null;

  video.srcObject = stream;
  await video.play();

  ScanState.running = true;
  status.textContent = ScanState.detector ? 'Scan aktif — arahkan kamera ke QR.' : 'BarcodeDetector tidak tersedia. Gunakan tombol Manual.';

  const onResult = opts.onResult || (() => {});

  const loop = async () => {
    if (!ScanState.running) return;
    if (!ScanState.detector) return;

    try {
      const codes = await ScanState.detector.detect(video);
      if (codes && codes.length) {
        const raw = codes[0].rawValue || '';
        if (raw && raw !== ScanState.lastValue) {
          ScanState.lastValue = raw;
          onResult(raw);
        }
      }
    } catch (e) {
      // ignore, continue
    }
    setTimeout(loop, 250);
  };

  setTimeout(loop, 250);
}

export function stopScan() {
  const status = document.getElementById('scanStatus');
  ScanState.running = false;
  ScanState.lastValue = '';

  try {
    if (ScanState.track) ScanState.track.stop();
    if (ScanState.stream) ScanState.stream.getTracks().forEach(t => t.stop());
  } catch(e) {}

  ScanState.stream = null;
  ScanState.track = null;
  status.textContent = 'Scan berhenti.';
}

export async function toggleTorch() {
  if (!ScanState.track) return false;
  const cap = ScanState.track.getCapabilities ? ScanState.track.getCapabilities() : {};
  if (!cap.torch) return false;
  ScanState.torchOn = !ScanState.torchOn;
  try {
    await ScanState.track.applyConstraints({ advanced: [{ torch: ScanState.torchOn }] });
    return true;
  } catch(e) {
    return false;
  }
}
