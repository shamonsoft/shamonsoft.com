(() => {
  if (typeof sampleTracks === "undefined" || typeof sampleMusicSelect === "undefined") return;
  window.__shamonsoftAudioLibrary = { total: sampleTracks.length, genres: [] };
})();
