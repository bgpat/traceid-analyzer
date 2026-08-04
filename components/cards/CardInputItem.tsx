
import React from 'react';
import { TraceHeaderTypeString, AppCardData } from '../../types'; // Changed
import CheckIcon from '../icons/CheckIcon';
import XCircleIcon from '../icons/XCircleIcon';

interface CardInputItemProps {
  headerData: AppCardData;
  onValueChange: (newValue: string, type: TraceHeaderTypeString) => void; // Changed
}

const CardInputItem: React.FC<CardInputItemProps> = ({ headerData, onValueChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(e.target.value, headerData.type);
  };

  return (
    <div className="space-y-1">
      <label htmlFor={`trace-header-value-${headerData.type}`} className="block text-xs font-medium text-slate-600">
        {headerData.label}
      </label>
      <div className="relative">
        <textarea
          id={`trace-header-value-${headerData.type}`}
          name={`trace-header-value-${headerData.type}`}
          rows={headerData.rows || 2}
          value={headerData.value}
          onChange={handleInputChange}
          placeholder={`Paste ${headerData.label} value here...`}
          className="block w-full py-2 px-3 pr-10 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors placeholder-slate-400 font-mono text-sm"
          spellCheck="false"
        />
        {headerData.value.trim() !== '' && headerData.parsedInfo && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {headerData.parsedInfo.isValid ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardInputItem;
