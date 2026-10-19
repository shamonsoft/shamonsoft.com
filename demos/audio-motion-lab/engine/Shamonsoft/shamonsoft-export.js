// Native recording protocol: bounded chunks, disk-write acknowledgements and immutable sessions.
(() => {
  const pending = new Map();
  let session = null, settings = null, destinationAudio = null;
  let queuedBytes = 0, sequence = 0, failure = null, starting = false, exporting = false;
  let sealed = false, limitTimer = 0;
  const native = Boolean(window.__amlBrowserHost);
  const controls = [exportFormatSelect, exportResolutionSelect, exportFpsSelect, exportLengthSelect, exportQualitySelect, exportAudioSelect];
  function lock() {
    for (const control of controls) control.disabled = Boolean(session || starting || exporting);
    recordStartBtn.disabled = starting || exporting || sealed || Boolean(failure);
    recordSaveBtn.disabled = starting || exporting;
    exportButton.disabled = starting || exporting;
    exportPathButton.disabled = starting || exporting;
    recordStopBtn.disabled = starting;
    recordStopBtn.querySelector('.audio-button-label').textContent = exporting ? 'Cancel' : 'Stop Rec';
  }
  function status(message, error = false) {
    window.__shamonsoftNativeExportStatus?.(message, error);
    recordStatus.textContent = message;
  }
  window.__amlReply = (id, reply) => {
    const waiter = pending.get(id);
    if (!waiter) return;
    pending.delete(id); clearTimeout(waiter.timer);
    reply.ok ? waiter.resolve(reply.result) : waiter.reject(new Error(reply.error || 'Export failed'));
  };
  function request(action, payload = {}, timeout = 30000) {
    if (!native) return Promise.reject(new Error('Use the packaged Windows application to record/export.'));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = timeout ? setTimeout(() => {
        pending.delete(id); reject(new Error(`Export ${action} did not acknowledge in time. Recording retained for recovery.`));
      }, timeout) : 0;
      pending.set(id, { resolve, reject, timer });
      window.__amlBrowserHost.postMessage({ type: 'aml-export-request', id, action, payload: { session, ...payload } });
    });
  }
  function clock(active) { request('clock', { active }).catch(fatal); }
  function fatal(error) {
    if (failure) return;
    failure = error;
    stopRecordingSession();
    if (mediaCaptureState.recorder?.state !== 'inactive') {
      try { mediaCaptureState.recorder?.stop(); } catch {}
    }
    status(error.message + ' Recovery recording is retained in this browser.', true);
    lock();
  }
  function frameReady() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview is not rendering. Keep the app visible while recording.')), 3000);
      requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); }));
    });
  }
  function recorderConfig() {
    const codec = 'vp8';
    const mimeType = `video/webm;codecs=${codec},opus`;
    if (!MediaRecorder.isTypeSupported(mimeType))
      throw new Error(`This browser cannot record ${codec.toUpperCase()}. Use a current Chrome, Edge or Firefox browser.`);
    return { mimeType, extension: 'webm' };
  }
  async function ensure() {
    if (mediaCaptureState.recorder && mediaCaptureState.recorder.state !== 'inactive') return mediaCaptureState.recorder;
    if (session) throw new Error('Save/export the existing recording before starting another one.');
    if (document.hidden) throw new Error('Keep the app visible while recording animated content.');
    syncExportStateFromControls();
    settings = { ...buildExportRequest(), durationSeconds: Math.min(60, buildExportRequest().durationSeconds || 60), hardwareEncode: false };
    const config = recorderConfig();
    ensureAudioAnalysis();
    if (!audioContext || !mediaSource) throw new Error('Audio capture is unavailable. Restart the app before recording.');
    await audioContext.resume();
    if (audioContext.state !== 'running') throw new Error('Audio capture could not start.');
    // Independent branch: persistent across audio.src/playlist changes, before monitor volume/mute.
    if (!destinationAudio) {
      destinationAudio = audioContext.createMediaStreamDestination();
      mediaSource.connect(destinationAudio);
    }
    const compositor = window.__shamonsoftCompositor;
    if (!compositor?.canvas?.captureStream) throw new Error('The composed preview is unavailable.');
    compositor.setCaptureSize(settings.resolution.width, settings.resolution.height);
    await frameReady();
    session = crypto.randomUUID(); sequence = 0; queuedBytes = 0; failure = null; sealed = false;
    mediaCaptureState.nativeStreaming = true;
    mediaCaptureState.nativeFinalized = false;
    mediaCaptureState.nativeWriteQueue = Promise.resolve();
    mediaCaptureState.mimeType = config.mimeType; mediaCaptureState.extension = 'webm';
    try {
      await request('start', settings);
      const video = compositor.canvas.captureStream(settings.fps);
      // Clone only the recording track: stopping a recording must not stop the reusable destination.
      mediaCaptureState.stream = new MediaStream([...video.getVideoTracks(), ...destinationAudio.stream.getAudioTracks().map(track => track.clone())]);
      const recorder = new MediaRecorder(mediaCaptureState.stream, {
        mimeType: config.mimeType,
        videoBitsPerSecond: settings.videoBitrateMbps * 1000000,
        audioBitsPerSecond: settings.audioBitrateKbps * 1000,
      });
      mediaCaptureState.recorder = recorder;
      recorder.addEventListener('error', event => fatal(event.error || new Error('The media recorder failed.')));
      recorder.addEventListener('dataavailable', event => {
        if (!event.data?.size || failure) return;
        queuedBytes += event.data.size;
        if (queuedBytes > 32 * 1024 * 1024) { fatal(new Error('Browser writes cannot keep up with recording; capture stopped safely.')); return; }
        mediaCaptureState.nativeWriteQueue = mediaCaptureState.nativeWriteQueue.then(async () => {
          if (failure) return;
          const bytes = new Uint8Array(await event.data.arrayBuffer());
          for (let offset = 0; offset < bytes.length; offset += 1024 * 1024) {
            const part = bytes.subarray(offset, offset + 1024 * 1024);
            let binary = '';
            for (let at = 0; at < part.length; at += 32768) binary += String.fromCharCode(...part.subarray(at, at + 32768));
            await request('chunk', { sequence: sequence++, data: btoa(binary) });
          }
        }).catch(fatal).finally(() => { queuedBytes -= event.data.size; });
      });
      recorder.addEventListener('stop', () => {
        mediaCaptureState.stream?.getTracks().forEach(track => track.stop());
        mediaCaptureState.stream = null;
        compositor.setCaptureSize();
        if (recordingState.active) fatal(new Error('The recorder stopped unexpectedly.'));
      });
      recorder.start(1000);
      lock();
      return recorder;
    } catch (error) {
      compositor.setCaptureSize();
      if (session) await request('preserve').catch(() => {});
      session = null; settings = null; lock(); throw error;
    }
  }
  async function start() {
    if (starting || exporting || recordingState.active) return;
    starting = true; lock();
    try {
      if (getRecordedSeconds() >= getSelectedVideoLengthSeconds()) throw new Error('Recording reached its limit. Export it before starting another.');
      await ensure();
      if (musicState.playlist.length && audio.paused) {
        if (musicState.currentIndex >= 0 && musicState.loadedPlaylistIndex !== musicState.currentIndex) restorePlaylistTrack(musicState.currentIndex);
        await playAttachedAudio();
      }
      if (mediaCaptureState.recorder.state === 'paused') mediaCaptureState.recorder.resume();
      recordingState.active = true; recordingState.startedAtMs = performance.now();
      clock(true);
      limitTimer = setInterval(() => {
        tickRecordingTimeline();
        if (document.hidden) pauseHidden();
      }, 20);
      updateRecordingStatus();
    } catch (error) {
      if (session && mediaCaptureState.recorder?.state === 'recording') {
        mediaCaptureState.recorder.pause(); clock(false);
      }
      status(error.message, true);
    } finally { starting = false; lock(); }
  }
  function stop() {
    if (exporting) { request('cancel').catch(error => status(error.message, true)); return; }
    clearInterval(limitTimer); limitTimer = 0;
    if (recordingState.active) {
      recordingState.accumulatedSeconds = getRecordedSeconds();
      recordingState.active = false;
      if (mediaCaptureState.recorder?.state === 'recording') mediaCaptureState.recorder.pause();
      clock(false);
    }
    // Pausing recording pauses music too, so a resumed recording does not skip its audio.
    audio.pause();
    if (recordingState.rafId) cancelAnimationFrame(recordingState.rafId);
    recordingState.rafId = 0;
    updateVideoTimeline(); updateRecordingStatus(); lock();
  }
  function tick() {
    updateVideoTimeline(); updateRecordingStatus();
    if (recordingState.active && getRecordedSeconds() >= getSelectedVideoLengthSeconds()) stop();
  }
  function pauseHidden() {
    if (!recordingState.active) return;
    stop();
    status('Recording paused: keep the app visible for animated capture. Start Rec resumes.');
  }
  async function finalize() {
    if (sealed) return null;
    const recorder = mediaCaptureState.recorder;
    if (!recorder) throw new Error('Record something before exporting.');
    if (recorder.state !== 'inactive') {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Recorder did not finalize; recording retained for recovery.')), 30000);
        recorder.addEventListener('stop', () => { clearTimeout(timer); resolve(); }, { once: true });
        recorder.stop();
      });
    }
    await mediaCaptureState.nativeWriteQueue;
    if (failure) throw failure;
    await request('seal', { seconds: getRecordedSeconds() });
    sealed = true;
    return null;
  }
  async function choose() {
    if (!session) {
      const recovered = await request('recover', {}, 0);
      if (!recovered.session) return null;
      session = recovered.session; sealed = true; failure = null;
      const opts = recovered.options;
      settings = { durationSeconds: opts.Duration };
      exportFormatSelect.value = opts.Format;
      exportResolutionSelect.value = 'custom';
      document.getElementById('shamonsoft-custom-width').value = String(opts.Width);
      document.getElementById('shamonsoft-custom-height').value = String(opts.Height);
      for (const [control, value] of [[exportFpsSelect, opts.Fps], [exportLengthSelect, opts.Duration], [exportQualitySelect, opts.VideoMbps], [exportAudioSelect, opts.AudioKbps]]) {
        if (![...control.options].some(option => option.value === String(value))) control.add(new Option(String(value), String(value)));
        control.value = String(value);
      }
      syncExportStateFromControls(); updatePreviewAspect();
      recordingState.accumulatedSeconds = recovered.seconds || 1;
      lock(); updateVideoTimeline();
      status('Retained browser recording loaded. Export retries conversion; interrupted media may be partial.');
      return null;
    }
    const result = await request('choose', { suggestedName: buildSuggestedExportName() }, 0);
    exportState.fileHandle = result.path ? { name: result.path.split(/[\\/]/).pop() } : null;
    if (result.path) {
      exportState.fileName = exportState.fileHandle.name; exportState.fileHint = result.path;
      updateExportPathButton(); writeExportStorage();
    }
    return exportState.fileHandle;
  }
  async function save() {
    if (starting || exporting) return;
    if (!session || getRecordedSeconds() <= 0) { status('Record something first, then export it'); return; }
    stop(); exporting = true; lock();
    try {
      await finalize();
      // Every attempt refreshes the native destination; stale fake file handles are never reused.
      if (!await choose()) { status('Export cancelled; recording retained for the next attempt.'); return; }
      await request('finish', {}, 0);
      mediaCaptureState.nativeFinalized = true;
      session = null; settings = null; sealed = false; failure = null;
      mediaCaptureState.recorder = null;
      recordingState.accumulatedSeconds = 0; recordingState.startedAtMs = 0;
      exportState.fileHandle = null;
      updateVideoTimeline(); status('Export complete.');
    } catch (error) { status(error.message, true); }
    finally { exporting = false; lock(); }
  }
  function reset() {
    if (exporting || starting) return;
    stop();
    request('preserve').catch(() => {});
    session = null; settings = null; sealed = false;
    mediaCaptureState.recorder = null;
    mediaCaptureState.stream?.getTracks().forEach(track => track.stop());
    mediaCaptureState.stream = null; window.__shamonsoftCompositor?.setCaptureSize();
    lock();
  }
  window.__amlStopAtLimit = () => { stop(); status('Recording reached its duration limit. Export is ready.'); };
  window.__amlPauseHidden = pauseHidden;
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseHidden(); });
  exportPathButton.title = 'Choose destination, or recover a retained recording when no recording is open';
  window.__amlExport = { ensure, start, stop, tick, finalize, choose, save, reset,
    busy:()=>Boolean(session||starting||exporting),
    duration: () => settings?.durationSeconds };
  lock();
})();
