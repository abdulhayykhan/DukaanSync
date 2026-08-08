"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number;
  glareOpacity?: number;
}

export function Card3D({
  children,
  className,
  maxTilt = 8,
  glareOpacity = 0.25,
  ...props
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || isReducedMotion) {
      setShouldAnimate(false);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!shouldAnimate || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate percentage position (0 to 1)
    const xPct = x / rect.width;
    const yPct = y / rect.height;

    // Calculate tilt (normalized from -1 to 1)
    const tiltX = (0.5 - yPct) * maxTilt * 2;
    const tiltY = (xPct - 0.5) * maxTilt * 2;

    setTilt({ x: tiltX, y: tiltY });
    setGlarePosition({ x: xPct * 100, y: yPct * 100 });
  };

  const handleMouseEnter = () => {
    if (!shouldAnimate) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!shouldAnimate) return;
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlarePosition({ x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative transition-all duration-200 ease-out",
        shouldAnimate ? "[transform-style:preserve-3d]" : "",
        className
      )}
      style={{
        perspective: shouldAnimate ? "1000px" : "none",
        transform: shouldAnimate
          ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
          : "none",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
      
      {/* Glare Overlay */}
      {shouldAnimate && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-300 rounded-inherit",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,${glareOpacity}), transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}
