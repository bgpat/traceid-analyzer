import React from 'react';
import { AppCardData, ParsedTraceInfo, ValidationNotes } from '../../types'; // Assuming AppCardData and ParsedTraceInfo are in types.ts
// FieldDisplay is not directly used here anymore, but renderFields used it. Children will use it.

interface CardItemProps {
  headerData: AppCardData;
  children: React.ReactNode; // New prop to pass specific field rendering
}

const CardItem: React.FC<CardItemProps> = ({ headerData, children }) => {
  const { label, value, parsedInfo } = headerData;

  if (value.trim() === '' && (!parsedInfo || parsedInfo.isValid)) {
    // If input is empty and it's either not parsed yet or parsed as valid (empty is valid for some types like TraceState)
    return (
      <div className="mb-4">
        <h5 className="text-xs font-semibold text-slate-700 mb-1.5">{label}:</h5>
        <div className="text-center text-slate-400 py-3 text-sm border border-dashed border-slate-200 rounded-md">
          Input is empty.
        </div>
      </div>
    );
  }

  if (!parsedInfo) {
    // This case might occur if parsing fails catastrophically before even parsedInfo is set,
    // or if a header type has no parser implemented (shouldn't happen with current setup).
    return (
      <div className="mb-4">
        <h5 className="text-xs font-semibold text-slate-700 mb-1.5">{label}:</h5>
        <div className="text-center text-red-500 py-3 text-sm border border-dashed border-red-200 rounded-md">
          Error: Could not parse input for this header.
        </div>
      </div>
    );
  }

  // const { validationNotes, isValid } = parsedInfo; // Not used directly for generalNote anymore
  // const generalNote = validationNotes.general; // Removed
  // const isOverallValid = isValid; // Not used for generalNote anymore

  // const noteColorClass = // Removed
  //     isOverallValid && 
  //     !generalNote?.toLowerCase().includes("invalid") && 
  //     !generalNote?.toLowerCase().includes("error") &&
  //     !validationNotes.samplingConflictWarning // Explicitly check for sampling conflict for orange
  //     ? 'bg-sky-50 text-sky-700' // Default "info" or "valid with notes"
  //     : validationNotes.samplingConflictWarning // Specific warning takes precedence for orange
  //         ? 'bg-orange-50 text-orange-700'
  //         : 'bg-red-50 text-red-600'; // Otherwise, it's an error/invalid note


  return (
    <div className="mb-4">
      <h5 className="text-xs font-semibold text-slate-700 mb-1.5">{label}:</h5>
      {/* {generalNote && ( // Removed
        <p className={`text-xs p-2 rounded-md mb-2 ${noteColorClass}`}>
          {generalNote}
        </p>
      )} */}
      {children} {/* Render the inlined field details passed from parent vendor card */}
    </div>
  );
};

export default CardItem;