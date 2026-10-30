window.AML_HELP_ARTICLES = [
  {
    "id": "demo-output",
    "category": "Getting started",
    "title": "Browser demo: full interface, exports disabled",
    "summary": "Explore all settings. Grayed export buttons require the paid Windows app.",
    "tags": "demo export paid disabled gray",
    "related": [],
    "body": "<p>This demo shows the full app interface, options and Help. Media-export actions remain visible and grayed out. Preview, editing, music playback and project save/open stay available. Export instructions elsewhere in Help describe the paid Windows app.</p>"
  },
  {
    "id": "first-scene",
    "category": "Getting started",
    "title": "Make your first visualization",
    "summary": "Load music, enable a visual layer, and press Play.",
    "tags": "start beginner blank preview music sample audio",
    "body": "<ol><li>Choose a track in <b>Sample Audio</b> and click <b>Load Track</b>, or click/drag files into <b>Load Music</b>.</li><li>Open <b>Visualizers</b> using its triangle. Choose a visualizer and turn its switch <b>On</b>.</li><li>Press <b>Play</b> in the audio section. Adjust the visualizer\u2019s size, glow and motion.</li><li>Add other layers only when you want them. Use <b>My Presets</b> to save a look.</li></ol><p>New workspaces start with all cards collapsed and visual layers off. An empty black preview is normal until a layer is enabled. Some visuals respond mainly while music plays.</p><p>To create a video, use <b>Start Rec</b>, then <b>Stop Rec</b> and <b>EXPORT</b>. Recording is real-time, not an instant offline render.</p>",
    "related": [
      "workspace",
      "music",
      "recording",
      "blank-preview"
    ]
  },
  {
    "id": "workspace",
    "category": "Getting started",
    "title": "Find your way around",
    "summary": "Settings on the left, preview in the center, and playlist on the right.",
    "tags": "workspace layout panels header collapse expand cards",
    "body": "<ul><li><b>Upper bar:</b> export format, resolution, FPS, length, video bitrate, appearance Mode and audio bitrate. Help Center and Contact Support are at the upper right.</li><li><b>Left pane:</b> Undo/Redo/Reset All, My Presets, visual layers, finishing effects and Music Response. A right-pointing triangle opens a card; a downward triangle closes it.</li><li><b>Center:</b> live preview, preview tools, music controls, recording and export.</li><li><b>Right:</b> the playlist and track reorder/remove controls.</li></ul><p>Collapsing a card hides its controls; it does not switch the layer off. Use the On/Off switch to control visibility.</p>",
    "related": [
      "layers",
      "preview-tools",
      "theme"
    ]
  },
  {
    "id": "theme",
    "category": "Getting started",
    "title": "Dark and Light appearance",
    "summary": "Change the interface colors without changing your video.",
    "tags": "mode dark light gray theme appearance",
    "body": "<p>Click <b>Mode</b> beside the bitrate controls to switch between Dark and Light. Dark is the default for a fresh installation; your appearance choice is remembered locally.</p><p>Appearance affects the interface only. It does not recolor the preview, change your layers, or add a background to exported video. Scrollbars use neutral gray shades in both modes.</p>",
    "related": [
      "workspace"
    ]
  },
  {
    "id": "layers",
    "category": "Visual layers",
    "title": "Layer order and Solo",
    "summary": "First is closest to the viewer; higher numbers are farther behind.",
    "tags": "front back behind forward backward status first layering solo switch",
    "body": "<p>Every on-screen content card shows <b>Layer order</b>. <b>1st</b> is frontmost. Use <b>Bring forward</b> or <b>Send backward</b> to move it one position. The buttons disable at the ends.</p><p>By default, Visualizers is closest, Background is farthest, and Procedural is one step in front of Background. Layer order is included in saved presets.</p><p><b>Solo</b> temporarily isolates a layer for inspection. It is not the same as permanently switching other layers off. Background must be On before it can be soloed.</p><p>An opaque front layer can cover layers behind it. Lower its Opacity or move it backward if something disappears.</p>",
    "related": [
      "opacity",
      "blank-preview",
      "presets"
    ]
  },
  {
    "id": "rgb",
    "category": "Visual layers",
    "title": "RGB, Flow, Cycle and Hue",
    "summary": "Choose a fixed hue or moving rainbow colors.",
    "tags": "rainbow color colour hue spectrum cycle flow rgb",
    "body": "<p>With <b>RGB off</b>, the Hue slider selects the color shown along its spectrum. With <b>RGB on</b>, the layer uses changing rainbow colors.</p><ul><li><b>Flow:</b> the default RGB choice. Colors travel across or through the effect rather than changing the entire effect together.</li><li><b>Cycle:</b> colors shift together over time.</li></ul><p>Different effects distribute color differently. Try Flow with Tunnel to see the colors move along its depth. If the preview is frozen, animation and color travel will stop until it is unfrozen.</p>",
    "related": [
      "tunnel",
      "preview-tools"
    ]
  },
  {
    "id": "opacity",
    "category": "Visual layers",
    "title": "Sliders, size and opacity",
    "summary": "Adjust scale and strength; Opacity controls coverage.",
    "tags": "transparency transparent opaque amount spread spacing sliders glow brightness",
    "body": "<p>Slider labels depend on the layer. Amount/Density controls how much geometry appears; Size/Scale changes its size; Spread/Spacing changes its arrangement; Motion/Speed changes movement; Glow and Brightness change light intensity.</p><p><b>Opacity:</b> 100 is fully opaque and 0 is fully transparent for normal content. Intermediate values let other layers show through. Tunnel\u2019s Opacity controls its glass panels; their structural frames and floor remain visible by design.</p><p>Higher size, count, glow and resolution settings can add substantial rendering work. Begin with moderate settings and increase one at a time.</p>",
    "related": [
      "layers",
      "performance",
      "tunnel"
    ]
  },
  {
    "id": "visualizers",
    "category": "Visual layers",
    "title": "Visualizers",
    "summary": "Choose a music-driven shape and its material.",
    "tags": "bars orbit lattice petals spectrum ring starburst ribbons radar sweep vortex nebula spiral equalizer wall liquid pulse grid wave solid glass chrome",
    "body": "<p>The Visualizers card includes <b>Bars, Orbit, Lattice, Petals, Spectrum Ring, Starburst, Ribbons, Radar Sweep, Vortex, Nebula, Spiral, Equalizer Wall, Liquid Pulse</b> and <b>Grid Wave</b>.</p><p>Select a material such as Solid, Glass or Chrome where available. Controls change to match the selected visualizer. Music affects these visuals through their built-in response even when custom Music Response links are off.</p><p>For stronger movement, play a track and increase Intensity and Motion. For wider coverage, increase Spread or Spacing and Scale. Choose a different mode if the current arrangement does not suit your composition.</p>",
    "related": [
      "rgb",
      "music-response",
      "presets"
    ]
  },
  {
    "id": "particles",
    "category": "Visual layers",
    "title": "Particles",
    "summary": "Add floating shapes without costly tails.",
    "tags": "particles bubbles plus circle shape count spread size speed",
    "body": "<p>Turn Particles On, select its shape and adjust the count, size, spread, movement and opacity controls. The selected shape determines particle geometry, including Plus.</p><p>Use fewer large particles for a clear composition, or more small particles for texture. Tails are intentionally not offered to avoid their performance cost. If particles cover your main visualizer, lower Opacity or move Particles backward.</p>",
    "related": [
      "layers",
      "performance",
      "rgb"
    ]
  },
  {
    "id": "floor-grid",
    "category": "Visual layers",
    "title": "Floor Grid",
    "summary": "A separate perspective grid beneath your composition.",
    "tags": "floor grid horizon lines perspective spacing speed",
    "body": "<p>Floor Grid is an independent visual layer with its own controls, RGB options and layer order. Adjust spacing, scale and movement to suit the preview.</p><p>It is separate from Tunnel\u2019s built-in Floor. If both are enabled, they overlap according to their layer order. For a clean tunnel-only look, switch Floor Grid off.</p>",
    "related": [
      "tunnel",
      "layers"
    ]
  },
  {
    "id": "tunnel",
    "category": "Visual layers",
    "title": "Tunnel shapes and glass",
    "summary": "Travel continuously through a polished-glass tunnel.",
    "tags": "sonic runway tunnel glass shape arch square circle pentagon twist depth response speed brightness thickness wireframe",
    "body": "<p>Choose a <b>Shape</b> and <b>Floor</b>. Polished glass is built in; there is no separate wall material or wireframe selector.</p><ul><li><b>Size:</b> tunnel opening scale. <b>Depth:</b> depth/number of visible sections.</li><li><b>Thickness:</b> frame width. <b>Speed:</b> forward travel.</li><li><b>Twist:</b> center 0 is straight. Left of center twists left; right twists right.</li><li><b>Response:</b> music influence. <b>Glow/Brightness:</b> frame lighting.</li><li><b>Opacity:</b> panel fill from transparent at 0 to opaque at 100. The floor and frames are separate.</li></ul><p>RGB Flow moves colors through the tunnel; Cycle changes the color phase together. With RGB off, Hue follows the slider spectrum. Floors stay neutral rather than being recolored by the tunnel\u2019s Hue.</p>",
    "related": [
      "tunnel-floors",
      "rgb",
      "opacity"
    ]
  },
  {
    "id": "tunnel-floors",
    "category": "Visual layers",
    "title": "Tunnel floor choices",
    "summary": "Choose a neutral floor or leave the lower opening clear.",
    "tags": "runway grid obsidian stone tiles brushed metal ribbed deck none floor",
    "body": "<p>Tunnel offers <b>None, Runway, Grid, Obsidian, Stone tiles, Brushed metal</b> and <b>Ribbed deck</b>.</p><p>Runway gives a clean travel surface. Obsidian is dark and polished; Stone tiles, Brushed metal and Ribbed deck provide alternative surface character. Grid emphasizes structure. None removes the built-in floor so other layers can show through.</p><p>These floors belong to Tunnel; changing them does not enable or change the independent Floor Grid card. The floors remain neutral when tunnel colors change.</p>",
    "related": [
      "tunnel",
      "floor-grid"
    ]
  },
  {
    "id": "procedural",
    "category": "Visual layers",
    "title": "Procedural scenes",
    "summary": "Layer a generated moving scene behind other visuals.",
    "tags": "procedural video presets symmetry saturation turbulence zoom trails bloom grain vignette speed",
    "body": "<p>Turn Procedural On and choose a scene from its preset dropdown. Its controls adjust color, motion, symmetry, texture and complexity according to the selected scene.</p><p>Procedural starts mostly transparent and one layer in front of Background. Raise Opacity if you want it to dominate, or keep it low for subtle moving texture.</p><p>Not every parameter has the same impact on every scene. Start with the preset, change one setting at a time, and save an effective result in My Presets. High particle counts, complexity, bloom and trails can reduce performance.</p>",
    "related": [
      "layers",
      "performance",
      "presets"
    ]
  },
  {
    "id": "beams-shockwave",
    "category": "Visual layers",
    "title": "Light Beams and Shockwave",
    "summary": "Add accents around your main composition.",
    "tags": "light beams shockwave pulse rays bass audio response",
    "body": "<p>Light Beams and Shockwave are independent layers with their own switches, RGB settings and controls. They are useful as accents rather than the entire scene.</p><p>Play music when judging their response. Reduce count, glow or brightness if they overpower other visuals. Use layer order to put them behind text or in front of a background.</p>",
    "related": [
      "layers",
      "rgb",
      "music-response"
    ]
  },
  {
    "id": "background",
    "category": "Visual layers",
    "title": "Background colors, images and video",
    "summary": "Use Color, White or your own background media.",
    "tags": "background black off white color custom image video browse fit cover stretch tile",
    "body": "<p>Turn Background On and choose <b>Color</b> or <b>White</b>. Adjust Brightness and Hue as appropriate. To leave the canvas black with no background layer, turn Background Off.</p><p>For your own media, click <b>Browse</b> in Image / Video Background, choose a file, enable <b>Use</b>, and choose a fit option: Cover, Fit, Stretch, Center or Tile.</p><p>Imported video playback depends on the installed WebView2 runtime and supported media formats. Keep your source files available; a visual preset is not a bundled copy of your media.</p>",
    "related": [
      "layers",
      "presets",
      "blank-preview"
    ]
  },
  {
    "id": "text",
    "category": "Text and finishing",
    "title": "Titles, subtitles and images",
    "summary": "Add readable text or a logo to your video.",
    "tags": "text overlays title subtitle font size position align outline shadow glow image logo",
    "body": "<p>Open <b>Text &amp; overlays</b> and turn it On. Enter a Title and/or Subtitle, choose font, weight, alignment and colors, and adjust Horizontal/Vertical position.</p><p>Title size reaches 480; Subtitle size reaches 240. Rotation, Opacity, Outline, Shadow/glow and Background box help text fit your scene.</p><p>You can also load an image/logo and adjust its placement, blend and image/text order. FX position chooses whether the overlay appears above post effects or participates inside them.</p><p>If text is missing, check the layer switch, nonempty text, opacity, position, and whether a foreground layer covers it.</p>",
    "related": [
      "text-animation",
      "layers",
      "blank-preview"
    ]
  },
  {
    "id": "text-animation",
    "category": "Text and finishing",
    "title": "Text animation choices",
    "summary": "Use a subtle motion style or a stronger music-driven accent.",
    "tags": "animation fade audio pulse gentle float typewriter slide sway breathe light sweep",
    "body": "<p>Text animation offers <b>None, Fade In/Out, Audio Pulse, Gentle Float, Typewriter, Slide &amp; fade, Slow sway, Breathe</b> and <b>Light sweep</b>.</p><p>None is steady text. Fade and Slide &amp; fade transition visibility; Float and Sway move gently; Breathe changes size subtly; Typewriter reveals characters; Light sweep adds a moving highlight. Audio Pulse responds to music.</p><p>Check your animation while playing a track before recording. Strong motion, rotation or large text can move content outside the visible frame; Safe Guides help judge placement.</p>",
    "related": [
      "text",
      "preview-tools"
    ]
  },
  {
    "id": "post-effects",
    "category": "Text and finishing",
    "title": "Compositor & Post FX",
    "summary": "Apply a finishing treatment to the combined scene.",
    "tags": "compositing compositor post fx hue feedback blur bloom effects contrast",
    "body": "<p>Compositor &amp; Post FX controls finishing effects on the combined image rather than an independently reordered object. Enable it only when you want its treatment.</p><p>Build a clear scene first, then add finishing effects gradually. Feedback and glow can build up an intense image; reduce the relevant settings or turn the card Off to compare against the untreated scene.</p><p>Text\u2019s FX position determines whether it stays clean above the finishing effects or is treated with the rest of the scene.</p>",
    "related": [
      "text",
      "music-response",
      "performance"
    ]
  },
  {
    "id": "music-response",
    "category": "Music and playback",
    "title": "Music Response links",
    "summary": "Map selected music energy to specific visual settings.",
    "tags": "audio modulation matrix routing gain attack release response strength react speed settle speed threshold beat custom hz bpm",
    "body": "<p>Music Response adds custom links; switching it Off does not remove visualizers\u2019 normal built-in music response.</p><p>Each row chooses a <b>music source</b>, a <b>visual destination</b> and an <b>amount</b>. Positive amounts add to the destination\u2019s base setting; negative amounts subtract. Choose None to disable a row. Enable the destination effect for a visible result.</p><p>Sources include Sub Bass, Bass, Low Mid, Mid, High Mid, Treble, Custom A/B, Overall, Peak, Transient, Beat, Beat / 2 and Beat / 4. Destinations are Main Scale, Main Motion, Main Rotate, Main Glow, Post Hue and Post Feedback.</p><ul><li><b>Response strength:</b> strength of custom visual links, not playback volume.</li><li><b>React speed:</b> higher responds faster to rising energy.</li><li><b>Settle speed:</b> higher returns to the base setting faster.</li><li><b>Beat threshold:</b> detection sensitivity; BPM is an estimate.</li><li><b>Custom A/B Hz:</b> frequency ranges from 20\u201320,000 Hz.</li></ul><p>Values are bounded and applied as temporary modulation rather than rewriting the base slider settings. This does not certify a scene as safe for photosensitive viewers; evaluate flashing and motion before sharing.</p>",
    "related": [
      "visualizers",
      "post-effects",
      "music"
    ]
  },
  {
    "id": "music",
    "category": "Music and playback",
    "title": "Load tracks and manage the playlist",
    "summary": "Use bundled Sample Audio or your own files.",
    "tags": "load track music sample audio drag drop playlist clear prev next shuffle loop mp3",
    "body": "<p>Click or drag files into <b>Load Music</b>. Alternatively choose bundled music in <b>Sample Audio</b> and click <b>Load Track</b>. Loaded tracks appear in the right-hand playlist.</p><p>Click a playlist track to select it. Its up/down controls reorder it; its remove control deletes it from the playlist, not from your disk. Clear empties the playlist.</p><p>Prev/Next select tracks. Loop and Shuffle control playback order. You are responsible for permission to use imported music and other media in published videos.</p>",
    "related": [
      "playback",
      "recording",
      "presets"
    ]
  },
  {
    "id": "playback",
    "category": "Music and playback",
    "title": "Play, pause, seek and volume",
    "summary": "Drag the rectangular playback handle to jump within a track.",
    "tags": "transport playback scrub seek timeline play pause stop mute monitor volume audio recorded",
    "body": "<p><b>Play</b> starts playback; <b>Pause</b> holds it; <b>Stop</b> stops playback. Drag the rectangular handle on the Playback slider to seek within the current song. Track time and total duration are shown alongside it.</p><p>The Playback slider is not the recording-duration timeline beneath the preview. Seeking during recording changes the music content captured from that point onward; it does not edit already-recorded footage.</p><p><b>Volume and Mute control what you hear, not the volume of recorded audio.</b> Muting your speakers does not intentionally remove audio from a WebM recording. GIF and PNG exports have no audio.</p>",
    "related": [
      "music",
      "recording",
      "export-formats"
    ]
  },
  {
    "id": "presets",
    "category": "Saving your work",
    "title": "My Presets and backups",
    "summary": "Save a named visual setup and keep a portable backup.",
    "tags": "save preset thumbnails four columns export import backup restore rename delete local storage",
    "body": "<p>My Presets is a collapsed card above Visualizers. Name and save a setup, then apply a saved thumbnail to restore its look. The library uses four columns and scrolls after roughly five rows.</p><p>Use the preset backup/export and import controls to move your named library or keep a copy. Presets are stored locally in the app\u2019s browser profile, not automatically in a cloud account.</p><p>Presets save reusable visual looks. Use the main SAVE command for a complete .amllab project including imported music and backgrounds; preset backups remain separate.</p><p>Before replacing the app or clearing its local data, export a preset backup.</p>",
    "related": [
      "project-save",
      "undo",
      "layers"
    ]
  },
  {
    "id": "project-save",
    "category": "Saving your work",
    "title": "Project settings and autosave",
    "summary": "Keep settings separately from your source media.",
    "tags": "ctrl s save json project autosave restore localstorage download",
    "body": "<p>Use <b>SAVE</b> or <kbd>Ctrl+S</kbd> to save a complete <b>.amllab</b> project. The file includes visual settings, overlays, ordered playlist audio, selected/loaded tracks, loop/shuffle and custom image/video backgrounds. <b>SAVE AS</b> / <kbd>Ctrl+Shift+S</kbd> writes a separate copy.</p><p><b>OPEN</b> / <kbd>Ctrl+O</kbd> validates the file and media before replacing your workspace. Save First, Discard and Cancel protect unsaved work. <b>NEW</b> starts a blank project. Older JSON settings files open with an explicit warning because they did not contain music or backgrounds.</p><p>Disk-backed automatic recovery preserves imported media and offers an unsaved workspace on the next launch. The project status shows recovery/save failures. If recovery is unavailable, save your project before closing. A saved snapshot does not mark edits made during saving as saved.</p><p><b>WINDOW RESET</b> restores the fitted 1728 \u00d7 972 factory size. Normal window resizing and remembered bounds remain available.</p>",
    "related": [
      "presets",
      "recording"
    ]
  },
  {
    "id": "undo",
    "category": "Saving your work",
    "title": "Undo, Redo and Reset All",
    "summary": "Return visual settings to an earlier state or start fresh.",
    "tags": "undo redo reset all ctrl z ctrl y",
    "body": "<p>Use the upper-left Undo and Redo buttons to step through visual-setting changes. <kbd>Ctrl+Z</kbd> undoes; <kbd>Ctrl+Y</kbd> or <kbd>Ctrl+Shift+Z</kbd> redoes.</p><p>Reset All returns scene controls to their defaults. Do not treat it as an erase-media or delete-export command. Save a preset or settings backup before making a large reset if you want to keep your look.</p><p>Help search and support fields are kept out of visual snapshots and their typing does not trigger the scene\u2019s undo shortcuts.</p>",
    "related": [
      "presets",
      "project-save"
    ]
  },
  {
    "id": "preview-tools",
    "category": "Preview and performance",
    "title": "Freeze, snapshots, fullscreen and guides",
    "summary": "Preview controls help you judge the scene before recording.",
    "tags": "preview freeze save snapshot fullscreen safe guides quality full ultra fps",
    "body": "<p><b>Freeze</b> holds the preview; click it again to resume animation. <b>Save Snapshot</b> saves a still image. <b>Fullscreen</b> expands the preview. <b>Safe Guides</b> helps judge content placement.</p><p>The preview-quality dropdown adjusts preview workload, including Full and Ultra settings. It is separate from export resolution and FPS. The FPS indicator is current preview performance, not a guarantee that export will maintain the selected FPS.</p><p>Unfreeze the preview before recording animated output. Inspect your composition at the intended aspect ratio before starting a long capture.</p>",
    "related": [
      "performance",
      "export-settings",
      "recording"
    ]
  },
  {
    "id": "performance",
    "category": "Preview and performance",
    "title": "Keep animation smooth",
    "summary": "Reduce the heaviest settings before adding more layers.",
    "tags": "slow choppy jitter gpu cpu memory stutter lag performance resolution fps trails",
    "body": "<ul><li>Start with 1920\u00d71080 or 1280\u00d7720 and 30 or 60 FPS rather than 4K/120 FPS.</li><li>Reduce particle counts, procedural complexity, trails, feedback, glow and unnecessary layers.</li><li>Use a lower preview-quality setting for editing; set export resolution separately.</li><li>Close GPU-heavy applications and keep the recording window visible.</li></ul><p>Hardware, media decoding and scene complexity determine performance. The demo limits exports to 30 seconds; practical resolution and frame rate depend on your browser and hardware.</p>",
    "related": [
      "preview-tools",
      "long-recordings",
      "recording"
    ]
  },
  {
    "id": "export-formats",
    "category": "Recording and export",
    "title": "Export formats and codecs",
    "summary": "WebM includes audio; GIF and PNG ZIP are image-only.",
    "tags": "webm vp8 opus gif png zip mp4 h264 aac vp9 codec",
    "body": "<ul><li><b>WebM \u00b7 VP8/Opus:</b> animated video and recorded audio, packaged without re-encoding into other video codecs.</li><li><b>Animated GIF:</b> animated images without audio; often large and with limited colors.</li><li><b>PNG Sequence \u00b7 ZIP:</b> a sequence of individual PNG frames in a ZIP archive, without audio.</li></ul><p>MP4/H.264/AAC and VP9 export are not included. WebM may not play in every publishing service or video editor; check the destination\u2019s accepted formats before a long recording.</p><p>Imported-media playback still uses the installed Microsoft WebView2 runtime. Its playback support is separate from the restricted bundled export tools.</p>",
    "related": [
      "export-settings",
      "licenses",
      "recording"
    ]
  },
  {
    "id": "export-settings",
    "category": "Recording and export",
    "title": "Set resolution, FPS, length and bitrate",
    "summary": "Choose export settings before starting a recording.",
    "tags": "format resolution custom portrait square landscape width height fps bitrate length quality 3 hours",
    "body": "<p>The upper bar chooses Format / Codec, Resolution, FPS, Length, Video bitrate and Audio bitrate. Resolution includes landscape, portrait, square and Custom size.</p><p>Custom sizes support 64\u20137680 pixels per side. FPS options extend from 24 to 120. The browser demo offers 10, 30 or 30 seconds. Large dimensions and high FPS can exceed your machine\u2019s practical capture speed.</p><p>These controls lock while a recording or conversion session is active. The session keeps the settings chosen when it started; changing visible settings later is not a conversion override for that session.</p><p>For WebM, bitrate is a capture target rather than an exact final file size. Audio bitrate applies to WebM audio, not GIF/PNG.</p>",
    "related": [
      "recording",
      "long-recordings",
      "export-formats"
    ]
  },
  {
    "id": "recording",
    "category": "Recording and export",
    "title": "Record and export a video",
    "summary": "Capture plays in real time; finishing works on the recorded footage.",
    "tags": "start rec stop rec save now export realtime duration pause minimize foreground background wait finish",
    "body": "<ol><li>Choose your visual setup, track and export settings.</li><li>Click <b>Start Rec</b> and keep the app visible. Capture runs in real time; a one-minute recording needs 30 seconds of active recording time.</li><li>Click <b>Stop Rec</b> when you have enough footage, or let the selected length stop capture.</li><li>Click <b>Save Now</b> or <b>EXPORT</b>, choose a destination and wait for completion.</li></ol><p>Stop Rec pauses recording and music; Start Rec can resume a paused, unfinalized session. Hiding/minimizing the app pauses animated capture; restore it and click Start Rec to resume.</p><p>Finishing seals the capture and packages/converts existing footage. That stage runs as fast as the task and hardware allow, can run minimized, and may take time for long GIF/PNG exports. Stop Rec cancels conversion; retained capture can be retried.</p><p>Do not start a replacement recording until you have saved or recovered the previous footage you need.</p>",
    "related": [
      "recover-recording",
      "long-recordings",
      "playback"
    ]
  },
  {
    "id": "recover-recording",
    "category": "Recording and export",
    "title": "Recover or retry a recording",
    "summary": "Failed and interrupted captures are retained locally.",
    "tags": "recover retained interrupted failed cancelled destination disk retry recordings three dots path",
    "body": "<p>Cancelled, failed and completed captures remain in this browser for recovery. Use <b>\u2026</b> before starting another recording to reopen the latest capture, then Export to retry. Interrupted captures can be partial.</p><p>Each capture has its own local session. Starting a replacement makes that recording the latest recovery candidate. Download important work and verify the file; clearing this website\u2019s browser storage removes local recovery.</p><p>Stop Rec cancels conversion and retains the capture. A completed download cannot be confirmed by a web page, so the latest recording remains recoverable after export.</p>",
    "related": [
      "recording",
      "long-recordings",
      "support"
    ]
  },
  {
    "id": "long-recordings",
    "category": "Recording and export",
    "title": "Demo duration and browser storage",
    "summary": "Exports are limited to 30 seconds; editing and playback are unrestricted.",
    "tags": "3 hour three hours endurance large file disk space bitrate storage limits ram",
    "body": "<p>Choose 10, 30 or 30 seconds. The demo stops recording at its selected limit, and the exporter independently removes media beyond that limit. GIF and PNG conversion may take longer than the capture.</p><p>Projects, media and recovery recordings are stored locally in this browser using IndexedDB. Browser storage can be cleared or evicted; download important projects using Save. Private browsing may offer less space.</p><p>GIF and PNG conversion have a 512 MB working-data limit. If the scene exceeds it, the original recording stays recoverable; use a lower resolution, frame rate or shorter capture.</p>",
    "related": [
      "recording",
      "performance",
      "recover-recording"
    ]
  },
  {
    "id": "blank-preview",
    "category": "Troubleshooting",
    "title": "Blank preview or a missing layer",
    "summary": "Check switches, playback, opacity, Solo and layer order.",
    "tags": "black empty nothing visible no text preview missing layer",
    "body": "<ol><li>Enable at least one visual layer; opening its card alone does not enable it.</li><li>Load and play a track if the effect needs music activity.</li><li>Unfreeze the preview.</li><li>Check Solo and whether an opaque foreground layer covers what you expect to see.</li><li>Raise Opacity and check size/position. For text, enter nonempty Title or Subtitle.</li><li>For custom background media, choose a file and enable Use.</li></ol><p>Background Off leaves the underlying canvas black. This is intentional, not a black-background mode that secretly adds glow.</p>",
    "related": [
      "first-scene",
      "layers",
      "text",
      "background"
    ]
  },
  {
    "id": "export-trouble",
    "category": "Troubleshooting",
    "title": "Export did not finish or will not play",
    "summary": "Keep the capture and check the message, disk space and format.",
    "tags": "export error fail webview2 ffmpeg ffprobe missing tools unsupported playback no audio cancel",
    "body": "<p>Read the exact error message, verify browser storage and download permissions, and keep the recording recoverable using \u2026 before starting a new capture.</p><p>WebM needs VP8/Opus playback support. GIF/PNG contain no audio. Try a lower resolution or frame rate if browser conversion runs out of memory.</p>",
    "related": [
      "recover-recording",
      "export-formats",
      "support"
    ]
  },
  {
    "id": "licenses",
    "category": "Help and support",
    "title": "Open-source licenses and component source",
    "summary": "Local JavaScript libraries and browser-native codecs.",
    "tags": "license licensing lgpl ffmpeg ffprobe zlib source copyright royalties third party codec notices",
    "body": "<p>Open-source licenses displays the bundled notices. Save component source downloads the browser JavaScript and library sources. Browser-native VP8/Opus capture and local GIF/PNG conversion replace the desktop FFmpeg bridge. No native executable or cloud encoding service is included.</p><p>Third-party MIT/zlib permissions remain intact. Media rights are separate from software licenses.</p>",
    "related": [
      "export-formats",
      "support"
    ]
  },
  {
    "id": "shortcuts",
    "category": "Help and support",
    "title": "Keyboard shortcuts",
    "summary": "Open Help and manage visual-setting changes.",
    "tags": "keyboard f1 escape esc ctrl s ctrl z ctrl y shortcuts",
    "body": "<ul><li><kbd>F1</kbd>: open Help Center.</li><li><kbd>Esc</kbd>: close the Help/Support dialog.</li><li><kbd>Ctrl+S</kbd>: save a portable project with its music and background.</li><li><kbd>Ctrl+Z</kbd>: Undo.</li><li><kbd>Ctrl+Y</kbd> or <kbd>Ctrl+Shift+Z</kbd>: Redo.</li></ul><p>Help search supports typing and Enter to focus the displayed article. Scene shortcuts do not act on your scene while you type in Help or Support.</p>",
    "related": [
      "project-save",
      "undo",
      "support"
    ]
  },
  {
    "id": "support",
    "category": "Help and support",
    "title": "Contact ShamonSoft support",
    "summary": "Choose a mail app or copy the support address.",
    "tags": "contact email support address outlook default client send privacy",
    "body": "<p>Click <b>CONTACT SUPPORT</b> at the upper right, or Contact support at the bottom of Help. The address is <b>support@shamonsoft.com</b>.</p><p>Use COPY ADDRESS for webmail or choose Default email app / an available registered mail app. Selecting an app opens an email request; it does not change your Windows mail defaults or send a message automatically.</p><p>Include your AML version, Windows version, steps to reproduce, expected result, actual result and the exact error. For exports include format, resolution, FPS and duration. Choose screenshots and attachments yourself; the app does not automatically upload your projects or recordings.</p>",
    "related": [
      "export-trouble",
      "licenses",
      "shortcuts"
    ]
  }
];
