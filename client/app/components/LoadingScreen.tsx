"use client";

import React, { useEffect, useState, useRef } from "react";

// ── Types ──
interface LoadingScreenProps {
  isLoading: boolean;
  onFinish?: () => void;
}

// ── 1. Veg Badge: Green square with green circle ──
export function VegBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-4 h-4 sm:w-5 sm:h-5 bg-[#064e3b]/90 border border-[#10b981] flex items-center justify-center rounded-[3px] shadow-md backdrop-blur-xs ${className}`}
      title="Vegetarian"
    >
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#10b981]" />
    </div>
  );
}

// ── 2. Non-Veg Badge: Brown square with brown triangle ──
export function NonVegBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-4 h-4 sm:w-5 sm:h-5 bg-[#451a03]/90 border border-[#b45309] flex items-center justify-center rounded-[3px] shadow-md backdrop-blur-xs ${className}`}
      title="Non-Vegetarian"
    >
      <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-[#d97706] sm:border-l-[4.5px] sm:border-r-[4.5px] sm:border-b-[8px]" />
    </div>
  );
}

// ── 3. Custom SVG Food Illustrations ──

// a) Chicken Leg 🍗
export function Chicken({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full drop-shadow-lg ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bone */}
      <path
        d="M25 75 C 20 70, 15 75, 12 70 C 9 65, 14 60, 20 62 L 38 48"
        stroke="#fef3c7"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="14" cy="73" r="5" fill="#fef08a" />
      <circle cx="21" cy="77" r="5" fill="#fef3c7" />

      {/* Meat body */}
      <path
        d="M32 52 C 28 35, 42 18, 62 16 C 80 14, 88 30, 85 48 C 82 64, 62 70, 44 65 C 34 62, 32 55, 32 52 Z"
        fill="url(#chickenGrad)"
      />
      {/* Grill marks & highlights */}
      <path
        d="M48 26 Q 58 36, 68 28"
        stroke="#78350f"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M42 38 Q 54 48, 66 38"
        stroke="#78350f"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M40 50 Q 52 58, 62 48"
        stroke="#78350f"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Glaze sheen */}
      <path
        d="M52 20 C 65 20, 75 26, 74 34"
        stroke="#fef08a"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Herb specks */}
      <circle cx="55" cy="30" r="1.5" fill="#15803d" />
      <circle cx="62" cy="42" r="1.2" fill="#15803d" />
      <circle cx="48" cy="44" r="1.5" fill="#15803d" />

      <defs>
        <radialGradient
          id="chickenGrad"
          cx="60%"
          cy="40%"
          r="50%"
          fx="60%"
          fy="40%"
        >
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// b) Paneer Cubes 🧀
export function Paneer({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full drop-shadow-lg ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cube 1 (Back Left) */}
      <path d="M20 40 L 42 28 L 62 38 L 40 50 Z" fill="#fefefc" />
      <path d="M20 40 L 40 50 L 40 68 L 20 56 Z" fill="#fef3c7" />
      <path d="M40 50 L 62 38 L 62 56 L 40 68 Z" fill="#fde68a" />
      {/* Sear mark */}
      <path d="M25 41 L 38 48 L 54 40 L 40 33 Z" fill="#d97706" opacity="0.35" />

      {/* Cube 2 (Front Right) */}
      <path d="M45 52 L 68 40 L 88 50 L 65 62 Z" fill="#ffffff" />
      <path d="M45 52 L 65 62 L 65 82 L 45 70 Z" fill="#fef08a" />
      <path d="M65 62 L 88 50 L 88 70 L 65 82 Z" fill="#fde047" />
      {/* Sear mark */}
      <path d="M50 53 L 64 60 L 80 52 L 66 45 Z" fill="#b45309" opacity="0.4" />

      {/* Cilantro garnish */}
      <circle cx="56" cy="48" r="2" fill="#16a34a" />
      <circle cx="62" cy="46" r="1.5" fill="#15803d" />
      <circle cx="70" cy="54" r="1.8" fill="#16a34a" />
    </svg>
  );
}

// c) Roti 🫓
export function Roti({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full drop-shadow-lg ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer puffed roti base */}
      <circle cx="50" cy="50" r="38" fill="url(#rotiGrad)" stroke="#d97706" strokeWidth="1.5" />
      
      {/* Puff highlight */}
      <ellipse cx="44" cy="42" rx="24" ry="18" fill="#fef08a" opacity="0.4" />

      {/* Tandoori charred spots */}
      <ellipse cx="36" cy="38" rx="5" ry="3.5" fill="#78350f" opacity="0.75" />
      <ellipse cx="58" cy="44" rx="6" ry="4" fill="#451a03" opacity="0.8" />
      <ellipse cx="46" cy="62" rx="7" ry="4.5" fill="#78350f" opacity="0.7" />
      <circle cx="30" cy="54" r="3" fill="#92400e" opacity="0.6" />
      <circle cx="66" cy="32" r="2.5" fill="#451a03" opacity="0.7" />

      {/* Ghee sheen */}
      <path
        d="M32 46 C 40 40, 52 42, 60 50"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.4"
      />

      <defs>
        <radialGradient id="rotiGrad" cx="45%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// d) Cold Drink 🥤
export function ColdDrink({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full drop-shadow-lg ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Glass Body */}
      <path
        d="M30 25 L 35 82 C 35 85, 65 85, 65 82 L 70 25 Z"
        fill="url(#drinkGrad)"
        stroke="#fef08a"
        strokeWidth="1.5"
        opacity="0.9"
      />

      {/* Glass rim */}
      <ellipse cx="50" cy="25" rx="20" ry="4" fill="#ffffff" opacity="0.4" stroke="#d97706" strokeWidth="1" />

      {/* Ice Cubes */}
      <rect x="38" y="35" width="12" height="12" rx="2" fill="#e0f2fe" opacity="0.6" transform="rotate(12 44 41)" />
      <rect x="50" y="45" width="11" height="11" rx="2" fill="#bae6fd" opacity="0.55" transform="rotate(-8 55 50)" />

      {/* Bubbles */}
      <circle cx="42" cy="65" r="1.5" fill="#fde047" opacity="0.7" />
      <circle cx="56" cy="70" r="2" fill="#fde047" opacity="0.6" />
      <circle cx="48" cy="55" r="1.2" fill="#ffffff" opacity="0.8" />

      {/* Straw */}
      <path
        d="M58 12 L 50 35 L 46 80"
        stroke="#ef4444"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M58 12 L 50 35 L 46 80"
        stroke="#ffffff"
        strokeWidth="1"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />

      <defs>
        <linearGradient id="drinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="50%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── 4. Restaurant Logo / Medallion ──
export function RestaurantLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#fef08a] overflow-hidden flex items-center justify-center shadow-xl relative ${className}`}
      style={{
        boxShadow: "0 0 15px rgba(245, 158, 11, 0.6), inset 0 0 8px rgba(254, 240, 138, 0.4)",
      }}
    >
      <img
        src="/dhaba-logo.jpg"
        alt="Sree Nookambika Dhaba Logo"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

// ── 5. Thali Plate ──
export function Plate({
  step,
  isReducedMotion,
}: {
  step: number;
  isReducedMotion: boolean;
}) {
  const isPlateIn = step >= 2;
  const isRotating = step >= 5;

  return (
    <div
      className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center transition-all duration-700 ease-out"
      style={{
        transform: isPlateIn
          ? isRotating && !isReducedMotion
            ? "translateY(0) scale(1) rotate(360deg)"
            : "translateY(0) scale(1)"
          : "translateY(140px) scale(0.8)",
        opacity: isPlateIn ? 1 : 0,
        transitionProperty: isRotating ? "transform, opacity" : "transform, opacity",
        transitionDuration: isRotating ? "1.6s" : "0.7s",
        transitionTimingFunction: isRotating ? "cubic-bezier(0.4, 0, 0.2, 1)" : "ease-out",
      }}
    >
      {/* Outer Metallic Rim & Thali Base */}
      <div
        className="absolute inset-0 rounded-full border-[6px] sm:border-[8px] border-[#d97706] p-2 shadow-2xl"
        style={{
          background: "radial-gradient(circle, #2a180c 0%, #190e07 70%, #0d0703 100%)",
          boxShadow:
            "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(217, 119, 6, 0.35), inset 0 0 20px rgba(254, 240, 138, 0.15)",
          borderColor: "#d97706",
        }}
      >
        {/* Inner Golden Rim Line */}
        <div className="w-full h-full rounded-full border border-[#fef08a]/30 relative p-3">
          
          {/* Top Left Compartment — Chicken */}
          <div className="absolute top-4 left-4 w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-[#f59e0b]/20 bg-[#1f1208]/80 flex items-center justify-center p-2 shadow-inner">
            {step >= 3 && (
              <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                  animation: !isReducedMotion
                    ? "dropBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards"
                    : "fadeIn 0.3s forwards",
                }}
              >
                <Chicken />
                <NonVegBadge className="absolute -top-1 -left-1 z-10" />
              </div>
            )}
          </div>

          {/* Top Right Compartment — Paneer */}
          <div className="absolute top-4 right-4 w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-[#f59e0b]/20 bg-[#1f1208]/80 flex items-center justify-center p-2 shadow-inner">
            {step >= 3 && (
              <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                  animation: !isReducedMotion
                    ? "dropBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s forwards"
                    : "fadeIn 0.3s 0.1s forwards",
                  opacity: 0,
                }}
              >
                <Paneer />
                <VegBadge className="absolute -top-1 -right-1 z-10" />
              </div>
            )}
          </div>

          {/* Bottom Left Compartment — Roti */}
          <div className="absolute bottom-4 left-4 w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-[#f59e0b]/20 bg-[#1f1208]/80 flex items-center justify-center p-2 shadow-inner">
            {step >= 3 && (
              <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                  animation: !isReducedMotion
                    ? "dropBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s forwards"
                    : "fadeIn 0.3s 0.2s forwards",
                  opacity: 0,
                }}
              >
                <Roti />
                <VegBadge className="absolute -bottom-1 -left-1 z-10" />
              </div>
            )}
          </div>

          {/* Bottom Right Compartment — Cold Drink */}
          <div className="absolute bottom-4 right-4 w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-[#f59e0b]/20 bg-[#1f1208]/80 flex items-center justify-center p-2 shadow-inner">
            {step >= 3 && (
              <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                  animation: !isReducedMotion
                    ? "dropBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.6s forwards"
                    : "fadeIn 0.3s 0.3s forwards",
                  opacity: 0,
                }}
              >
                <ColdDrink />
                <NonVegBadge className="absolute -bottom-1 -right-1 z-10" />
              </div>
            )}
          </div>

          {/* Center Medallion */}
          <div className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center z-20">
            <RestaurantLogo />
          </div>

        </div>
      </div>
    </div>
  );
}

// ── 6. Glow Background Effect ──
export function Glow({ step }: { step: number }) {
  const showGlow = step >= 6;
  return (
    <div
      className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full pointer-events-none transition-opacity duration-1000"
      style={{
        background: "radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(217, 119, 6, 0.15) 50%, rgba(0,0,0,0) 75%)",
        filter: "blur(40px)",
        opacity: showGlow ? 1 : 0,
        transform: "scale(1.2)",
      }}
    />
  );
}

// ── 7. Welcome Text ──
export function WelcomeText({ step }: { step: number }) {
  const showText = step >= 7;

  return (
    <div
      className="mt-6 sm:mt-8 text-center px-4 max-w-lg transition-all duration-700 ease-out"
      style={{
        transform: showText ? "translateY(0)" : "translateY(25px)",
        opacity: showText ? 1 : 0,
      }}
    >
      {/* Welcome Header */}
      <p className="text-xl sm:text-2xl mb-1 tracking-wider animate-pulse">
        🙏 <span className="font-medium text-[#fef08a]">Welcome</span>
      </p>

      {/* Main Title */}
      <h1
        className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight mb-2"
        style={{
          fontFamily: "var(--font-heading), Georgia, serif",
          background: "linear-gradient(180deg, #ffffff 0%, #fef08a 60%, #f59e0b 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Sree Nookambika Family Dhaba
      </h1>

      {/* Sub-tagline */}
      <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-[#f59e0b] mb-4">
        Authentic Taste • Fresh Food • Warm Hospitality
      </p>

      {/* Preparing Status */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#f59e0b]/30 bg-[#2a180c]/60 backdrop-blur-md">
        <div className="w-2 h-2 rounded-full bg-[#f59e0b] animate-ping" />
        <span className="text-xs sm:text-sm font-medium tracking-wide text-[#fef08a]/90">
          Preparing your dining experience...
        </span>
      </div>
    </div>
  );
}

// ── 8. Floating Particles Background ──
const PARTICLE_PRESETS = [
  { width: 4, height: 3, top: 15, left: 10, duration: 6, delay: 0.5 },
  { width: 3, height: 4, top: 75, left: 12, duration: 7, delay: 0.2 },
  { width: 2, height: 5, top: 85, left: 45, duration: 6.5, delay: 0.8 },
  { width: 5, height: 3, top: 60, left: 15, duration: 5.5, delay: 0.1 },
  { width: 6, height: 4, top: 25, left: 18, duration: 4.5, delay: 0.3 },
  { width: 5, height: 4, top: 28, left: 38, duration: 7.2, delay: 1.2 },
  { width: 4, height: 4, top: 42, left: 32, duration: 7.5, delay: 1.5 },
  { width: 4, height: 4, top: 55, left: 62, duration: 5.2, delay: 1.8 },
  { width: 3, height: 5, top: 10, left: 55, duration: 6.2, delay: 0.7 },
  { width: 3, height: 4, top: 38, left: 48, duration: 6.8, delay: 0.4 },
  { width: 5, height: 3, top: 8, left: 28, duration: 6.4, delay: 0.2 },
  { width: 4, height: 4, top: 72, left: 22, duration: 5.8, delay: 1.1 },
];

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLE_PRESETS.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#fef08a]/20"
          style={{
            width: `${p.width}px`,
            height: `${p.height}px`,
            top: `${p.top}%`,
            left: `${p.left}%`,
            animation: `floatParticle ${p.duration}s ease-in-out infinite alternate`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── MAIN LOADING SCREEN COMPONENT ──
export default function LoadingScreen({
  isLoading,
  onFinish,
}: LoadingScreenProps) {
  const [step, setStep] = useState(1);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const addTimer = (fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay);
    timersRef.current.push(timer);
  };

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
  }, []);

  // Timeline Step Progression
  useEffect(() => {
    // Step 1: 0ms (Fade in bg)
    setStep(1);

    // Step 2: 300ms (Thali slides up)
    addTimer(() => setStep(2), 300);

    // Step 3: 900ms (Food drops)
    addTimer(() => setStep(3), 900);

    // Step 4: 1700ms (Badges settled)
    addTimer(() => setStep(4), 1700);

    // Step 5: 2000ms (Lazy Susan rotation)
    addTimer(() => setStep(5), 2000);

    // Step 6: 2700ms (Golden glow)
    addTimer(() => setStep(6), 2700);

    // Step 7: 3100ms (Welcome text)
    addTimer(() => setStep(7), 3100);

    // Step 8: 3600ms (Hold final welcome frame)
    addTimer(() => setStep(8), 3600);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // Step 8 & 9 Transition Logic: Once step 8 is reached AND data is loaded -> fade out (500ms)
  useEffect(() => {
    if (step >= 8 && !isLoading && !isFadingOut) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsFinished(true);
        if (onFinish) onFinish();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step, isLoading, isFadingOut, onFinish]);

  if (isFinished) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ease-out select-none ${
        isFadingOut ? "pointer-events-none" : ""
      }`}
      style={{
        background: "radial-gradient(circle at center, #2d1b0f 0%, #1a0f08 50%, #0d0703 100%)",
        opacity: isFadingOut ? 0 : 1,
      }}
    >
      {/* Scoped CSS Keyframe Animations */}
      <style>{`
        @keyframes dropBounce {
          0% {
            transform: translateY(-60px) scale(0.2) rotate(-15deg);
            opacity: 0;
          }
          60% {
            transform: translateY(6px) scale(1.12, 0.88) rotate(4deg);
            opacity: 1;
          }
          80% {
            transform: translateY(-3px) scale(0.96, 1.04) rotate(-2deg);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes floatParticle {
          0% { transform: translateY(0px) scale(1); opacity: 0.2; }
          50% { transform: translateY(-20px) scale(1.3); opacity: 0.7; }
          100% { transform: translateY(-40px) scale(1); opacity: 0.2; }
        }
      `}</style>

      {/* Floating background particles */}
      <FloatingParticles />

      {/* Glow aura behind plate */}
      <Glow step={step} />

      {/* Main Thali Plate */}
      <Plate step={step} isReducedMotion={isReducedMotion} />

      {/* Welcome Text Section */}
      <WelcomeText step={step} />
    </div>
  );
}
