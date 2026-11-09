import React from 'react';
import logoImg from '../../assets/images/somos_logo_oficial.png';

interface SomosLogoProps {
  variant?: 'light' | 'dark' | 'magenta';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const SomosLogo: React.FC<SomosLogoProps> = ({
  size = 'md',
  className = '',
  onClick,
}) => {
  const heightClasses = {
    xs: 'h-5',
    sm: 'h-6 sm:h-7',
    md: 'h-8 sm:h-9',
    lg: 'h-11 sm:h-14',
    xl: 'h-16 sm:h-20',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center select-none ${className} ${
        onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
      }`}
    >
      <img
        src={logoImg}
        alt="SOMOS Partido Político"
        className={`w-auto object-contain drop-shadow-md transition-transform duration-300 hover:scale-[1.02] ${heightClasses[size]}`}
        loading="eager"
      />
    </div>
  );
};

