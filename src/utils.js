// Utilidades puras compartidas.


export const rand = (min, max) => min + Math.random() * (max - min);


export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));


export const lerp = (a, b, amount) => a + (b - a) * amount;


export function overlaps(a, b, inset = 0.25) {
  const aw = a.w * (1 - inset);
  const ah = a.h * (1 - inset);
  const bw = b.w * (1 - inset);
  const bh = b.h * (1 - inset);
  return Math.abs(a.x - b.x) * 2 < aw + bw && Math.abs(a.y - b.y) * 2 < ah + bh;
}

