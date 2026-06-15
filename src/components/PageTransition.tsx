"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setVisible(false);
    setIsTransitioning(true);
    // Micro delay to trigger the enter CSS transition
    const timer = setTimeout(() => {
      setVisible(true);
    }, 40);

    const finishTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 340); // duration-300 + 40ms delay

    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [pathname]);

  return (
    <div
      className={`flex-1 flex flex-col ${
        isTransitioning
          ? `transition-all duration-300 ease-out transform ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"}`
          : "opacity-100"
      }`}
    >
      {children}
    </div>
  );
}
