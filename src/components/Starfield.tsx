import React, { useEffect, useState } from 'react';

const Starfield: React.FC = () => {
  const [comets, setComets] = useState<number[]>([]);

  useEffect(() => {
    // Generate random comets periodically
    const interval = setInterval(() => {
      const id = Date.now();
      setComets(prev => [...prev, id]);
      
      // Cleanup comet after animation
      setTimeout(() => {
        setComets(prev => prev.filter(c => c !== id));
      }, 4000); // Life of a comet
    }, 5000 + Math.random() * 5000); // Random interval 5-10s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Static Stars Layers (Handled via CSS box-shadow for performance) */}
      <div className="absolute inset-0 stars-small animate-pulse-slow opacity-60"></div>
      <div className="absolute inset-0 stars-medium animate-pulse-slower opacity-80"></div>
      
      {/* Falling Comets */}
      {comets.map(id => (
        <div 
          key={id} 
          className="absolute w-[2px] h-[2px] bg-white rounded-full animate-comet"
          style={{
            top: `${Math.random() * 40}%`,
            left: `${Math.random() * 60 + 40}%`, // Start mostly from top right
            boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.4)',
          }}
        >
          <div className="absolute top-0 right-0 w-[100px] h-[1px] bg-gradient-to-l from-transparent to-white opacity-50 transform -rotate-45 origin-right translate-x-1"></div>
        </div>
      ))}
    </div>
  );
};

export default Starfield;