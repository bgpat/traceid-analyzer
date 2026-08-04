
import {
  TraceHeaderTypeString, 
  ParsedTraceInfo,
  W3CParsedTrace,
  B3SingleParsedTrace,
  JaegerParsedTrace,
  AWSRayParsedTrace,
  DatadogIdParsed,
  DatadogSamplingPriorityParsed,
  GrpcTraceBinParsedTrace,
} from '../types'; // SharedTraceContext is imported from types in App.tsx
// import { parseTraceHeader } from './traceParser'; // Not used directly here

import {
  TraceFlags,
  isValidTraceId,
  isValidSpanId,
} from '@opentelemetry/api';

// SharedTraceContext (Flat OTel SpanContext related fields)
export interface SharedTraceContext {
  sourceType: TraceHeaderTypeString | null;
  otelVersion: string;
  otelTraceId: string;
  otelParentSpanId: string;
  otelTraceFlags: string;
}

// Helper Functions
function hexToDatadogU64Decimal(hexId?: string): string | undefined {
  if (!hexId || hexId.length === 0) return undefined;
  try {
    const lower64Hex = hexId.length > 16 ? hexId.slice(-16) : hexId.padStart(16, '0');
    if (!/^[0-9a-fA-F]{16}$/.test(lower64Hex) || BigInt(`0x${lower64Hex}`) === 0n) return undefined;
    return BigInt(`0x${lower64Hex}`).toString(10);
  } catch (e) {
    return undefined;
  }
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

// New helper to extract SpanContext relevant values from a parsed header
export function extractSpanContextValuesFromHeader(
  parsedInput: ParsedTraceInfo | null
): Partial<SharedTraceContext> | null {
  if (!parsedInput || !parsedInput.isValid) {
    return null; 
  }

  const newCtxPartial: Partial<SharedTraceContext> = {};

  switch (parsedInput.type) {
    case 'W3C TraceParent':
      const w3c = parsedInput as W3CParsedTrace;
      newCtxPartial.otelVersion = w3c.version;
      newCtxPartial.otelTraceId = w3c.traceId;
      newCtxPartial.otelParentSpanId = w3c.parentId;
      newCtxPartial.otelTraceFlags = w3c.flags;
      newCtxPartial.sourceType = 'W3C TraceParent';
      break;
    case 'B3 Single Header':
      const b3 = parsedInput as B3SingleParsedTrace;
      newCtxPartial.otelVersion = "00"; 
      newCtxPartial.otelTraceId = b3.traceId.length === 16 ? "0".repeat(16) + b3.traceId : b3.traceId;
      newCtxPartial.otelParentSpanId = b3.spanId;
      let b3Flags = TraceFlags.NONE;
      if (b3.sampled === '1' || b3.sampled === 'd') {
        b3Flags = TraceFlags.SAMPLED;
      }
      newCtxPartial.otelTraceFlags = b3Flags.toString(16).padStart(2, '0');
      newCtxPartial.sourceType = 'B3 Single Header';
      break;
    case 'Jaeger (uber-trace-id)':
      const jaeger = parsedInput as JaegerParsedTrace;
      newCtxPartial.otelVersion = "00";
      newCtxPartial.otelTraceId = jaeger.traceId.padStart(32, '0');
      newCtxPartial.otelParentSpanId = jaeger.spanId.padStart(16, '0');
      const jaegerFlagsInt = parseInt(jaeger.flags, 16);
      newCtxPartial.otelTraceFlags = (jaegerFlagsInt & 0x01) === 0x01 ? TraceFlags.SAMPLED.toString(16).padStart(2, '0') : TraceFlags.NONE.toString(16).padStart(2, '0');
      newCtxPartial.sourceType = 'Jaeger (uber-trace-id)';
      break;
    case 'AWS X-Ray (X-Amzn-Trace-Id)':
      const aws = parsedInput as AWSRayParsedTrace;
      newCtxPartial.otelVersion = "00"; 
      const awsTimePart = (aws.rootTime || "00000000").slice(0, 8);
      const awsIdPart = (aws.rootIdentifier || "0".repeat(24)).slice(0, 24);
      newCtxPartial.otelTraceId = (awsTimePart + awsIdPart).padEnd(32, '0').substring(0,32);
      newCtxPartial.otelParentSpanId = (aws.parsedParentId || "0".repeat(16)).padStart(16, '0');
      newCtxPartial.otelTraceFlags = aws.sampled === '1' ? TraceFlags.SAMPLED.toString(16).padStart(2, '0') : TraceFlags.NONE.toString(16).padStart(2, '0');
      newCtxPartial.sourceType = 'AWS X-Ray (X-Amzn-Trace-Id)';
      break;
    case 'Datadog Trace ID (x-datadog-trace-id)':
      const ddTraceId = parsedInput as DatadogIdParsed;
      newCtxPartial.otelVersion = "00";
      newCtxPartial.otelTraceId = (ddTraceId.header_id_hex_u64 || "0".repeat(16)).padStart(32, '0');
      newCtxPartial.sourceType = 'Datadog Trace ID (x-datadog-trace-id)';
      break;
    case 'Datadog Parent ID (x-datadog-parent-id)':
      const ddParentId = parsedInput as DatadogIdParsed;
      newCtxPartial.otelVersion = "00";
      newCtxPartial.otelParentSpanId = (ddParentId.header_id_hex_u64 || "0".repeat(16)).padStart(16, '0');
      newCtxPartial.sourceType = 'Datadog Parent ID (x-datadog-parent-id)';
      break;
    case 'Datadog Sampling Priority (x-datadog-sampling-priority)':
      const ddSample = parsedInput as DatadogSamplingPriorityParsed;
      newCtxPartial.otelVersion = "00";
      newCtxPartial.otelTraceFlags = (ddSample.numericPriority !== undefined && ddSample.numericPriority > 0) ? TraceFlags.SAMPLED.toString(16).padStart(2, '0') : TraceFlags.NONE.toString(16).padStart(2, '0');
      newCtxPartial.sourceType = 'Datadog Sampling Priority (x-datadog-sampling-priority)';
      break;
    case 'gRPC Trace Bin (grpc-trace-bin)':
      const grpc = parsedInput as GrpcTraceBinParsedTrace;
      newCtxPartial.otelVersion = "00"; 
      newCtxPartial.otelTraceId = (grpc.traceId || "0".repeat(32)).padStart(32,'0');
      newCtxPartial.otelParentSpanId = (grpc.spanId || "0".repeat(16)).padStart(16,'0');
      newCtxPartial.otelTraceFlags = grpc.traceOptions && (parseInt(grpc.traceOptions, 16) & 0x01) === 0x01 ? TraceFlags.SAMPLED.toString(16).padStart(2, '0') : TraceFlags.NONE.toString(16).padStart(2, '0');
      newCtxPartial.sourceType = 'gRPC Trace Bin (grpc-trace-bin)';
      break;
    case 'W3C TraceState':
    case 'Datadog Tags (x-datadog-tags)':
    case 'gRPC Tags Bin (grpc-tags-bin)':
      newCtxPartial.sourceType = parsedInput.type; // Update sourceType but no SpanContext fields
      return newCtxPartial; 
    default: {
      const exhaustiveCheck: never = parsedInput;
      console.warn("Unhandled parsedInput.type in extractSpanContextValuesFromHeader:", exhaustiveCheck);
      return null;
    } 
  }

  const fieldsToUpdate: Partial<SharedTraceContext> = {};
  if (newCtxPartial.otelVersion !== undefined) fieldsToUpdate.otelVersion = newCtxPartial.otelVersion;
  
  if (newCtxPartial.otelTraceId !== undefined && isValidTraceId(newCtxPartial.otelTraceId)) {
    fieldsToUpdate.otelTraceId = newCtxPartial.otelTraceId;
  } else if (newCtxPartial.otelTraceId !== undefined) {
    // Invalid trace ID extracted for a header type that should provide it.
    return null; 
  }

  if (newCtxPartial.otelParentSpanId !== undefined && isValidSpanId(newCtxPartial.otelParentSpanId)) {
    fieldsToUpdate.otelParentSpanId = newCtxPartial.otelParentSpanId;
  } else if (newCtxPartial.otelParentSpanId !== undefined) {
    // Invalid span ID extracted for a header type that should provide it.
    return null; 
  }
  
  if (newCtxPartial.otelTraceFlags !== undefined) fieldsToUpdate.otelTraceFlags = newCtxPartial.otelTraceFlags;
  if (newCtxPartial.sourceType !== undefined) fieldsToUpdate.sourceType = newCtxPartial.sourceType;
  
  // If, after validation, fieldsToUpdate is empty or only contains sourceType,
  // it means no actual span context (version, traceId, parentId, flags) was successfully updated.
  // In this case, return null to indicate that the shared span context should not change,
  // though App.tsx might still update the sourceType based on user interaction.
  if (Object.keys(fieldsToUpdate).length === 0 || 
      (Object.keys(fieldsToUpdate).length === 1 && fieldsToUpdate.sourceType)) {
    return null;
  }

  return fieldsToUpdate;
}


// --- Individual Header String Generators ---

export function generateW3CTraceParentString(context: Readonly<SharedTraceContext>): string {
  return `${context.otelVersion}-${context.otelTraceId}-${context.otelParentSpanId}-${context.otelTraceFlags}`;
}

export function generateB3SingleHeaderString(context: Readonly<SharedTraceContext>): string {
  const traceId = context.otelTraceId.length === 32 ? context.otelTraceId.slice(-16) : context.otelTraceId; 
  const spanId = context.otelParentSpanId; 
  const isSampled = (parseInt(context.otelTraceFlags, 16) & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
  return `${traceId}-${spanId}${isSampled ? '-1' : '-0'}`;
}

export function generateDatadogTraceIdString(context: Readonly<SharedTraceContext>): string {
  return hexToDatadogU64Decimal(context.otelTraceId) || "";
}

export function generateDatadogParentIdString(context: Readonly<SharedTraceContext>): string {
  return hexToDatadogU64Decimal(context.otelParentSpanId) || "";
}

export function generateDatadogSamplingPriorityString(
  context: Readonly<SharedTraceContext>,
  localDatadogSamplingPriority?: number
): string {
  if (localDatadogSamplingPriority !== undefined) {
    return localDatadogSamplingPriority.toString();
  }
  const isSampled = (parseInt(context.otelTraceFlags, 16) & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
  return isSampled ? "1" : "0"; 
}

export function generateJaegerHeaderString(
  context: Readonly<SharedTraceContext>,
  localJaegerSpecificDebugFlag?: boolean
): string {
  const { otelTraceId, otelParentSpanId, otelTraceFlags } = context;
  const isSampled = (parseInt(otelTraceFlags, 16) & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;

  const jaegerTID = otelTraceId.startsWith("0000000000000000") && otelTraceId.length === 32 ? otelTraceId.substring(16) : otelTraceId; 
  const jaegerSID = otelParentSpanId; 
  const jaegerPID = "0"; 
  
  let jaegerFlagsInt = isSampled ? 0x01 : 0x00;
  if (localJaegerSpecificDebugFlag) jaegerFlagsInt = jaegerFlagsInt | 0x02;
  
  return `${jaegerTID}:${jaegerSID}:${jaegerPID}:${jaegerFlagsInt.toString(16).padStart(1,'0')}`;
}

export function generateAWSXRayString(
  context: Readonly<SharedTraceContext>,
  localAwsRootTimeHex?: string,
  localAwsRootIdentifierHex?: string,
  localAwsOtherFields?: Array<{ key: string; value: string }>
): string {
  const { otelTraceId, otelParentSpanId, otelTraceFlags } = context;
  const isSampled = (parseInt(otelTraceFlags, 16) & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;

  const defaultTime = otelTraceId && otelTraceId.length === 32 ? otelTraceId.substring(0, 8) : Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const defaultIdent = otelTraceId && otelTraceId.length === 32 ? otelTraceId.substring(8) : "0".repeat(24);
  
  const awsTime = localAwsRootTimeHex || defaultTime;
  const awsIdent = localAwsRootIdentifierHex || defaultIdent;
  
  let awsHeader = `Root=1-${awsTime}-${awsIdent}`;
  if (otelParentSpanId && !/^[0]+$/.test(otelParentSpanId)) {
     awsHeader += `;Parent=${otelParentSpanId}`;
  }
  awsHeader += `;Sampled=${isSampled ? '1' : '0'}`;

  if(localAwsOtherFields) {
    localAwsOtherFields.forEach(f => awsHeader += `;${f.key}=${f.value}`);
  }
  return awsHeader;
}

export function generateGrpcTraceBinString(context: Readonly<SharedTraceContext>): string {
  const { otelTraceId, otelParentSpanId, otelTraceFlags } = context;
  const isSampled = (parseInt(otelTraceFlags, 16) & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;

  const grpcBin_ver = "00";
  const grpcBin_tidField = "00";
  const grpcBin_tid = otelTraceId.padStart(32,'0');
  const grpcBin_sidField = "01";
  const grpcBin_sid = otelParentSpanId.padStart(16,'0');
  const grpcBin_optField = "02";
  const grpcBin_opt = isSampled ? "01" : "00";
  const grpcBinHexString = `${grpcBin_ver}${grpcBin_tidField}${grpcBin_tid}${grpcBin_sidField}${grpcBin_sid}${grpcBin_optField}${grpcBin_opt}`;
  try {
    return btoa(String.fromCharCode(...hexToBytes(grpcBinHexString)));
  } catch (e) { return "Error: gRPC Trace Bin Gen Failed"; }
}
