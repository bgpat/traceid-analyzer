
import React, { useMemo, useState, useEffect } from 'react';
import {
    TraceHeaderTypeString, 
    AWSRayParsedTrace,
    AppCardData,
    ParsedTraceInfo,
    AWSRayParsedTraceField,
    SharedTraceContext, 
    // LastEditedInput // Removed
} from '../../../types';
import Card from '../Card';
import FieldDisplay from '../../shared/FieldDisplay';
import { parseTraceHeader } from '../../../services/traceParser';
import {
    generateAWSXRayString,
    extractSpanContextValuesFromHeader
} from '../../../services/traceConverter';

const AWSXRAY_HEADERS_DEFINITION: Array<Omit<AppCardData, 'value' | 'parsedInfo'>> = [
  { type: 'AWS X-Ray (X-Amzn-Trace-Id)', label: 'AWS X-Ray Trace ID (X-Amzn-Trace-Id)', rows: 4 },
];
const AWSXRAY_VENDOR_NAME = 'AWS X-Ray';

interface AWSXRayCardProps {
  sharedContext: Readonly<SharedTraceContext>;
  // lastEditedInput: LastEditedInput | null; // Removed
  onValueChange: (newValue: string, type: TraceHeaderTypeString, newSharedCtx: Partial<SharedTraceContext> | null) => void;
}

const renderAWSXRayHeaderDetails = (
    headerData: AppCardData,
    localAwsRootTimeHex?: string,
    localAwsRootIdentifierHex?: string,
    localAwsOtherFields?: Array<{ key: string; value: string }>
  ): React.ReactNode => {
  if (!headerData.parsedInfo || headerData.parsedInfo.type !== 'AWS X-Ray (X-Amzn-Trace-Id)') { 
    return null;
  }
  const aws = headerData.parsedInfo as AWSRayParsedTrace;

  const displayRootVersion = aws.rootVersion;
  const displayRootTime = localAwsRootTimeHex !== undefined ? localAwsRootTimeHex : aws.rootTime;
  const displayRootTimeRFC = aws.rootTimeRFC3339;
  const displayRootIdentifier = localAwsRootIdentifierHex !== undefined ? localAwsRootIdentifierHex : aws.rootIdentifier;
  const displayParentId = aws.parsedParentId;
  const displaySampled = aws.sampled;

  const displayOtherFieldsEffective = (localAwsOtherFields && localAwsOtherFields.length > 0) 
                                      ? localAwsOtherFields 
                                      : aws.fields.filter(f => !['root', 'parent', 'sampled'].includes(f.key.toLowerCase()));


  return (
    <div className="space-y-2">
      {(displayRootVersion || displayRootTime || displayRootIdentifier) && (
        <div className='mb-2 space-y-1.5'>
          <FieldDisplay label="Full Root Value (from header)" value={aws.fullRootValue} isValid={!aws.validationNotes.rootFormat && !aws.validationNotes.rootVersion && !aws.validationNotes.rootTime && !aws.validationNotes.rootIdentifier} subtle />
          <div className="pl-3 border-l-2 border-slate-200 ml-1 space-y-1.5">
            {displayRootVersion !== undefined && <FieldDisplay label="Version (from Root)" value={displayRootVersion} isValid={!aws.validationNotes.rootVersion} />}
            {displayRootTime !== undefined && <FieldDisplay label="Time (from Root - Epoch Hex)" value={displayRootTime} isValid={!aws.validationNotes.rootTime} isHex />}
            {displayRootTimeRFC && (
              <FieldDisplay label="Time (from Root - RFC 3339)" value={displayRootTimeRFC} isValid={!aws.validationNotes.rootTimeRFC3339} subtle />
            )}
            {displayRootIdentifier !== undefined && <FieldDisplay label="Identifier (from Root)" value={displayRootIdentifier} isValid={!aws.validationNotes.rootIdentifier} isHex />}
          </div>
        </div>
      )}
      {displayParentId !== undefined && (
        <FieldDisplay label="Parent ID (AWS)" value={displayParentId} isValid={!aws.validationNotes.awsParentId} isHex />
      )}
      {displaySampled !== undefined && (
        <FieldDisplay label="Sampled State (AWS)" value={displaySampled} isValid={!aws.validationNotes.awsSampled} />
      )}
      {displayOtherFieldsEffective.length > 0 && (
        <>
          <h6 className="text-xs font-semibold text-slate-500 pt-2 px-1 mt-2 border-t border-slate-200">Additional Fields:</h6>
          {displayOtherFieldsEffective
            .map((field, index) => (
              <FieldDisplay key={`${field.key}-${index}-other`} label={field.key} value={field.value} isValid={(field as AWSRayParsedTraceField).isValid !== false} subtle />
            ))}
        </>
      )}
    </div>
  );
};

const AWSXRayCard: React.FC<AWSXRayCardProps> = ({
    sharedContext,
    onValueChange,
}) => {
  const [localAwsRootTimeHex, setLocalAwsRootTimeHex] = useState<string | undefined>(() => sharedContext.otelTraceId.substring(0,8));
  const [localAwsRootIdentifierHex, setLocalAwsRootIdentifierHex] = useState<string | undefined>(() => sharedContext.otelTraceId.substring(8,32));
  const [localAwsOtherFields, setLocalAwsOtherFields] = useState<Array<{ key: string; value: string }>>([]);

  const [awsInput, setAwsInput] = useState(() => generateAWSXRayString(sharedContext, localAwsRootTimeHex, localAwsRootIdentifierHex, localAwsOtherFields));
  const [awsParsed, setAwsParsed] = useState<AWSRayParsedTrace | null>(null);

  useEffect(() => {
    if (sharedContext.sourceType !== 'AWS X-Ray (X-Amzn-Trace-Id)') {
        const newRootTimeFromShared = sharedContext.otelTraceId.substring(0,8);
        const newRootIdFromShared = sharedContext.otelTraceId.substring(8,32);

        // Update local state only if it differs and input is not actively being edited (or is empty)
        // This attempts to prevent overwriting user's partial input if they are typing something different from shared context
        if (newRootTimeFromShared !== localAwsRootTimeHex) setLocalAwsRootTimeHex(newRootTimeFromShared);
        if (newRootIdFromShared !== localAwsRootIdentifierHex) setLocalAwsRootIdentifierHex(newRootIdFromShared);
        
        const newAwsHeader = generateAWSXRayString(sharedContext, newRootTimeFromShared, newRootIdFromShared, localAwsOtherFields);
        if (newAwsHeader !== awsInput) {
            setAwsInput(newAwsHeader);
        }
    }
  }, [sharedContext, localAwsRootTimeHex, localAwsRootIdentifierHex, localAwsOtherFields, awsInput]); // Added dependencies

  useEffect(() => {
    const parsed = parseTraceHeader(awsInput, 'AWS X-Ray (X-Amzn-Trace-Id)') as AWSRayParsedTrace | null; 
    setAwsParsed(parsed);
    if (parsed?.isValid) {
      setLocalAwsRootTimeHex(parsed.rootTime);
      setLocalAwsRootIdentifierHex(parsed.rootIdentifier);
      setLocalAwsOtherFields(parsed.fields.filter(f => !['root', 'parent', 'sampled'].includes(f.key.toLowerCase())));
    } else if (awsInput.trim() === '') {
        // If input is cleared, reset local parts based on current (potentially stale) shared context, or clear them
        setLocalAwsRootTimeHex(sharedContext.otelTraceId.substring(0,8));
        setLocalAwsRootIdentifierHex(sharedContext.otelTraceId.substring(8,32));
        setLocalAwsOtherFields([]);
    }
  }, [awsInput, sharedContext.otelTraceId]); // Added sharedContext.otelTraceId
  

  const handleLocalInputChange = (newValue: string, type: TraceHeaderTypeString) => {
    let parsedForContext: ParsedTraceInfo | null = null;
    if (type === 'AWS X-Ray (X-Amzn-Trace-Id)') { 
      setAwsInput(newValue);
      parsedForContext = parseTraceHeader(newValue, type);
      if (parsedForContext?.isValid) {
        const p = parsedForContext as AWSRayParsedTrace;
        setLocalAwsRootTimeHex(p.rootTime);
        setLocalAwsRootIdentifierHex(p.rootIdentifier);
        setLocalAwsOtherFields(p.fields.filter(f => !['root', 'parent', 'sampled'].includes(f.key.toLowerCase())));
      } else if (newValue.trim() === '') {
          // When clearing input, reset local parts from shared context
          setLocalAwsRootTimeHex(sharedContext.otelTraceId.substring(0,8));
          setLocalAwsRootIdentifierHex(sharedContext.otelTraceId.substring(8,32));
          setLocalAwsOtherFields([]);
      }
    }
    const newSharedCtxValues = extractSpanContextValuesFromHeader(parsedForContext);
    onValueChange(newValue, type, newSharedCtxValues);
  };

  const headersData = useMemo<AppCardData[]>(() => {
    return AWSXRAY_HEADERS_DEFINITION.map(headerConf => ({
      ...headerConf,
      value: awsInput,
      parsedInfo: awsParsed,
    }));
  }, [awsInput, awsParsed]);

  return (
    <Card
      vendorName={AWSXRAY_VENDOR_NAME}
      headersData={headersData}
      onValueChange={handleLocalInputChange}
      renderHeaderDetails={(hd) => renderAWSXRayHeaderDetails(hd, localAwsRootTimeHex, localAwsRootIdentifierHex, localAwsOtherFields)}
    />
  );
};

export default AWSXRayCard;
