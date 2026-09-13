import { expect, test } from "vitest";
import { coversRosales } from "../worker/territory";

test("territory accepts a known interior point", () => {
  expect(coversRosales([-62.078, -38.875])).toBe(true);
});

test("territory accepts a point on the pinned fixture boundary", () => {
  expect(coversRosales([-61.72631454499998, -38.68756866499996])).toBe(true);
});

test("territory rejects an independently verified near-boundary exterior point", () => {
  expect(coversRosales([-61.72631453499998, -38.68756866499996])).toBe(false);
});

test("territory rejects an exterior point just beyond a segment endpoint", () => {
  expect(coversRosales([-61.72535704796371, -38.68594741204858])).toBe(false);
});

test("territory rejects a known exterior point", () => {
  expect(coversRosales([-62.3, -39.1])).toBe(false);
});
