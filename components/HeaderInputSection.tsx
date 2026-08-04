
import React from 'react';
import { TraceHeaderTypeString, AppCardData } from '../types'; // Changed
import CardInputItem from './cards/CardInputItem'; 

interface HeaderInputSectionProps {
  headersData: AppCardData[];
  onValueChange: (newValue: string, type: TraceHeaderTypeString) => void; // Changed
}

const HeaderInputSection: React.FC<HeaderInputSectionProps> = ({ headersData, onValueChange }) => {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Header Values</h4>
      <div className="space-y-4">
        {headersData.map((headerData) => (
          <CardInputItem 
            key={`${headerData.type}-input-item`} 
            headerData={headerData} 
            onValueChange={onValueChange} 
          />
        ))}
      </div>
    </div>
  );
};

export default HeaderInputSection;
