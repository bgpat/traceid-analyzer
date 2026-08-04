
// Define the new string literal union type
export type TraceHeaderTypeString =
  | 'W3C TraceParent'
  | 'W3C TraceState'
  | 'B3 Single Header'
  | 'Jaeger (uber-trace-id)'
  | 'AWS X-Ray (X-Amzn-Trace-Id)'
  | 'Datadog Trace ID (x-datadog-trace-id)'
  | 'Datadog Parent ID (x-datadog-parent-id)'
  | 'Datadog Sampling Priority (x-datadog-sampling-priority)'
  | 'Datadog Tags (x-datadog-tags)'
  | 'gRPC Trace Bin (grpc-trace-bin)'
  | 'gRPC Tags Bin (grpc-tags-bin)';

export interface ValidationNotes {
  [key: string]: string | undefined; 
  general?: string; 
  rootFormat?: string; 
  rootVersion?: string;
  rootTime?: string;
  rootIdentifier?: string;
  rootTimeRFC3339?: string; 
  awsParentId?: string; 
  awsSampled?: string; 
  hexConversion?: string; 
  traceStateEntry?: string; 
  grpcTagEntry?: string;
  datadogTagEntry?: string; 
  samplingConflictWarning?: string; 
}

export interface W3CParsedTrace {
  type: 'W3C TraceParent';
  version: string;
  traceId: string;
  parentId: string;
  flags: string;
  isValid: boolean;
  validationNotes: ValidationNotes;
}

export interface TraceStateEntry { 
  key: string;
  value: string;
  isValid?: boolean; 
  note?: string;
}
export interface W3CTraceStateParsed {
  type: 'W3C TraceState';
  entries: TraceStateEntry[];
  isValid: boolean; 
  validationNotes: ValidationNotes;
}

export interface B3SingleParsedTrace {
  type: 'B3 Single Header';
  traceId: string;
  spanId: string;
  parentId?: string; 
  sampled?: '0' | '1' | 'd'; 
  debug?: boolean; 
  isValid: boolean;
  validationNotes: ValidationNotes;
}

export interface JaegerParsedTrace {
  type: 'Jaeger (uber-trace-id)';
  traceId: string;
  spanId: string;
  parentId: string; 
  flags: string;
  isValid: boolean;
  validationNotes: ValidationNotes;
}

export interface AWSRayParsedTraceField {
  key: string;
  value: string;
  isValid?: boolean; 
  note?: string;
}
export interface AWSRayParsedTrace {
  type: 'AWS X-Ray (X-Amzn-Trace-Id)';
  fullRootValue?: string; 
  rootVersion?: string;   
  rootTime?: string;      
  rootTimeRFC3339?: string; 
  rootIdentifier?: string;
  parsedParentId?: string; 
  sampled?: '0' | '1' | '?'; 
  fields: AWSRayParsedTraceField[]; 
  isValid: boolean; 
  validationNotes: ValidationNotes;
}

export interface DatadogIdParsed {
  type: 'Datadog Trace ID (x-datadog-trace-id)' | 'Datadog Parent ID (x-datadog-parent-id)';
  
  header_id_decimal?: string; 
  header_id_hex_u64?: string;
  
  context_id_hex128?: string; 
  context_id_decimal_if_safe?: string;
  
  context_id_hex_u64_lower?: string; 
  context_id_decimal_u64_lower?: string; 
  
  isValid: boolean;
  isTooLargeForU64?: boolean;
  validationNotes: ValidationNotes;
}


export interface DatadogSamplingPriorityParsed {
  type: 'Datadog Sampling Priority (x-datadog-sampling-priority)';
  priority: string; 
  numericPriority?: number;
  isValid: boolean;
  interpretation?: string;
  validationNotes: ValidationNotes;
}

export interface DatadogTagEntry { 
  key: string;
  value: string;
  isValid?: boolean;
  note?: string;
  ddpMechanismValue?: number;
}
export interface DatadogTagsParsed {
  type: 'Datadog Tags (x-datadog-tags)';
  entries: DatadogTagEntry[];
  isValid: boolean;
  validationNotes: ValidationNotes;
  ddpMechanismValue?: number;
}

export interface GrpcTraceBinParsedTrace {
  type: 'gRPC Trace Bin (grpc-trace-bin)';
  versionId?: string; 
  traceIdFieldId?: string; 
  traceId?: string; 
  spanIdFieldId?: string; 
  spanId?: string; 
  traceOptionsFieldId?: string; 
  traceOptions?: string; 
  traceOptionsInterpretation?: string;
  extraData?: string; 
  isValid: boolean;
  validationNotes: ValidationNotes;
}

export interface GrpcTag { 
  key: string;
  value: string;
  isValid?: boolean;
  note?: string;
}
export interface GrpcTagsBinParsed {
  type: 'gRPC Tags Bin (grpc-tags-bin)';
  tags: GrpcTag[];
  isValid: boolean;
  validationNotes: ValidationNotes;
}


export type ParsedTraceInfo =
  | W3CParsedTrace
  | W3CTraceStateParsed
  | B3SingleParsedTrace
  | JaegerParsedTrace
  | AWSRayParsedTrace
  | DatadogIdParsed
  | DatadogSamplingPriorityParsed
  | DatadogTagsParsed 
  | GrpcTraceBinParsedTrace
  | GrpcTagsBinParsed;

export interface BaggageEntry {
  key: string;
  value: string;
}

export interface AppCardData {
  type: TraceHeaderTypeString; 
  label: string;
  value: string;
  parsedInfo: ParsedTraceInfo | null;
  rows?: number;
}

export interface AppVendorCardData {
  vendorName: string;
  headersData: AppCardData[];
}

export interface SharedTraceContext {
  sourceType: TraceHeaderTypeString | null;
  otelVersion: string;
  otelTraceId: string;
  otelParentSpanId: string;
  otelTraceFlags: string;
}
