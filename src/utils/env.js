// Runtime capabilities, read once. Everything heavy is gated on these.
const mq = (q) => window.matchMedia(q).matches;

export const env = {
  reducedMotion: mq('(prefers-reduced-motion: reduce)'),
  finePointer: mq('(hover: hover) and (pointer: fine)'),
  touch: mq('(pointer: coarse)'),
  narrow: mq('(max-width: 900px)'),
  webgl: (() => {
    try {
      const c = document.createElement('canvas');
      return !!c.getContext('webgl2');
    } catch {
      return false;
    }
  })(),
};

env.lowPower = env.touch || env.narrow || (navigator.hardwareConcurrency || 8) <= 4;
