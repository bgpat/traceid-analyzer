
import React, { useMemo, useState, useEffect } from 'react';
import {
    TraceHeaderTypeString, 
    W3CParsedTrace,
    W3CTraceStateParsed,
    AppCardData,
    ParsedTraceInfo,
    SharedTraceContext, 
    // LastEditedInput // Removed
} from '../../../types';
import Card from '../Card';
import FieldDisplay from '../../shared/FieldDisplay';
import { parseTraceHeader } from '../../../services/traceParser';
import {
    generateW3CTraceParentString,
    extractSpanContextValuesFromHeader
} from '../../../services/traceConverter';

const W3C_HEADERS_DEFINITION = [
  { type: 'W3C TraceParent' as TraceHeaderTypeString, label: 'TraceParent (traceparent)', rows: 2 },
  { type: 'W3C TraceState' as TraceHeaderTypeString, label: 'TraceState (tracestate)', rows: 3 },
];
const W3C_VENDOR_NAME = 'W3C Standards';

interface W3CCardProps {
  sharedContext: Readonly<SharedTraceContext>;
  // lastEditedInput: LastEditedInput | null; // Removed
  onValueChange: (newValue: string, type: TraceHeaderTypeString, newSharedCtx: Partial<SharedTraceContext> | null) => void;
}

const renderW3CHeaderDetails = (headerData: AppCardData): React.ReactNode => {
  if (!headerData.parsedInfo) return null;

  if (headerData.parsedInfo.type === 'W3C TraceParent') { 
    const w3c = headerData.parsedInfo as W3CParsedTrace;
    return (
      <div className="space-y-2">
        <FieldDisplay label="Version" value={w3c.version} isValid={!w3c.validationNotes.version} isHex />
        <FieldDisplay label="Trace ID (128-bit Hex)" value={w3c.traceId} isValid={!w3c.validationNotes.traceId} isHex />
        <FieldDisplay label="Parent ID (64-bit Hex)" value={w3c.parentId} isValid={!w3c.validationNotes.parentId} isHex />
        <FieldDisplay label="Flags" value={w3c.flags} isValid={!w3c.validationNotes.flags} isHex />
      </div>
    );
  }

  if (headerData.parsedInfo.type === 'W3C TraceState') { 
    const traceState = headerData.parsedInfo as W3CTraceStateParsed;
    return (
      <div className="space-y-2">
        {traceState.entries.length === 0 && headerData.value.trim() !== '' && <p className="text-sm text-slate-500 px-1">No valid TraceState entries found.</p>}
        {traceState.entries.length === 0 && headerData.value.trim() === '' && <p className="text-sm text-slate-500 px-1">TraceState is empty.</p>}
        {traceState.entries.map((entry, index) => (
          <FieldDisplay
            key={`${entry.key}-${index}`}
            label={`Entry: ${entry.key}`}
            value={entry.value}
            isValid={entry.isValid}
            subtle
          />
        ))}
      </div>
    );
  }
  return null;
};

const W3CCard: React.FC<W3CCardProps> = ({ sharedContext, onValueChange }) => {
  const [traceParentInput, setTraceParentInput] = useState(() => generateW3CTraceParentString(sharedContext));
  const [traceStateInput, setTraceStateInput] = useState('');

  const [traceParentParsed, setTraceParentParsed] = useState<W3CParsedTrace | null>(null);
  const [traceStateParsed, setTraceStateParsed] = useState<W3CTraceStateParsed | null>(null);

  // Effect to sync traceParentInput with sharedContext if sharedContext was updated by another card
  useEffect(() => {
    // Only update if sharedContext is not from this header's own last change
    if (sharedContext.sourceType !== 'W3C TraceParent') {
      const newTraceParentFromShared = generateW3CTraceParentString(sharedContext);
      if (newTraceParentFromShared !== traceParentInput) {
        setTraceParentInput(newTraceParentFromShared);
      }
    }
    // traceStateInput is not synced from sharedContext changes after initial load
  }, [sharedContext, traceParentInput]); // Added traceParentInput to dependencies

  useEffect(() => {
    setTraceParentParsed(parseTraceHeader(traceParentInput, 'W3C TraceParent') as W3CParsedTrace | null);
  }, [traceParentInput]);

  useEffect(() => {
    setTraceStateParsed(parseTraceHeader(traceStateInput, 'W3C TraceState') as W3CTraceStateParsed | null);
  }, [traceStateInput]);

  const handleLocalInputChange = (newValue: string, type: TraceHeaderTypeString) => {
    let parsedForContext: ParsedTraceInfo | null = null;
    if (type === 'W3C TraceParent') {
      setTraceParentInput(newValue);
      parsedForContext = parseTraceHeader(newValue, type);
    } else if (type === 'W3C TraceState') {
      setTraceStateInput(newValue);
      // TraceState does not affect SpanContext, so newSharedCtxValues will be null or just sourceType from extract
      parsedForContext = parseTraceHeader(newValue, type); // Parse for local display
    }
    const newSharedCtxValues = extractSpanContextValuesFromHeader(parsedForContext);
    onValueChange(newValue, type, newSharedCtxValues);
  };

  const headersData = useMemo<AppCardData[]>(() => {
    return W3C_HEADERS_DEFINITION.map(headerConf => {
      if (headerConf.type === 'W3C TraceParent') {
        return {
          type: headerConf.type,
          label: headerConf.label,
          rows: headerConf.rows,
          value: traceParentInput,
          parsedInfo: traceParentParsed,
        };
      }
      if (headerConf.type === 'W3C TraceState') {
        return {
          type: headerConf.type,
          label: headerConf.label,
          rows: headerConf.rows,
          value: traceStateInput,
          parsedInfo: traceStateParsed,
        };
      }
      // Should not happen with current definitions
      return { type: headerConf.type, label: headerConf.label, value: '', parsedInfo: null, rows: headerConf.rows };
    });
  }, [traceParentInput, traceStateInput, traceParentParsed, traceStateParsed]);

  return (
    <Card
      vendorName={W3C_VENDOR_NAME}
      headersData={headersData}
      onValueChange={handleLocalInputChange}
      renderHeaderDetails={renderW3CHeaderDetails}
    />
  );
};

export default W3CCard;
