
import React, { useMemo, useState, useEffect } from 'react';
import {
    TraceHeaderTypeString, 
    B3SingleParsedTrace,
    AppCardData,
    ParsedTraceInfo,
    SharedTraceContext, 
    // LastEditedInput // Removed
} from '../../../types';
import Card from '../Card';
import FieldDisplay from '../../shared/FieldDisplay';
import { parseTraceHeader } from '../../../services/traceParser';
import {
    generateB3SingleHeaderString,
    extractSpanContextValuesFromHeader
} from '../../../services/traceConverter';

const B3_HEADERS_DEFINITION: Array<Omit<AppCardData, 'value' | 'parsedInfo'>> = [
  { type: 'B3 Single Header', label: 'B3 Single Header (b3)', rows: 2 },
];
const B3_VENDOR_NAME = 'B3 Propagation';

interface B3CardProps {
  sharedContext: Readonly<SharedTraceContext>;
  // lastEditedInput: LastEditedInput | null; // Removed
  onValueChange: (newValue: string, type: TraceHeaderTypeString, newSharedCtx: Partial<SharedTraceContext> | null) => void;
}

const renderB3HeaderDetails = (headerData: AppCardData, localB3ParentIdHex?: string, localB3DebugFlag?: boolean): React.ReactNode => {
  if (!headerData.parsedInfo || headerData.parsedInfo.type !== 'B3 Single Header') { 
    return null;
  }
  const b3 = headerData.parsedInfo as B3SingleParsedTrace;

  const displayParentId = localB3ParentIdHex !== undefined ? localB3ParentIdHex : b3.parentId;
  const displayDebugFlag = localB3DebugFlag !== undefined ? localB3DebugFlag : b3.debug;

  return (
    <div className="space-y-2">
      <FieldDisplay label="Trace ID (Hex)" value={b3.traceId} isValid={!b3.validationNotes.traceId} isHex />
      <FieldDisplay label="Span ID (Hex)" value={b3.spanId} isValid={!b3.validationNotes.spanId} isHex />
      {displayParentId !== undefined && <FieldDisplay label="Parent Span ID (Hex)" value={displayParentId} isValid={!b3.validationNotes.parentId} isHex />}
      {b3.sampled !== undefined && <FieldDisplay label="Sampling State (from header)" value={b3.sampled} isValid={!b3.validationNotes.sampled} interpretation={b3.sampled === 'd' ? 'Debug' : b3.sampled === '1' ? 'Sampled' : 'Not Sampled'} />}
      {displayDebugFlag !== undefined && <FieldDisplay label="Debug Flag Active" value={displayDebugFlag ? 'Yes' : 'No'} isValid={true} />}
    </div>
  );
};

const B3Card: React.FC<B3CardProps> = ({ sharedContext, onValueChange }) => {
  const [b3Input, setB3Input] = useState(() => generateB3SingleHeaderString(sharedContext));
  const [b3Parsed, setB3Parsed] = useState<B3SingleParsedTrace | null>(null);

  const [localB3ParentIdHex, setLocalB3ParentIdHex] = useState<string | undefined>();
  const [localB3DebugFlag, setLocalB3DebugFlag] = useState<boolean | undefined>();

  useEffect(() => {
    if (sharedContext.sourceType !== 'B3 Single Header') {
        const newB3Header = generateB3SingleHeaderString(sharedContext);
        if (newB3Header !== b3Input) {
            setB3Input(newB3Header);
        }
    }
  }, [sharedContext, b3Input]); // Added b3Input to dependencies

  useEffect(() => {
    const parsed = parseTraceHeader(b3Input, 'B3 Single Header') as B3SingleParsedTrace | null; 
    setB3Parsed(parsed);
    if (parsed?.isValid) {
      setLocalB3ParentIdHex(parsed.parentId);
      setLocalB3DebugFlag(parsed.debug || parsed.sampled === 'd');
    } else if (b3Input.trim() === '') {
        setLocalB3ParentIdHex(undefined);
        setLocalB3DebugFlag(undefined);
    }
  }, [b3Input]);

  const handleLocalInputChange = (newValue: string, type: TraceHeaderTypeString) => {
    let parsedForContext: ParsedTraceInfo | null = null;
    if (type === 'B3 Single Header') { 
      setB3Input(newValue);
      parsedForContext = parseTraceHeader(newValue, type);
    }
    const newSharedCtxValues = extractSpanContextValuesFromHeader(parsedForContext);
    onValueChange(newValue, type, newSharedCtxValues);
  };

  const headersData = useMemo<AppCardData[]>(() => {
    return B3_HEADERS_DEFINITION.map(headerConf => ({
      ...headerConf,
      value: b3Input,
      parsedInfo: b3Parsed,
    }));
  }, [b3Input, b3Parsed]);

  return (
    <Card
      vendorName={B3_VENDOR_NAME}
      headersData={headersData}
      onValueChange={handleLocalInputChange}
      renderHeaderDetails={(hd) => renderB3HeaderDetails(hd, localB3ParentIdHex, localB3DebugFlag)}
    />
  );
};

export default B3Card;
