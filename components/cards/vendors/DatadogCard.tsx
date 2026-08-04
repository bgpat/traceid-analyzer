
import React, { useMemo, useState, useEffect } from 'react';
import {
    TraceHeaderTypeString, 
    DatadogIdParsed,
    DatadogSamplingPriorityParsed,
    DatadogTagsParsed,
    AppCardData,
    ParsedTraceInfo,
    // ValidationNotes, // Not directly used here
    SharedTraceContext, 
    // LastEditedInput // Removed
} from '../../../types';
import Card from '../Card';
import FieldDisplay from '../../shared/FieldDisplay';
import { parseTraceHeader } from '../../../services/traceParser';
import {
    generateDatadogTraceIdString,
    generateDatadogParentIdString,
    generateDatadogSamplingPriorityString,
    extractSpanContextValuesFromHeader
} from '../../../services/traceConverter';

const DATADOG_HEADERS_DEFINITION: Array<Omit<AppCardData, 'value' | 'parsedInfo'>> = [
  { type: 'Datadog Trace ID (x-datadog-trace-id)', label: 'Trace ID (x-datadog-trace-id)', rows: 1 },
  { type: 'Datadog Parent ID (x-datadog-parent-id)', label: 'Parent ID (x-datadog-parent-id)', rows: 1 },
  { type: 'Datadog Sampling Priority (x-datadog-sampling-priority)', label: 'Sampling Priority (x-datadog-sampling-priority)', rows: 1 },
  { type: 'Datadog Tags (x-datadog-tags)', label: 'Tags (x-datadog-tags)', rows: 3 },
];
const DATADOG_VENDOR_NAME = 'Datadog';

interface DatadogCardProps {
  sharedContext: Readonly<SharedTraceContext>;
  // lastEditedInput: LastEditedInput | null; // Removed
  onValueChange: (newValue: string, type: TraceHeaderTypeString, newSharedCtx: Partial<SharedTraceContext> | null) => void;
}

const renderDatadogHeaderDetails = (headerData: AppCardData, sharedContext: Readonly<SharedTraceContext>): React.ReactNode => {
    if (!headerData.parsedInfo) return null;

  if (headerData.parsedInfo.type === 'Datadog Trace ID (x-datadog-trace-id)' || headerData.parsedInfo.type === 'Datadog Parent ID (x-datadog-parent-id)') {
    const ddId = headerData.parsedInfo as DatadogIdParsed;
    const contextualHexSource = ddId.type === 'Datadog Trace ID (x-datadog-trace-id)'
        ? sharedContext.otelTraceId
        : sharedContext.otelParentSpanId;

    let context_id_hex128: string | undefined;
    let context_id_decimal_if_safe: string | undefined;
    let context_id_hex_u64_lower: string | undefined;
    let context_id_decimal_u64_lower: string | undefined;

    if (contextualHexSource) {
        try {
            if (ddId.type === 'Datadog Trace ID (x-datadog-trace-id)' && contextualHexSource.length === 32) {
                context_id_hex128 = contextualHexSource;
                context_id_decimal_if_safe = String(BigInt(`0x${contextualHexSource}`).toString(10));
                context_id_hex_u64_lower = contextualHexSource.slice(-16);
                context_id_decimal_u64_lower = String(BigInt(`0x${context_id_hex_u64_lower}`).toString(10));
            } else if (ddId.type === 'Datadog Parent ID (x-datadog-parent-id)' && contextualHexSource.length === 16) {
                context_id_hex_u64_lower = contextualHexSource;
                context_id_decimal_u64_lower = String(BigInt(`0x${contextualHexSource}`).toString(10));
            }
        } catch (e) { console.error("Error enriching Datadog ID details:", e); }
    }

    return (
      <div className="space-y-2">
        <FieldDisplay
          label={ddId.type === 'Datadog Trace ID (x-datadog-trace-id)' ? "Header Trace ID (Decimal u64)" : "Header Parent ID (Decimal u64)"}
          value={ddId.header_id_decimal}
          isValid={ddId.isValid && !(ddId.validationNotes.samplingConflictWarning || ddId.validationNotes.id)}
        />
        {ddId.header_id_hex_u64 && (
          <FieldDisplay
            label={ddId.type === 'Datadog Trace ID (x-datadog-trace-id)' ? "Header Trace ID (Hex u64)" : "Header Parent ID (Hex u64)"}
            value={ddId.header_id_hex_u64}
            isValid={!(ddId.validationNotes.samplingConflictWarning || ddId.validationNotes.hexConversion)}
            subtle isHex
          />
        )}
        {ddId.type === 'Datadog Trace ID (x-datadog-trace-id)' && context_id_hex128 && (
          <div className="mt-1 space-y-1.5 p-2 border border-sky-100 rounded-md bg-sky-50">
            <p className="text-xs text-sky-600 font-medium">From Shared Context (OTel Trace ID):</p>
            <FieldDisplay label="Context Trace ID (Hex 128-bit)" value={context_id_hex128} isValid={true} subtle isHex />
            {context_id_decimal_if_safe && <FieldDisplay label="Context Trace ID (Decimal 128-bit)" value={context_id_decimal_if_safe} isValid={true} subtle />}
            <FieldDisplay label="Context Trace ID (Lower 64-bit Hex)" value={context_id_hex_u64_lower} isValid={true} subtle isHex />
            <FieldDisplay label="Context Trace ID (Lower 64-bit Decimal)" value={context_id_decimal_u64_lower} isValid={true} subtle />
          </div>
        )}
        {ddId.type === 'Datadog Parent ID (x-datadog-parent-id)' && context_id_hex_u64_lower && (
          <div className="mt-1 space-y-1.5 p-2 border border-sky-100 rounded-md bg-sky-50">
            <p className="text-xs text-sky-600 font-medium">From Shared Context (OTel Parent Span ID):</p>
            <FieldDisplay label="Context Parent ID (Hex 64-bit)" value={context_id_hex_u64_lower} isValid={true} subtle isHex />
            <FieldDisplay label="Context Parent ID (Decimal 64-bit)" value={context_id_decimal_u64_lower} isValid={true} subtle />
          </div>
        )}
      </div>
    );
  }

  if (headerData.parsedInfo.type === 'Datadog Sampling Priority (x-datadog-sampling-priority)') { 
    const ddSample = headerData.parsedInfo as DatadogSamplingPriorityParsed;
    return (
      <div className="space-y-2">
        <FieldDisplay
          label="Datadog Sampling Priority"
          value={ddSample.priority}
          isValid={ddSample.isValid && !(ddSample.validationNotes.samplingConflictWarning || ddSample.validationNotes.priority)}
          interpretation={ddSample.interpretation}
        />
      </div>
    );
  }

  if (headerData.parsedInfo.type === 'Datadog Tags (x-datadog-tags)') { 
    const ddTags = headerData.parsedInfo as DatadogTagsParsed;
    return (
      <div className="space-y-2">
        {ddTags.entries.length === 0 && headerData.value.trim() !== '' && <p className="text-sm text-slate-500 px-1">No valid Datadog tags found.</p>}
        {ddTags.entries.length === 0 && headerData.value.trim() === '' && <p className="text-sm text-slate-500 px-1">Datadog tags field is empty.</p>}
        {ddTags.entries.map((entry, index) => (
          <FieldDisplay
            key={`${entry.key}-${index}-ddtag`}
            label={`Tag: ${entry.key}`}
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

const DatadogCard: React.FC<DatadogCardProps> = ({ sharedContext, onValueChange }) => {
  const [traceIdInput, setTraceIdInput] = useState(() => generateDatadogTraceIdString(sharedContext));
  const [parentIdInput, setParentIdInput] = useState(() => generateDatadogParentIdString(sharedContext));
  const [samplingPriorityInput, setSamplingPriorityInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [traceIdParsed, setTraceIdParsed] = useState<DatadogIdParsed | null>(null);
  const [parentIdParsed, setParentIdParsed] = useState<DatadogIdParsed | null>(null);
  const [samplingPriorityParsed, setSamplingPriorityParsed] = useState<DatadogSamplingPriorityParsed | null>(null);
  const [tagsParsed, setTagsParsed] = useState<DatadogTagsParsed | null>(null);

  const [localDatadogSamplingPriority, setLocalDatadogSamplingPriority] = useState<number | undefined>();

  useEffect(() => {
    const isExternalUpdate = 
        sharedContext.sourceType !== 'Datadog Trace ID (x-datadog-trace-id)' &&
        sharedContext.sourceType !== 'Datadog Parent ID (x-datadog-parent-id)' &&
        sharedContext.sourceType !== 'Datadog Sampling Priority (x-datadog-sampling-priority)';

    if (isExternalUpdate) {
        const newTraceId = generateDatadogTraceIdString(sharedContext);
        if (newTraceId !== traceIdInput) setTraceIdInput(newTraceId);
        
        const newParentId = generateDatadogParentIdString(sharedContext);
        if (newParentId !== parentIdInput) setParentIdInput(newParentId);

        const newSamplingPriority = generateDatadogSamplingPriorityString(sharedContext, undefined);
        if (newSamplingPriority !== samplingPriorityInput && samplingPriorityInput.trim() === '' && !(tagsParsed?.ddpMechanismValue !== undefined)) {
            setSamplingPriorityInput(newSamplingPriority);
        }
    }
  }, [sharedContext, traceIdInput, parentIdInput, samplingPriorityInput, tagsParsed]);

  useEffect(() => {
    setTraceIdParsed(parseTraceHeader(traceIdInput, 'Datadog Trace ID (x-datadog-trace-id)') as DatadogIdParsed | null);
  }, [traceIdInput]);
  useEffect(() => {
    setParentIdParsed(parseTraceHeader(parentIdInput, 'Datadog Parent ID (x-datadog-parent-id)') as DatadogIdParsed | null);
  }, [parentIdInput]);
  useEffect(() => {
    const parsed = parseTraceHeader(samplingPriorityInput, 'Datadog Sampling Priority (x-datadog-sampling-priority)') as DatadogSamplingPriorityParsed | null;
    setSamplingPriorityParsed(parsed);
    if (parsed?.isValid && parsed.numericPriority !== undefined) {
      setLocalDatadogSamplingPriority(parsed.numericPriority);
    } else if (samplingPriorityInput.trim() === '') {
        setLocalDatadogSamplingPriority(undefined);
    }
  }, [samplingPriorityInput]);
  useEffect(() => {
    const parsed = parseTraceHeader(tagsInput, 'Datadog Tags (x-datadog-tags)') as DatadogTagsParsed | null;
    setTagsParsed(parsed);
    if (parsed?.isValid && parsed.ddpMechanismValue !== undefined) {
      if(samplingPriorityInput.trim() === '') { 
        setLocalDatadogSamplingPriority(parsed.ddpMechanismValue > 0 || Object.is(parsed.ddpMechanismValue, -0) ? parsed.ddpMechanismValue : undefined);
      }
    }
  }, [tagsInput, samplingPriorityInput]);

  const handleLocalInputChange = (newValue: string, type: TraceHeaderTypeString) => {
    let parsedForContext: ParsedTraceInfo | null = null;
    switch (type) {
      case 'Datadog Trace ID (x-datadog-trace-id)': setTraceIdInput(newValue); parsedForContext = parseTraceHeader(newValue, type); break;
      case 'Datadog Parent ID (x-datadog-parent-id)': setParentIdInput(newValue); parsedForContext = parseTraceHeader(newValue, type); break;
      case 'Datadog Sampling Priority (x-datadog-sampling-priority)': 
        setSamplingPriorityInput(newValue); 
        parsedForContext = parseTraceHeader(newValue, type); 
        break;
      case 'Datadog Tags (x-datadog-tags)': 
        setTagsInput(newValue); 
        parsedForContext = parseTraceHeader(newValue, type);
        break;
    }
    const newSharedCtxValues = extractSpanContextValuesFromHeader(parsedForContext);
    onValueChange(newValue, type, newSharedCtxValues);
  };

  const headersData = useMemo<AppCardData[]>(() => {
    let finalSamplingPriorityParsed = samplingPriorityParsed;
    let finalTagsParsed = tagsParsed;

    const explicitPriority = samplingPriorityParsed?.isValid ? samplingPriorityParsed.numericPriority : undefined;
    const ddmPriority = tagsParsed?.isValid ? tagsParsed.ddpMechanismValue : undefined;

    let currentLocalSamplingPriority = localDatadogSamplingPriority;
    if (explicitPriority !== undefined) {
        currentLocalSamplingPriority = explicitPriority;
    } else if (ddmPriority !== undefined && samplingPriorityInput.trim() === '') { // Only use ddm if explicit priority is empty
        currentLocalSamplingPriority = ddmPriority;
    }


    if (ddmPriority !== undefined && explicitPriority !== undefined) {
        const ddmKeeps = ddmPriority > 0 || Object.is(ddmPriority, -0); // -0 considered as keep by some agents
        const explicitKeeps = explicitPriority > 0;
        if (ddmKeeps !== explicitKeeps) {
            const warningMsg = `Sampling conflict: _dd.p.dm (${ddmPriority}) vs explicit priority (${explicitPriority}). Using explicit priority.`;
            finalTagsParsed = tagsParsed ? { ...tagsParsed, validationNotes: { ...tagsParsed.validationNotes, samplingConflictWarning: warningMsg } } : null;
            finalSamplingPriorityParsed = samplingPriorityParsed ? { ...samplingPriorityParsed, validationNotes: { ...samplingPriorityParsed.validationNotes, samplingConflictWarning: warningMsg } } : null;
        }
    }


    return DATADOG_HEADERS_DEFINITION.map(headerConf => {
      let value: string;
      let parsedInfo: ParsedTraceInfo | null;
      switch (headerConf.type) {
        case 'Datadog Trace ID (x-datadog-trace-id)': value = traceIdInput; parsedInfo = traceIdParsed; break;
        case 'Datadog Parent ID (x-datadog-parent-id)': value = parentIdInput; parsedInfo = parentIdParsed; break;
        case 'Datadog Sampling Priority (x-datadog-sampling-priority)':
            value = samplingPriorityInput;
            if (value.trim() === '' && currentLocalSamplingPriority !== undefined) {
                 // Reflect local state (possibly from _dd.p.dm or shared context) if input is blank
                 value = generateDatadogSamplingPriorityString(sharedContext, currentLocalSamplingPriority);
            }
            parsedInfo = finalSamplingPriorityParsed;
            break;
        case 'Datadog Tags (x-datadog-tags)': value = tagsInput; parsedInfo = finalTagsParsed; break;
        default: value = ''; parsedInfo = null;
      }
      return { ...headerConf, value, parsedInfo } as AppCardData;
    });
  }, [traceIdInput, parentIdInput, samplingPriorityInput, tagsInput,
      traceIdParsed, parentIdParsed, samplingPriorityParsed, tagsParsed,
      localDatadogSamplingPriority, sharedContext]);

  return (
    <Card
      vendorName={DATADOG_VENDOR_NAME}
      headersData={headersData}
      onValueChange={handleLocalInputChange}
      renderHeaderDetails={(hd) => renderDatadogHeaderDetails(hd, sharedContext)}
    />
  );
};

export default DatadogCard;
