import React, { useState } from 'react';
import CheckIcon from '../icons/CheckIcon';
import XCircleIcon from '../icons/XCircleIcon';
import ClipboardIcon from '../icons/ClipboardIcon';

interface FieldDisplayProps {
  label: string;
  value?: string | number | boolean;
  isValid?: boolean;
  // note?: string; // Removed
  className?: string;
  interpretation?: string;
  subtle?: boolean;
  isHex?: boolean;
}

const FieldDisplay: React.FC<FieldDisplayProps> = ({
  label,
  value,
  isValid,
  // note, // Removed
  className = '',
  interpretation,
  subtle = false,
  isHex = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(value)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={`py-2 px-3 rounded-md border text-sm ${className} ${subtle ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'}`}>
      <div className="flex justify-between items-start">
        <span className={`font-medium ${subtle ? 'text-slate-500' : 'text-slate-600'}`}>{label}</span>
        {isValid !== undefined && (
          isValid ? <CheckIcon className="text-green-500 flex-shrink-0" /> : <XCircleIcon className="text-red-500 flex-shrink-0" />
        )}
      </div>
      <div className="flex justify-between items-center mt-0.5">
        <p className={`break-all flex-grow mr-2 ${isHex ? 'font-mono' : ''} ${subtle ? 'text-slate-600' : 'text-slate-800'}`}>{displayValue}</p>
        <button
          onClick={handleCopy}
          title="Copy value"
          className="p-1 text-slate-400 hover:text-sky-600 transition-colors flex-shrink-0"
          aria-label={`Copy ${label}`}
        >
          {copied ? <CheckIcon className="text-green-500 w-3.5 h-3.5" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
        </button>
      </div>
      {/* {note && <p className={`mt-0.5 text-xs ${isValid === false ? 'text-red-500' : 'text-amber-600'}`}>{note}</p>} // Removed */}
      {interpretation && <p className="mt-0.5 text-xs text-sky-600">{interpretation}</p>}
    </div>
  );
};

export default FieldDisplay;