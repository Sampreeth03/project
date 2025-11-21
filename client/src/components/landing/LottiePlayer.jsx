import React from 'react';

// Wrapper for the global dotlottie-player element
const LottiePlayer = ({ src, style }) => {
  return (
    <dotlottie-player 
      src={src} 
      background="transparent" 
      speed="1" 
      style={style || { width: '600px', height: '600px' }} 
      loop 
      autoplay
    ></dotlottie-player>
  );
};

export default LottiePlayer;