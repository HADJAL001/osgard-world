export const MAP_CAMERA_MIN_ZOOM = 1;
export const MAP_CAMERA_MAX_ZOOM = 2.4;
export const MAP_CAMERA_STEP = 0.2;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeMapCamera(camera = {}, width = 1200, height = 760) {
  const zoom = Math.max(MAP_CAMERA_MIN_ZOOM, Math.min(MAP_CAMERA_MAX_ZOOM, finite(camera.zoom, 1)));
  const minX = width * (1 - zoom);
  const minY = height * (1 - zoom);
  return {
    zoom,
    x: Math.max(minX, Math.min(0, finite(camera.x, 0))),
    y: Math.max(minY, Math.min(0, finite(camera.y, 0))),
  };
}

/** Zoom around a logical map-space point so its underlying world coordinate stays anchored. */
export function zoomMapCameraAtPoint(camera, targetZoom, focusPoint, width = 1200, height = 760) {
  const current = normalizeMapCamera(camera, width, height);
  const requested = Number.isFinite(targetZoom) ? targetZoom : current.zoom;
  const zoom = Math.max(MAP_CAMERA_MIN_ZOOM, Math.min(MAP_CAMERA_MAX_ZOOM, requested));
  const focusX = finite(focusPoint?.x, width / 2);
  const focusY = finite(focusPoint?.y, height / 2);
  const worldX = (focusX - current.x) / current.zoom;
  const worldY = (focusY - current.y) / current.zoom;
  return normalizeMapCamera({ zoom, x: focusX - worldX * zoom, y: focusY - worldY * zoom }, width, height);
}

export function zoomMapCamera(camera, direction, width = 1200, height = 760) {
  const current = normalizeMapCamera(camera, width, height);
  const rawZoom = current.zoom + Math.sign(direction || 0) * MAP_CAMERA_STEP;
  const nextZoom = Math.max(MAP_CAMERA_MIN_ZOOM, Math.min(MAP_CAMERA_MAX_ZOOM, Math.round(rawZoom * 100) / 100));
  if (nextZoom === current.zoom) return current;
  return zoomMapCameraAtPoint(current, nextZoom, { x: width / 2, y: height / 2 }, width, height);
}


/** Apply a two-pointer gesture from its initial geometry without accumulating transform drift. */
export function pinchMapCamera(initialCamera, initialMidpoint, initialDistance, currentMidpoint, currentDistance, width = 1200, height = 760) {
  const start = normalizeMapCamera(initialCamera, width, height);
  const startDistance = Math.max(12, finite(initialDistance, 12));
  const endDistance = Math.max(12, finite(currentDistance, startDistance));
  const zoom = Math.max(MAP_CAMERA_MIN_ZOOM, Math.min(MAP_CAMERA_MAX_ZOOM, start.zoom * endDistance / startDistance));
  const startX = finite(initialMidpoint?.x, width / 2);
  const startY = finite(initialMidpoint?.y, height / 2);
  const endX = finite(currentMidpoint?.x, startX);
  const endY = finite(currentMidpoint?.y, startY);
  const worldX = (startX - start.x) / start.zoom;
  const worldY = (startY - start.y) / start.zoom;
  return normalizeMapCamera({ zoom, x: endX - worldX * zoom, y: endY - worldY * zoom }, width, height);
}

export function panMapCamera(camera, deltaX, deltaY, width = 1200, height = 760) {
  const current = normalizeMapCamera(camera, width, height);
  return normalizeMapCamera({
    zoom: current.zoom,
    x: current.x + finite(deltaX),
    y: current.y + finite(deltaY),
  }, width, height);
}

export function mapPointToWorld(point, camera, width = 1200, height = 760) {
  const normalized = normalizeMapCamera(camera, width, height);
  return {
    x: (finite(point?.x) - normalized.x) / normalized.zoom,
    y: (finite(point?.y) - normalized.y) / normalized.zoom,
  };
}

export function mapWorldToPoint(point, camera, width = 1200, height = 760) {
  const normalized = normalizeMapCamera(camera, width, height);
  return {
    x: normalized.x + finite(point?.x) * normalized.zoom,
    y: normalized.y + finite(point?.y) * normalized.zoom,
  };
}