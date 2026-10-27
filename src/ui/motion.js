import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger, CustomEase);

// The two curves of the whole site (mirrored as CSS tokens).
CustomEase.create('heavy', '0.76,0,0.18,1');
CustomEase.create('settle', '0.16,1,0.3,1');

export function initSmoothScroll() {
  const lenis = new Lenis({ duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 2.2, easing: CustomEase.get('heavy') });
    });
  });
  return lenis;
}

/** Fade + 28px rise, once, with a quiet stagger. */
export function initReveals() {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'settle', stagger: 0.12 }),
  });

  // Masked lines rise out of their own baseline.
  gsap.utils.toArray('[data-lines]:not(.hero__title)').forEach((el) => {
    gsap.to(el.querySelectorAll('.line > span'), {
      y: 0, duration: 1.6, ease: 'settle', stagger: 0.14,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  // Philosophy: the text "fills with weight" as you read down.
  gsap.utils.toArray('[data-scrub-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.to(el.querySelectorAll('.w'), {
      opacity: 1, ease: 'none', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 42%', scrub: 1.2 },
    });
  });

  // Line drawings (split motif, process icons) draw themselves in.
  gsap.utils.toArray('[data-draw]').forEach((svg) => {
    const paths = svg.querySelectorAll('path, line, polyline, rect, circle');
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    gsap.to(paths, {
      strokeDashoffset: 0, duration: 2.2, ease: 'heavy', stagger: 0.18,
      scrollTrigger: { trigger: svg, start: 'top 85%', once: true },
    });
  });
}

/** Collection: vertical scroll drives a pinned horizontal track, with lag = inertia. */
export function initHorizontal(section) {
  const track = section.querySelector('.collection__track');
  const bar = section.querySelector('.collection__progress i');
  const mm = gsap.matchMedia();

  mm.add('(min-width: 901px)', () => {
    const distance = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + distance(),
        pin: true,
        scrub: 1.2,
        invalidateOnRefresh: true,
        onUpdate: (st) => bar && (bar.style.transform = `scaleX(${st.progress})`),
      },
    });

    // Inside each card the image drifts against the track: depth without gimmick.
    track.querySelectorAll('.card__media:has(.card__frame)').forEach((m) => {
      gsap.fromTo(m.querySelector('.card__frame'), { xPercent: -4 }, {
        xPercent: 4, ease: 'none',
        scrollTrigger: { trigger: m, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
      });
    });
  });

  mm.add('(max-width: 900px)', () => {
    const onScroll = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? track.scrollLeft / max : 0})`;
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  });
}

export { gsap, ScrollTrigger };
