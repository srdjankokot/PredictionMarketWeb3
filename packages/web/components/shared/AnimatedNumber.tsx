'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

/** Tweens between numeric values (e.g. live volume/price) for a polished feel. */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);

  return <span className={className}>{format ? format(display) : Math.round(display).toString()}</span>;
}
