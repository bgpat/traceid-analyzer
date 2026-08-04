
import React, { useMemo, useState, useEffect } from 'react';
import {
    TraceHeaderTypeString, 
    GrpcTraceBinParsedTrace,
    GrpcTagsBinParsed,
    AppCardData,
    ParsedTraceInfo,
    SharedTraceContext, 
    // LastEditedInput // Removed
} from '../../../types';
import Card from '../Card';
import FieldDisplay from '../../shared/FieldDisplay';
import { parseTraceHeader } from '../../../services/traceParser';
import {
    generateGrpcTraceBinString,
    extractSpanContextValuesFromHeader
} from '../../../services/traceConverter';

const GRPC_HEADERS_DEFINITION: Array<Omit<AppCardData, 'value' | 'parsedInfo'>> = [
  { type: 'gRPC Trace Bin (grpc-trace-bin)', label: 'Trace Context (grpc-trace-bin)', rows: 2 },
  { type: 'gRPC Tags Bin (grpc-tags-bin)', label: 'Tags (grpc-tags-bin)', rows: 3 },
];
const GRPC_VENDOR_NAME = 'gRPC / OpenCensus';

interface GrpcCardProps {
  sharedContext: Readonly<SharedTraceContext>;
  // lastEditedInput: LastEditedInput | null; // Removed
  onValueChange: (newValue: string, type: TraceHeaderTypeString, newSharedCtx: Partial<SharedTraceContext> | null) => void;
}

const renderGrpcHeaderDetails = (headerData: AppCardData): React.ReactNode => {
  if (!headerData.parsedInfo) return null;

  if (headerData.parsedInfo.type === 'gRPC Trace Bin (grpc-trace-bin)') { 
    const grpcBin = headerData.parsedInfo as GrpcTraceBinParsedTrace;
    return (
      <div className="space-y-2">
        <FieldDisplay label="Version ID" value={grpcBin.versionId} isValid={!grpcBin.validationNotes.versionId} subtle isHex />
        <FieldDisplay label="Trace ID Field ID" value={grpcBin.traceIdFieldId} isValid={!grpcBin.validationNotes.traceIdFieldId} subtle isHex />
        <FieldDisplay label="Trace ID (Hex)" value={grpcBin.traceId} isValid={!grpcBin.validationNotes.traceId} isHex />
        <FieldDisplay label="Span ID Field ID" value={grpcBin.spanIdFieldId} isValid={!grpcBin.validationNotes.spanIdFieldId} subtle isHex />
        <FieldDisplay label="Span ID (Hex)" value={grpcBin.spanId} isValid={!grpcBin.validationNotes.spanId} isHex />
        <FieldDisplay label="Trace Options Field ID" value={grpcBin.traceOptionsFieldId} isValid={!grpcBin.validationNotes.traceOptionsFieldId} subtle isHex />
        <FieldDisplay
          label="Trace Options"
          value={grpcBin.traceOptions}
          isValid={!grpcBin.validationNotes.traceOptions}
          interpretation={grpcBin.traceOptionsInterpretation}
          isHex
        />
        {grpcBin.extraData && (
          <FieldDisplay label="Extra Data" value={grpcBin.extraData} isValid={true} subtle isHex />
        )}
      </div>
    );
  }

  if (headerData.parsedInfo.type === 'gRPC Tags Bin (grpc-tags-bin)') { 
    const grpcTags = headerData.parsedInfo as GrpcTagsBinParsed;
    return (
      <div className="space-y-2">
        {grpcTags.tags.length === 0 && headerData.value.trim() !== '' && <p className="text-sm text-slate-500 px-1">No valid gRPC tags found.</p>}
        {grpcTags.tags.length === 0 && headerData.value.trim() === '' && <p className="text-sm text-slate-500 px-1">gRPC tags field is empty.</p>}
        {grpcTags.tags.map((tag, index) => (
          <FieldDisplay
            key={`${tag.key}-${index}`}
            label={`Tag: ${tag.key}`}
            value={tag.value}
            isValid={tag.isValid}
            subtle
          />
        ))}
      </div>
    );
  }
  return null;
};

const GrpcCard: React.FC<GrpcCardProps> = ({ sharedContext, onValueChange }) => {
  const [grpcTraceBinInput, setGrpcTraceBinInput] = useState(() => generateGrpcTraceBinString(sharedContext));
  const [grpcTagsBinInput, setGrpcTagsBinInput] = useState('');

  const [grpcTraceBinParsed, setGrpcTraceBinParsed] = useState<GrpcTraceBinParsedTrace | null>(null);
  const [grpcTagsBinParsed, setGrpcTagsBinParsed] = useState<GrpcTagsBinParsed | null>(null);

  useEffect(() => {
    if (sharedContext.sourceType !== 'gRPC Trace Bin (grpc-trace-bin)') {
        const newTraceBin = generateGrpcTraceBinString(sharedContext);
        if (newTraceBin !== grpcTraceBinInput) {
            setGrpcTraceBinInput(newTraceBin);
        }
    }
    // grpcTagsBinInput is not synced from sharedContext changes
  }, [sharedContext, grpcTraceBinInput]); // Added grpcTraceBinInput

  useEffect(() => {
    setGrpcTraceBinParsed(parseTraceHeader(grpcTraceBinInput, 'gRPC Trace Bin (grpc-trace-bin)') as GrpcTraceBinParsedTrace | null); 
  }, [grpcTraceBinInput]);

  useEffect(() => {
    setGrpcTagsBinParsed(parseTraceHeader(grpcTagsBinInput, 'gRPC Tags Bin (grpc-tags-bin)') as GrpcTagsBinParsed | null); 
  }, [grpcTagsBinInput]);

  const handleLocalInputChange = (newValue: string, type: TraceHeaderTypeString) => {
    let parsedForContext: ParsedTraceInfo | null = null;
    if (type === 'gRPC Trace Bin (grpc-trace-bin)') { 
      setGrpcTraceBinInput(newValue);
      parsedForContext = parseTraceHeader(newValue, type);
    } else if (type === 'gRPC Tags Bin (grpc-tags-bin)') { 
      setGrpcTagsBinInput(newValue);
      parsedForContext = parseTraceHeader(newValue, type); 
    }
    const newSharedCtxValues = extractSpanContextValuesFromHeader(parsedForContext);
    onValueChange(newValue, type, newSharedCtxValues);
  };

  const headersData = useMemo<AppCardData[]>(() => {
    return GRPC_HEADERS_DEFINITION.map(headerConf => {
      if (headerConf.type === 'gRPC Trace Bin (grpc-trace-bin)') { 
        return { ...headerConf, value: grpcTraceBinInput, parsedInfo: grpcTraceBinParsed };
      }
      if (headerConf.type === 'gRPC Tags Bin (grpc-tags-bin)') { 
        return { ...headerConf, value: grpcTagsBinInput, parsedInfo: grpcTagsBinParsed };
      }
      return { type: headerConf.type, label: headerConf.label, value: '', parsedInfo: null, rows: headerConf.rows } as AppCardData;
    });
  }, [grpcTraceBinInput, grpcTagsBinInput, grpcTraceBinParsed, grpcTagsBinParsed]);

  return (
    <Card
      vendorName={GRPC_VENDOR_NAME}
      headersData={headersData}
      onValueChange={handleLocalInputChange}
      renderHeaderDetails={renderGrpcHeaderDetails}
    />
  );
};

export default GrpcCard;
