import React, { useMemo } from 'react';

const Starfield: React.FC = () => {
  // Generate static comets once on mount to avoid re-renders
  // This resolves AUDIT-006 (Animation Jitter)
  const comets = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      // Spread starting positions across the top/right
      top: Math.random() * 60, // Top 60%
      left: 20 + Math.random() * 80, // Right 80%
      // Random delay to desynchronize their loops
      // Random duration to vary speed
      delay: Math.random() * 20, 
      duration: 10 + Math.random() * 15 // 10-25s loop
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Static Stars Layers (Handled via CSS box-shadow for performance) */}
      <div className="absolute inset-0 stars-small animate-pulse-slow opacity-60"></div>
      <div className="absolute inset-0 stars-medium animate-pulse-slower opacity-80"></div>
      
      {/* CSS-driven Comets (No JS Re-renders) */}
      {comets.map(comet => (
        <div
          key={comet.id}
          className="absolute w-[2px] h-[2px] bg-white rounded-full opacity-0"
          style={{
            top: `${comet.top}%`,
            left: `${comet.left}%`,
            boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.4)',
            // Use the new keyframe defined in index.css
            animation: `comet-cycle ${comet.duration}s linear infinite`,
            animationDelay: `${comet.delay}s`
          }}
        >
          <div className="absolute top-0 right-0 w-[100px] h-[1px] bg-gradient-to-l from-transparent to-white opacity-50 transform -rotate-45 origin-right translate-x-1"></div>
        </div>
      ))}
    </div>
  );
};

export default Starfield;
