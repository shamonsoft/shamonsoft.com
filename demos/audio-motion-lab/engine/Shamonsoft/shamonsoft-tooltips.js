(() => {
  const tips = {
    'export-format-select': 'Choose the saved video container and codec.',
    'export-resolution-select': 'Choose the output video dimensions.',
    'export-fps-select': 'Frames rendered per second. Higher values look smoother but take more processing.',
    'export-length-select': 'Set the target duration of the saved video.',
    'export-quality-select': 'Choose the video bitrate. Higher values improve quality and increase file size.',
    'export-audio-select': 'Choose the audio bitrate used in the saved video.',
    'background-enabled': 'Show or hide the configured background. When off, the preview uses neutral black.',
    'bg-white': 'Use a solid white background.',
    'background-hue-slider': 'Choose the base background color.',
    'custom-bg-enabled': 'Use the selected image or video as the background.',
    'custom-bg-btn': 'Choose a background image or video from this computer.',
    'custom-bg-fit': 'Choose how custom background media fills the canvas.',
    'dropzone-btn': 'Add one or more audio tracks from this computer.',
    'sample-music-select': 'Choose a track from the built-in music library.',
    'sample-music-load-btn': 'Add the selected library track to the playlist.',
    'volume-slider': 'Adjust music playback volume.',
    'mute-btn': 'Mute or restore music playback.',
    'prev-btn': 'Play the previous track in the playlist.',
    'play-btn': 'Start or resume the selected track.',
    'pause-btn': 'Pause the current track at its present position.',
    'stop-btn': 'Stop playback and return to the beginning of the track.',
    'next-btn': 'Play the next track in the playlist.',
    'loop-btn': 'Repeat the current playlist continuously.',
    'shuffle-btn': 'Play playlist tracks in random order.',
    'record-start-btn': 'Begin recording the visualizer and its loaded music.',
    'record-stop-btn': 'Stop the current recording.',
    'record-save-btn': 'Finish and save the current recording now.',
    'export-path-button': 'Choose where the saved video will be written.',
    'export-button': 'Prepare the selected video export.',
    'progress-slider': 'Seek to another position in the current track.',
    'clear-playlist-btn': 'Remove every track from the playlist.',
  };

  for (const [id, title] of Object.entries(tips)) {
    const element = document.getElementById(id);
    if (element) element.title = title;
  }

  document.querySelectorAll('.randomize-btn').forEach(button => {
    button.title = 'Turn continuous RGB color cycling on or off for this effect.';
  });

  document.querySelectorAll('input[type="range"]:not([title])').forEach(input => {
    const group = input.closest('.slider-cell, .global-setting-card, .shamonsoft-layer-row, .shamonsoft-procedural-control');
    const name = group?.querySelector('.slider-label-row span, .global-setting-label, label')?.textContent?.trim();
    if (name) input.title = `Adjust ${name}.`;
  });

  document.querySelectorAll('select:not([title])').forEach(select => {
    const name = select.getAttribute('aria-label')
      || select.closest('.field')?.querySelector(':scope > span')?.textContent?.trim()
      || select.closest('.slider-cell, .shamonsoft-layer-row')?.querySelector('.slider-label-row span, label')?.textContent?.trim();
    if (name) select.title = `Choose ${name.toLowerCase()}.`;
  });
})();
