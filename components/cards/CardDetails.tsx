
import React from 'react';
import { TraceHeaderTypeString, AppCardData } from '../../types'; // Changed
import HeaderInputSection from '../HeaderInputSection';

interface CardDetailsProps {
  headersData: AppCardData[];
  onValueChange: (newValue: string, type: TraceHeaderTypeString) => void; // Changed
  children: React.ReactNode; 
}

const CardDetails: React.FC<CardDetailsProps> = ({ headersData, onValueChange, children }) => {
  return (
    <div className="p-5 flex-grow overflow-y-auto scrollbar-thin space-y-6">
      <HeaderInputSection headersData={headersData} onValueChange={onValueChange} />
      <hr className="my-6 border-slate-200" />
      <div>
        <h4 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Parsed Details</h4>
        <div className="space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CardDetails;
