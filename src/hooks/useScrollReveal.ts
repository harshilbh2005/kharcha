import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealResult {
  ref: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
}

export function useScrollReveal(): UseScrollRevealResult {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
