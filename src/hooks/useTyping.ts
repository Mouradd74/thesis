'use client'
import { useState, useEffect } from "react";

export function useTyping(text, speed = 40, delay = 0) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;

    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;

        if (i >= text.length) clearInterval(interval);
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, delay]);

  return displayed;
}