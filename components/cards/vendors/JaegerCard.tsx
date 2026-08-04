
import React, { useMemo, useState, useEffect } from 'react';
import {
    TraceHeaderTypeString, 
    JaegerParsedTrace,
    AppCardData,
    ParsedTraceInfo,
    SharedTraceContext, 
    // LastEditedInput // Removed
} from '../../../types';
import Card from '../Card';
import FieldDisplay from '../../shared/FieldDisplay';
import { parseTraceHeader } from '../../../services/traceParser';
import {
    generateJaegerHeaderString,
    extractSpanContextValuesFromHeader
} from '../../../services/traceConverter';

const JAEGER_HEADERS_DEFINITION: Array<Omit<AppCardData, 'value' | 'parsedInfo'>> = [
  { type: 'Jaeger (uber-trace-id)', label: 'Jaeger Trace Context (uber-trace-id)', rows: 2 },
];
const JAEGER_VENDOR_NAME = 'Jaeger';

interface JaegerCardProps {
  sharedContext: Readonly<SharedTraceContext>;
  // lastEditedInput: LastEditedInput | null; // Removed
  onValueChange: (newValue: string, type: TraceHeaderTypeString, newSharedCtx: Partial<SharedTraceContext> | null) => void;
}

const renderJaegerHeaderDetails = (headerData: AppCardData, localJaegerSpecificDebugFlag?: boolean): React.ReactNode => {
  if (!headerData.parsedInfo || headerData.parsedInfo.type !== 'Jaeger (uber-trace-id)') { 
    return null;
  }
  const jaeger = headerData.parsedInfo as JaegerParsedTrace;
  const flagsInt = parseInt(jaeger.flags, 16);
  const isSampled = (flagsInt & 0x01) === 0x01;
  const displayDebug = localJaegerSpecificDebugFlag !== undefined ? localJaegerSpecificDebugFlag : (flagsInt & 0x02) === 0x02;

  return (
    <div className="space-y-2">
      <FieldDisplay label="Trace ID (Hex)" value={jaeger.traceId} isValid={!jaeger.validationNotes.traceId} isHex />
      <FieldDisplay label="Span ID (Hex)" value={jaeger.spanId} isValid={!jaeger.validationNotes.spanId} isHex />
      <FieldDisplay label="Parent Span ID (Hex)" value={jaeger.parentId} isValid={!jaeger.validationNotes.parentId} isHex />
      <FieldDisplay label="Flags (Raw Hex)" value={jaeger.flags} isValid={!jaeger.validationNotes.flags} isHex />
      <FieldDisplay label="Sampled (from flags)" value={isSampled ? "Yes" : "No"} isValid={true} />
      <FieldDisplay label="Debug Active (from flags/state)" value={displayDebug ? "Yes" : "No"} isValid={true} />
    </div>
  );
};

const JaegerCard: React.FC<JaegerCardProps> = ({ sharedContext, onValueChange }) => {
  const [localJaegerSpecificDebugFlag, setLocalJaegerSpecificDebugFlag] = useState<boolean | undefined>(
    () => (parseInt(sharedContext.otelTraceFlags, 16) & 0x02) === 0x02 
  );
  const [jaegerInput, setJaegerInput] = useState(() => generateJaegerHeaderString(sharedContext, localJaegerSpecificDebugFlag));
  const [jaegerParsed, setJaegerParsed] = useState<JaegerParsedTrace | null>(null);

  useEffect(() => {
    if (sharedContext.sourceType !== 'Jaeger (uber-trace-id)') {
        const newDebugFlagFromShared = (parseInt(sharedContext.otelTraceFlags, 16) & 0x02) === 0x02;
        // Do not set localJaegerSpecificDebugFlag directly from sharedContext here if it was set by input
        // Only update input if it's genuinely out of sync with sharedContext + current local flag state
        const newJaegerHeader = generateJaegerHeaderString(sharedContext, localJaegerSpecificDebugFlag);
        if (newJaegerHeader !== jaegerInput) {
            setJaegerInput(newJaegerHeader);
        }
        if (newDebugFlagFromShared !== localJaegerSpecificDebugFlag && jaegerInput.trim() === '' ) {
             // if input is blank, then allow shared context to drive the local flag
             setLocalJaegerSpecificDebugFlag(newDebugFlagFromShared);
        }
    }
  }, [sharedContext, localJaegerSpecificDebugFlag, jaegerInput]);


  useEffect(() => {
    const parsed = parseTraceHeader(jaegerInput, 'Jaeger (uber-trace-id)') as JaegerParsedTrace | null; 
    setJaegerParsed(parsed);
    if (parsed?.isValid) {
      const flagsInt = parseInt(parsed.flags, 16);
      setLocalJaegerSpecificDebugFlag((flagsInt & 0x02) === 0x02);
    } else if (jaegerInput.trim() === ''){
        // If input is cleared, reflect debug flag from sharedContext or undefined
        const debugFlagFromShared = (parseInt(sharedContext.otelTraceFlags, 16) & 0x02) === 0x02;
        setLocalJaegerSpecificDebugFlag(debugFlagFromShared);
    }
  }, [jaegerInput, sharedContext.otelTraceFlags]);


  const handleLocalInputChange = (newValue: string, type: TraceHeaderTypeString) => {
    let parsedForContext: ParsedTraceInfo | null = null;
    if (type === 'Jaeger (uber-trace-id)') { 
      setJaegerInput(newValue);
      parsedForContext = parseTraceHeader(newValue, type);
      if (parsedForContext?.isValid && (parsedForContext as JaegerParsedTrace).flags) {
        const flagsInt = parseInt((parsedForContext as JaegerParsedTrace).flags, 16);
        setLocalJaegerSpecificDebugFlag((flagsInt & 0x02) === 0x02);
      } else if (newValue.trim() === '') {
        const debugFlagFromShared = (parseInt(sharedContext.otelTraceFlags, 16) & 0x02) === 0x02;
        setLocalJaegerSpecificDebugFlag(debugFlagFromShared);
      }
    }
    const newSharedCtxValues = extractSpanContextValuesFromHeader(parsedForContext);
    onValueChange(newValue, type, newSharedCtxValues);
  };

  const headersData = useMemo<AppCardData[]>(() => {
    return JAEGER_HEADERS_DEFINITION.map(headerConf => ({
      ...headerConf,
      value: jaegerInput,
      parsedInfo: jaegerParsed,
    }));
  }, [jaegerInput, jaegerParsed]);

  return (
    <Card
      vendorName={JAEGER_VENDOR_NAME}
      headersData={headersData}
      onValueChange={handleLocalInputChange}
      renderHeaderDetails={(hd) => renderJaegerHeaderDetails(hd, localJaegerSpecificDebugFlag)}
    />
  );
};

export default JaegerCard;
