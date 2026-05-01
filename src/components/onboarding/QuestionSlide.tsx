'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface QuestionSlideProps {
  children: React.ReactNode;
  slideKey: string | number;
  direction: 'forward' | 'back';
}

export function QuestionSlide({ children, slideKey, direction }: QuestionSlideProps) {
  const [animClass, setAnimClass] = useState(
    direction === 'forward' ? 'onboarding-slide-enter' : 'onboarding-slide-back-enter',
  );
  const prevKey = useRef(slideKey);

  useEffect(() => {
    if (prevKey.current !== slideKey) {
      setAnimClass(direction === 'forward' ? 'onboarding-slide-enter' : 'onboarding-slide-back-enter');
      prevKey.current = slideKey;
    }
  }, [slideKey, direction]);

  return (
    <div
      key={slideKey}
      className={cn('w-full', animClass)}
    >
      {children}
    </div>
  );
}
