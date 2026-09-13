import fixture from "./data/ign-06182.json";

type Point = readonly [longitude: number, latitude: number];
type Ring = readonly Point[];

const rings = fixture.feature.geometry.coordinates as unknown as readonly Ring[];

function onSegment(point: Point, start: Point, end: Point): boolean {
  const [x, y] = point;
  const [startX, startY] = start;
  const [endX, endY] = end;
  const pointFromStartX = x - startX;
  const pointFromStartY = y - startY;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const roundoff =
    Number.EPSILON *
    64 *
    Math.max(
      Math.abs(x),
      Math.abs(y),
      Math.abs(startX),
      Math.abs(startY),
      Math.abs(endX),
      Math.abs(endY),
    );
  const cross = pointFromStartX * segmentY - pointFromStartY * segmentX;
  const crossTolerance =
    roundoff *
    (Math.abs(pointFromStartX) +
      Math.abs(pointFromStartY) +
      Math.abs(segmentX) +
      Math.abs(segmentY));
  if (Math.abs(cross) > crossTolerance) return false;

  const pointFromEndX = x - endX;
  const pointFromEndY = y - endY;
  const dot = pointFromStartX * pointFromEndX + pointFromStartY * pointFromEndY;
  const dotTolerance =
    roundoff *
    (Math.abs(pointFromStartX) +
      Math.abs(pointFromStartY) +
      Math.abs(pointFromEndX) +
      Math.abs(pointFromEndY));
  return dot <= dotTolerance;
}

function isOnRingBoundary(point: Point, ring: Ring): boolean {
  return ring.slice(1).some((vertex, index) => onSegment(point, ring[index], vertex));
}

function isInsideRing([x, y]: Point, ring: Ring): boolean {
  let inside = false;
  for (let index = 1; index < ring.length; index += 1) {
    const [startX, startY] = ring[index - 1];
    const [endX, endY] = ring[index];
    if (
      startY > y !== endY > y &&
      x < ((endX - startX) * (y - startY)) / (endY - startY) + startX
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function coversRosales(point: Point): boolean {
  const [longitude, latitude] = point;
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  )
    return false;

  if (rings.some((ring) => isOnRingBoundary(point, ring))) return true;
  if (!isInsideRing(point, rings[0])) return false;
  return !rings.slice(1).some((ring) => isInsideRing(point, ring));
}
