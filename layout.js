// Keep navigation and camera placement aligned with the measured page layout.
export function chapterProgress(scrollTop, offsets) {
  if (!offsets.length || scrollTop <= offsets[0]) return 0;
  for (let i = 0; i < offsets.length - 1; i++) {
    if (scrollTop < offsets[i + 1]) {
      return i + (scrollTop - offsets[i]) / Math.max(1, offsets[i + 1] - offsets[i]);
    }
  }
  return offsets.length - 1;
}
export function stageViewport({ width, height, panel, headingBottom, headerBottom, portrait }) {
  const top = Math.max(headerBottom + 12, portrait ? headingBottom + 10 : height * .25);
  const bottom = portrait ? Math.min(height - 20, panel.top - 52) : height * .83;
  const left = portrait ? 16 : 24;
  const right = portrait ? width - 16 : Math.max(width * .35, panel.left - 24);
  const availableHeight = Math.max(80, bottom - top);
  const size = Math.max(64, Math.min((right - left) * .64, availableHeight * .78, 340));
  return {
    centerX: (left + right) / 2,
    centerY: Math.min(height - 100, top + availableHeight / 2),
    distance: Math.max(8, 2.4 * height / (2 * Math.tan(39 * Math.PI / 360) * size))
  };
}
