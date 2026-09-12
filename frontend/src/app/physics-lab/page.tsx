'use client';
import { Profiler, useEffect, useRef, useState } from 'react';
import Counter from '../../components/PhysicsCounterMatterJS';

const image = 'http://127.0.0.1:3016/lab-ingredient.svg';
const ingredients = Array.from({ length: 20 }, (_, i) => ({ name: `Ingredient ${i + 1}`, quantity: '1', url: image }));
export default function PhysicsLab() {
  const commits = useRef(0);
  const writes = useRef(0);
  const [result, setResult] = useState('Warming up');
  useEffect(() => {
    const observer = new MutationObserver(records => { for (const record of records) {
      const element = record.target as HTMLElement;
      if (element.querySelector?.('img[alt^="Ingredient"]') && element.style.transform) writes.current++;
    } });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: true });
    const warmup = setTimeout(() => { commits.current = 0; writes.current = 0; }, 5000);
    const finish = setTimeout(async () => {
      observer.disconnect();
      const summary = `Five seconds: ${commits.current} React commits; ${writes.current} transform mutations.`;
      setResult(summary);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setResult(summary + ` Reduced motion: ${writes.current === 0 && document.querySelectorAll('[data-physics-item]').length === 20 ? 'pass' : 'FAIL'}.`);
      } else {
        const pause = document.querySelector<HTMLButtonElement>('button[aria-pressed]');
        const item = document.querySelector<HTMLElement>('[data-physics-item]');
        pause?.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        const before = item?.style.transform;
        await new Promise(resolve => setTimeout(resolve, 200));
        const stopped = before === item?.style.transform;
        item?.focus();
        item?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        setResult(summary + ` Active: ${writes.current > 0 ? 'pass' : 'FAIL'}. Pause: ${stopped ? 'pass' : 'FAIL'}. Keyboard move: ${before !== item?.style.transform ? 'pass' : 'FAIL'}.`);
      }
    }, 10000);
    return () => { clearTimeout(warmup); clearTimeout(finish); observer.disconnect(); };
  }, []);
  if (process.env.NODE_ENV !== 'development') return <p>Local test scene only.</p>;
  return <><output style={{position:'fixed', bottom:20, left:20, zIndex:999999, background:'white'}}>{result}</output><Profiler id="physics" onRender={() => { commits.current++; }}>
    <Counter ingredients={ingredients} equipment={[]} useAllItems />
  </Profiler></>;
}
