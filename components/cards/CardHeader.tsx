import React from 'react';

interface CardHeaderProps {
  title: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ title }) => {
  return (
    <div className="p-5 border-b border-slate-200">
      <h3 className="text-xl font-semibold text-sky-700">{title}</h3>
    </div>
  );
};

export default CardHeader;
