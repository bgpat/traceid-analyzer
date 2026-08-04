
import React from 'react';

interface ClipboardIconProps {
  className?: string;
}

const ClipboardIcon: React.FC<ClipboardIconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={`w-4 h-4 ${className || ''}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 4.625v2.625m-7.5-2.625v2.625m0-2.625H5.625m7.5 0H17.25m-7.5 0H9.375m4.125 0v2.625m0-10.875h.008v.008h-.008V6.375zm0 3.375h.008v.008h-.008v-.008zm0 3.375h.008v.008h-.008v-.008z" />
  </svg>
);

export default ClipboardIcon;
