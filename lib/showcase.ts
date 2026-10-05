/**
 * The home is a curated showcase, not the whole map: the first view frames the downtown
 * front row along the boulevard, where branded buildings stand in first line.
 */
/**
 * Shifted so the composition sits right of the title card / property panel (left column):
 * the camera's screen-right axis is (cos 0.59, 0, -sin 0.59) for its default azimuth.
 */
export const SHOWCASE = { x: -6, y: 4.5, z: 14 };
/** The boulevard between Downtown and the Residential District. */
export const AVENUE = { z: 24, from: -18, to: 18, width: 6.4 };
/** About 15–25 plots at 1920×1080; a narrower but similar framing on phones. */
export function showcaseZoom(width: number, height: number) {
  return width < 600 ? 19 : Math.min(width / 60, height / 33);
}
