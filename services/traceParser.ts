
import {
  TraceHeaderTypeString,
  ParsedTraceInfo,
  W3CParsedTrace,
  B3SingleParsedTrace,
  JaegerParsedTrace,
  AWSRayParsedTrace,
  DatadogIdParsed,
  DatadogSamplingPriorityParsed,
  ValidationNotes,
  AWSRayParsedTraceField,
  GrpcTraceBinParsedTrace,
  W3CTraceStateParsed,
  TraceStateEntry,
  GrpcTagsBinParsed,
  GrpcTag,
  DatadogTagsParsed,
  DatadogTagEntry,
} from '../types';

const MAX_UINT64_STR = "18446744073709551615";

function isUint64String(value: string): { validDecimal: boolean; tooLarge: boolean } {
  if (!/^\d+$/.test(value)) return { validDecimal: false, tooLarge: false };
  if (value.length > MAX_UINT64_STR.length || (value.length === MAX_UINT64_STR.length && value > MAX_UINT64_STR)) {
    return { validDecimal: true, tooLarge: true };
  }
  return { validDecimal: true, tooLarge: false };
}

const createInitialValidationNotes = (): ValidationNotes => ({});

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}


function isAllZerosHex(hexString: string): boolean {
  return /^[0]+$/.test(hexString);
}


export const parseW3CTraceParent = (header: string): W3CParsedTrace => {
  const result: W3CParsedTrace = {
    type: 'W3C TraceParent',
    version: '', traceId: '', parentId: '', flags: '',
    isValid: false,
    validationNotes: createInitialValidationNotes(),
  };

  if (!header || header.trim() === '') {
    result.validationNotes.general = "Header is empty.";
    return result;
  }

  const parts = header.split('-');
  if (parts.length !== 4) {
    result.validationNotes.general = `Invalid format: Expected 4 parts separated by '-', got ${parts.length}.`;
    return result;
  }

  let overallValid = true;
  result.version = parts[0];
  result.traceId = parts[1];
  result.parentId = parts[2];
  result.flags = parts[3];

  if (!/^[0-9a-f]{2}$/.test(result.version)) {
    result.validationNotes.version = 'Version must be 2 hex characters.'; overallValid = false;
  } else if (result.version === 'ff') {
    result.validationNotes.version = 'Version "ff" is invalid.'; overallValid = false;
  }

  if (!/^[0-9a-f]{32}$/.test(result.traceId)) {
    result.validationNotes.traceId = 'Trace ID must be 32 hex characters.'; overallValid = false;
  } else if (result.traceId === '00000000000000000000000000000000') {
    result.validationNotes.traceId = 'Trace ID must not be all zeros.'; overallValid = false;
  }

  if (!/^[0-9a-f]{16}$/.test(result.parentId)) {
    result.validationNotes.parentId = 'Parent ID must be 16 hex characters.'; overallValid = false;
  }

  if (!/^[0-9a-f]{2}$/.test(result.flags)) {
    result.validationNotes.flags = 'Flags must be 2 hex characters.'; overallValid = false;
  }

  result.isValid = overallValid;
  return result;
};

export const parseW3CTraceState = (header: string): W3CTraceStateParsed => {
  const result: W3CTraceStateParsed = {
    type: 'W3C TraceState',
    entries: [],
    isValid: true,
    validationNotes: createInitialValidationNotes(),
  };

  if (header.trim() === '') {
    return result;
  }

  const listMembers = header.split(',');
  if (listMembers.length > 32) {
    result.validationNotes.general = "TraceState MUST NOT contain more than 32 list members.";
    result.isValid = false;
  }

  const seenKeys = new Set<string>();

  for (let i = 0; i < listMembers.length; i++) {
    const member = listMembers[i].trim();
    if (member === '') {
       if (listMembers.length === 1) {
            continue;
       }
      result.validationNotes[`entry_${i}`] = `List member ${i + 1} is empty or consists only of whitespace.`;
      result.isValid = false;
      continue;
    }

    const parts = member.split('=');
    if (parts.length !== 2) {
      result.validationNotes[`entry_${i}`] = `List member ${i + 1} "${member}" is not a valid key=value pair.`;
      result.isValid = false;
      result.entries.push({ key: member, value: '', isValid: false, note: `Invalid format: not key=value`});
      continue;
    }

    const key = parts[0];
    const value = parts[1];
    const entry: TraceStateEntry = { key, value, isValid: true };

    if (!/^[a-z0-9_\-*/][a-z0-9_\-*/.]{0,255}$/.test(key) && !/^[a-z0-9_\-*/.]{1,241}@[a-z0-9_\-*/.]{1,13}$/.test(key)) {
         if (!/^[a-z0-9][a-z0-9_\-.* /]{0,255}(@[a-z0-9][a-z0-9_\-.* /]{0,13})?$/.test(key)) { // Key format for W3C is quite specific
            entry.note = (entry.note || "") + ` Key "${key}" contains invalid characters or format. Adheres to stricter regex.`; // W3C spec's key format.
            entry.isValid = false;
            result.isValid = false;
         }
    }
     if (key.length > 256) {
        entry.note = (entry.note || "") + ` Key "${key}" is longer than 256 characters.`;
        entry.isValid = false; result.isValid = false;
    }
    if (seenKeys.has(key)) {
        entry.note = (entry.note || "") + ` Key "${key}" is duplicated.`;
    } else {
        seenKeys.add(key);
    }

    if (!/^[\x20-\x2B\x2D-\x3C\x3E-\x7E]*$/.test(value) || value.length > 256) {
      entry.note = (entry.note || "") + ` Value for key "${key}" contains invalid characters (non-printable ASCII or ,=) or is longer than 256 characters.`;
      entry.isValid = false;
      result.isValid = false;
    }
    if (value.endsWith(' ')) {
        entry.note = (entry.note || "") + ` Value for key "${key}" ends with a space.`;
        entry.isValid = false; result.isValid = false;
    }
    result.entries.push(entry);
  }

  if (header.length > 512 && header.includes('@')) {
     result.validationNotes.general = (result.validationNotes.general || "") + " TraceState header might exceed total length limits with complex vendor entries.";
  }
  return result;
};


export const parseB3SingleHeader = (header: string): B3SingleParsedTrace => {
  const result: B3SingleParsedTrace = {
    type: 'B3 Single Header',
    traceId: '', spanId: '',
    isValid: false,
    validationNotes: createInitialValidationNotes(),
  };

  if (!header || header.trim() === '') {
    result.validationNotes.general = "Header is empty.";
    return result;
  }

  const parts = header.split('-');
  if (parts.length < 2 || parts.length > 4) {
    result.validationNotes.general = `Invalid format: Expected 2 to 4 parts separated by '-', got ${parts.length}.`;
    return result;
  }

  let overallValid = true;
  result.traceId = parts[0];
  result.spanId = parts[1];

  if (!(/^([0-9a-f]{16}|[0-9a-f]{32})$/.test(result.traceId))) {
    result.validationNotes.traceId = 'Trace ID must be 16 or 32 hex characters.'; overallValid = false;
  } else if (isAllZerosHex(result.traceId)) {
    result.validationNotes.traceId = 'Trace ID must not be all zeros.'; overallValid = false;
  }

  if (!/^[0-9a-f]{16}$/.test(result.spanId)) {
    result.validationNotes.spanId = 'Span ID must be 16 hex characters.'; overallValid = false;
  } else if (isAllZerosHex(result.spanId)) {
    result.validationNotes.spanId = 'Span ID must not be all zeros.'; overallValid = false;
  }

  if (parts.length >= 3) {
    const samplingState = parts[2].toLowerCase();
    if (samplingState === 'd' || samplingState === '1' || samplingState === '0') {
      result.sampled = samplingState as '0' | '1' | 'd';
      if (samplingState === 'd') result.debug = true;
    } else {
      result.validationNotes.sampled = 'Sampling state (part 3) must be "d", "1", or "0".';
      overallValid = false;
    }

    if (parts.length === 4) {
      result.parentId = parts[3];
      if (!/^[0-9a-f]{16}$/.test(result.parentId)) {
        result.validationNotes.parentId = 'Parent ID (part 4) must be 16 hex characters.';
        overallValid = false;
      }
    }
  }

  result.isValid = overallValid;
  return result;
};


export const parseJaegerHeader = (header: string): JaegerParsedTrace => {
  const result: JaegerParsedTrace = {
    type: 'Jaeger (uber-trace-id)',
    traceId: '', spanId: '', parentId: '', flags: '',
    isValid: false,
    validationNotes: createInitialValidationNotes(),
  };

  if (!header || header.trim() === '') {
    result.validationNotes.general = "Header is empty.";
    return result;
  }

  const parts = header.split(':');
  if (parts.length !== 4) {
    result.validationNotes.general = `Invalid format: Expected 4 parts separated by ':', got ${parts.length}.`;
    return result;
  }

  let overallValid = true;
  result.traceId = parts[0];
  result.spanId = parts[1];
  result.parentId = parts[2];
  result.flags = parts[3];

  if (!/^[0-9a-f]+$/.test(result.traceId) || result.traceId.length > 32 || result.traceId.length === 0) {
    result.validationNotes.traceId = 'Trace ID must be 1-32 hex characters.'; overallValid = false;
  } else if (isAllZerosHex(result.traceId) && result.traceId.length > 0) {
     result.validationNotes.traceId = 'Trace ID should not be all zeros.'; overallValid = false;
  }

  if (!/^[0-9a-f]+$/.test(result.spanId) || result.spanId.length > 16 || result.spanId.length === 0) {
    result.validationNotes.spanId = 'Span ID must be 1-16 hex characters.'; overallValid = false;
  } else if (isAllZerosHex(result.spanId) && result.spanId.length > 0) {
    result.validationNotes.spanId = 'Span ID should not be all zeros.'; overallValid = false;
  }

  if (!/^[0-9a-f]+$/.test(result.parentId) || result.parentId.length > 16 || result.parentId.length === 0 ) {
    result.validationNotes.parentId = 'Parent ID must be 1-16 hex characters (or "0" for root spans).'; overallValid = false;
  } else if (result.parentId !== "0" && isAllZerosHex(result.parentId) && result.parentId.length > 0) {
    result.validationNotes.parentId = 'Parent ID, if not "0", should not be all zeros.';
    overallValid = false;
  }

  if (!/^[0-9a-f]{1,2}$/.test(result.flags)) {
    result.validationNotes.flags = 'Flags must be 1 or 2 hex characters.'; overallValid = false;
  }

  result.isValid = overallValid;
  return result;
};

export const parseAWSRayTraceId = (header: string): AWSRayParsedTrace => {
  const result: AWSRayParsedTrace = {
    type: 'AWS X-Ray (X-Amzn-Trace-Id)',
    fields: [],
    isValid: false,
    validationNotes: createInitialValidationNotes(),
  };

  if (!header || header.trim() === '') {
    result.validationNotes.general = "Header is empty.";
    return result;
  }

  const KVPairs = header.split(';').map(p => p.trim()).filter(p => p.length > 0);
  if (KVPairs.length === 0) {
    result.validationNotes.general = "No key-value pairs found.";
    return result;
  }

  let rootFound = false;
  let overallValid = true;

  KVPairs.forEach(partStr => {
    const kvSplit = partStr.split('=');
    const key = kvSplit[0]?.trim();
    const value = kvSplit[1]?.trim();

    const currentField: AWSRayParsedTraceField = { key: partStr, value: '', isValid: true, note: '' };

    if (key && value !== undefined) {
      currentField.key = key;
      currentField.value = value;

      if (key.toLowerCase() === 'root') {
        result.fullRootValue = value;
        rootFound = true;
        const rootParts = value.split('-');
        if (rootParts.length !== 3) {
          result.validationNotes.rootFormat = 'Root format incorrect: Expected 3 parts (e.g., "1-time_hex-id_hex").';
          overallValid = false;
          currentField.isValid = false; currentField.note = result.validationNotes.rootFormat;
        } else {
          result.rootVersion = rootParts[0];
          result.rootTime = rootParts[1];
          result.rootIdentifier = rootParts[2];

          if (result.rootVersion !== '1') {
            result.validationNotes.rootVersion = 'Root Version must be "1".';
            overallValid = false; currentField.isValid = false;
            currentField.note = (currentField.note ? currentField.note + '; ' : '') + result.validationNotes.rootVersion;
          }
          if (!/^[0-9a-f]{8}$/.test(result.rootTime)) {
            result.validationNotes.rootTime = 'Root Time (epoch) must be 8 hex characters.';
            overallValid = false; currentField.isValid = false;
            currentField.note = (currentField.note ? currentField.note + '; ' : '') + result.validationNotes.rootTime;
          } else {
            try {
              const epochSeconds = parseInt(result.rootTime, 16);
              if (isNaN(epochSeconds)) {
                result.validationNotes.rootTimeRFC3339 = 'Root Time (epoch hex) is not a valid number for RFC 3339 conversion.';
              } else {
                const date = new Date(epochSeconds * 1000);
                result.rootTimeRFC3339 = date.toISOString();
              }
            } catch (e) {
              result.validationNotes.rootTimeRFC3339 = 'Error converting Root Time to RFC 3339 format.';
            }
          }
          if (!/^[0-9a-f]{24}$/.test(result.rootIdentifier)) {
            result.validationNotes.rootIdentifier = 'Root Identifier must be 24 hex characters.';
            overallValid = false; currentField.isValid = false;
            currentField.note = (currentField.note ? currentField.note + '; ' : '') + result.validationNotes.rootIdentifier;
          }
        }
      } else if (key.toLowerCase() === 'parent') {
        result.parsedParentId = value;
        if (!/^[0-9a-f]{16}$/.test(value)) {
          result.validationNotes.awsParentId = 'Parent ID should be 16 hex characters.';
          overallValid = false; currentField.isValid = false; currentField.note = result.validationNotes.awsParentId;
        }
      } else if (key.toLowerCase() === 'sampled') {
        const sVal = value.toLowerCase();
        if (sVal === '0' || sVal === '1' || sVal === '?') {
          result.sampled = sVal as '0' | '1' | '?';
        } else {
          result.validationNotes.awsSampled = 'Sampled value should be "0", "1", or "?".';
          overallValid = false; currentField.isValid = false; currentField.note = result.validationNotes.awsSampled;
        }
      }
      result.fields.push(currentField);
    } else {
      currentField.isValid = false;
      currentField.note = 'Malformed key-value pair.';
      result.fields.push(currentField);
      overallValid = false;
    }
  });

  if (!rootFound) {
    result.validationNotes.general = (result.validationNotes.general || "") + " Mandatory Root field is missing or malformed.";
    overallValid = false;
  }

  result.isValid = overallValid;
  return result;
};

export const parseDatadogId = (header: string, type: 'Datadog Trace ID (x-datadog-trace-id)' | 'Datadog Parent ID (x-datadog-parent-id)'): DatadogIdParsed => {
  const result: DatadogIdParsed = {
    type,
    isValid: false,
    validationNotes: createInitialValidationNotes(),
  };

  if (!header || header.trim() === '') {
    result.validationNotes.general = "ID is empty.";
    return result;
  }

  result.header_id_decimal = header;
  const u64check = isUint64String(header);
  result.isTooLargeForU64 = u64check.tooLarge;

  if (!u64check.validDecimal) {
    result.validationNotes.id = "ID must be a positive decimal number.";
    result.isValid = false;
  } else {
    if (u64check.tooLarge) {
      result.validationNotes.id = `ID is a valid large decimal but exceeds standard unsigned 64-bit max value (${MAX_UINT64_STR}). Hex conversion shows lower 64 bits.`;
      result.isValid = true;
    } else if (header === "0") {
       result.validationNotes.id = "ID should not be zero for Trace ID or Parent ID.";
       result.isValid = false;
    } else {
       result.isValid = true;
    }
    try {
        let fullHex = BigInt(header).toString(16);
        result.header_id_hex_u64 = fullHex.length > 16 ? fullHex.slice(-16) : fullHex.padStart(16, '0');
    } catch (e) {
        result.validationNotes.hexConversion = "Failed to convert ID to hex (unexpected error for a valid number string).";
        result.isValid = false;
    }
  }
  return result;
};


export const parseDatadogSamplingPriority = (header: string): DatadogSamplingPriorityParsed => {
  const result: DatadogSamplingPriorityParsed = {
    type: 'Datadog Sampling Priority (x-datadog-sampling-priority)',
    priority: header,
    isValid: false,
    validationNotes: createInitialValidationNotes(),
  };

  if (!header || header.trim() === '') {
    result.validationNotes.general = "Priority is empty.";
    return result;
  }

  const priorityNum = parseInt(header, 10);
  const isValidInteger = /^-?\d+$/.test(header) && !isNaN(priorityNum);

  if (!isValidInteger) {
    result.validationNotes.priority = "Priority must be an integer.";
    return result;
  }

  result.numericPriority = priorityNum; // Store parsed numeric value
  result.isValid = true;
  switch (priorityNum) {
    case -1: result.interpretation = "User Reject (-1): Trace marked to be dropped by user."; break;
    case 0:  result.interpretation = "Auto Reject (0): Trace marked to be dropped by sampler."; break;
    case 1:  result.interpretation = "Auto Keep (1): Trace marked to be kept by sampler."; break;
    case 2:  result.interpretation = "User Keep (2): Trace marked to be kept by user."; break;
    default: result.interpretation = "Custom or unknown priority value.";
  }
  return result;
};

export const parseDatadogTags = (header: string): DatadogTagsParsed => {
  const result: DatadogTagsParsed = {
    type: 'Datadog Tags (x-datadog-tags)',
    entries: [],
    isValid: true,
    validationNotes: createInitialValidationNotes(),
  };

  if (header.trim() === '') {
    return result;
  }

  const tags = header.split(',');
  const seenKeys = new Set<string>();

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i].trim();
    if (tag === '') {
      result.validationNotes[`datadogTagEntry_${i}`] = `Tag entry ${i + 1} is empty.`;
      result.isValid = false;
      continue;
    }

    const parts = tag.split(':');
    if (parts.length === 0 || parts[0].trim() === "") {
        result.validationNotes[`datadogTagEntry_${i}`] = `Tag entry ${i+1} "${tag}" is missing a key.`;
        result.isValid = false;
        result.entries.push({ key: tag, value: '', isValid: false, note: `Missing key.` });
        continue;
    }

    const key = parts[0].trim();
    const value = parts.length > 1 ? parts.slice(1).join(':').trim() : "";
    const entry: DatadogTagEntry = { key, value, isValid: true };

    if (!/^[a-zA-Z][\w\.\/\-]*$/.test(key) && !key.startsWith('_dd.')) {
      entry.note = (entry.note || "") + `Key "${key}" has invalid characters or does not start with a letter. `;
      entry.isValid = false;
      result.isValid = false;
    }
    if (key.length > 200) {
      entry.note = (entry.note || "") + `Key "${key}" is longer than 200 characters. `;
      entry.isValid = false;
      result.isValid = false;
    }
     if (value.length > 256) {
      entry.note = (entry.note || "") + `Value for key "${key}" is longer than 256 characters. `;
      entry.isValid = false; result.isValid = false;
    }

    if (key === '_dd.p.dm') {
      try {
        const numVal = parseInt(value, 10);
        if (!isNaN(numVal)) {
          entry.ddpMechanismValue = numVal;
          result.ddpMechanismValue = numVal; // Store on main parsed object too
        } else {
          entry.note = (entry.note || "") + `_dd.p.dm value "${value}" is not a valid integer. `;
          entry.isValid = false; result.isValid = false;
        }
      } catch (e) {
        entry.note = (entry.note || "") + `_dd.p.dm value "${value}" parsing error. `;
        entry.isValid = false; result.isValid = false;
      }
    }


    if (seenKeys.has(key)) {
      entry.note = (entry.note || "") + `Key "${key}" is duplicated. `;
    } else {
      seenKeys.add(key);
    }
    result.entries.push(entry);
  }
  return result;
};


export const parseGrpcTraceBin = (header: string): GrpcTraceBinParsedTrace => {
  const result: GrpcTraceBinParsedTrace = {
    type: 'gRPC Trace Bin (grpc-trace-bin)',
    isValid: true,
    validationNotes: createInitialValidationNotes(),
  };

  if (!header || header.trim() === '') {
    result.validationNotes.general = "Header is empty.";
    result.isValid = false;
    return result;
  }

  let decodedBytes: Uint8Array;
  try {
    const binaryString = atob(header);
    decodedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      decodedBytes[i] = binaryString.charCodeAt(i);
    }
  } catch (e) {
    result.validationNotes.general = "Invalid Base64 encoding.";
    if (e instanceof Error) {
        result.validationNotes.general += ` Details: ${e.message}`;
    }
    result.isValid = false;
    return result;
  }

  if (decodedBytes.length === 0) {
    result.validationNotes.general = "Header is empty after Base64 decoding.";
    result.isValid = false;
    return result;
  }

  if (decodedBytes.length < 1) {
    result.validationNotes.versionId = "Missing Version ID.";
    result.isValid = false;
  } else {
    const versionIdByte = decodedBytes[0];
    result.versionId = versionIdByte.toString(16).padStart(2, '0');
    if (versionIdByte !== 0x00) {
      result.validationNotes.versionId = `Invalid Version ID. Expected '00', got '${result.versionId}'.`;
      result.isValid = false;
    }
  }

  if (decodedBytes.length < 2) {
    result.validationNotes.traceIdFieldId = "Missing Trace ID Field ID.";
    result.isValid = false;
  } else if (result.isValid || !result.validationNotes.traceIdFieldId) {
    const traceIdFieldIdByte = decodedBytes[1];
    result.traceIdFieldId = traceIdFieldIdByte.toString(16).padStart(2, '0');
    if (traceIdFieldIdByte !== 0x00) {
      result.validationNotes.traceIdFieldId = `Invalid Trace ID Field ID. Expected '00', got '${result.traceIdFieldId}'.`;
      result.isValid = false;
    }
  }

  if (decodedBytes.length < 18) {
    result.validationNotes.traceId = "Missing Trace ID (or header is too short).";
    result.isValid = false;
  } else if (result.isValid || !result.validationNotes.traceId) {
    const traceIdBytes = decodedBytes.slice(2, 18);
    result.traceId = bytesToHex(traceIdBytes);
    if (isAllZerosHex(result.traceId)) {
      result.validationNotes.traceId = "Trace ID must not be all zeros.";
      result.isValid = false;
    }
  }

  if (decodedBytes.length < 19) {
    result.validationNotes.spanIdFieldId = "Missing Span ID Field ID (or header is too short).";
    result.isValid = false;
  } else if (!result.validationNotes.spanIdFieldId) {
    const spanIdFieldIdByte = decodedBytes[18];
    result.spanIdFieldId = spanIdFieldIdByte.toString(16).padStart(2, '0');
    if (spanIdFieldIdByte !== 0x01) {
      result.validationNotes.spanIdFieldId = `Invalid Span ID Field ID. Expected '01', got '${result.spanIdFieldId}'.`;
      result.isValid = false;
    }
  }

  if (decodedBytes.length < 27) {
    result.validationNotes.spanId = "Missing Span ID (or header is too short).";
    result.isValid = false;
  } else if (!result.validationNotes.spanId) {
    const spanIdBytes = decodedBytes.slice(19, 27);
    result.spanId = bytesToHex(spanIdBytes);
    if (isAllZerosHex(result.spanId)) {
      result.validationNotes.spanId = "Span ID must not be all zeros.";
      result.isValid = false;
    }
    if (result.validationNotes.spanIdFieldId && !result.validationNotes.spanId) {
        result.validationNotes.spanId = "Value parsed, but preceded by an invalid Span ID Field ID.";
    } else if (result.validationNotes.spanIdFieldId && result.validationNotes.spanId) {
        result.validationNotes.spanId += " Additionally, value parsed, but preceded by an invalid Span ID Field ID.";
    }
  }

  if (decodedBytes.length < 28) {
    result.validationNotes.traceOptionsFieldId = "Missing Trace Options Field ID (or header is too short).";
    result.isValid = false;
  } else if(!result.validationNotes.traceOptionsFieldId) {
    const traceOptionsFieldIdByte = decodedBytes[27];
    result.traceOptionsFieldId = traceOptionsFieldIdByte.toString(16).padStart(2, '0');
    if (traceOptionsFieldIdByte !== 0x02) {
      result.validationNotes.traceOptionsFieldId = `Invalid Trace Options Field ID. Expected '02', got '${result.traceOptionsFieldId}'.`;
      result.isValid = false;
    }
  }

  if (decodedBytes.length < 29) {
    result.validationNotes.traceOptions = "Missing Trace Options (or header is too short).";
    result.isValid = false;
  } else if (!result.validationNotes.traceOptions) {
    const traceOptionsByte = decodedBytes[28];
    result.traceOptions = traceOptionsByte.toString(16).padStart(2, '0');
    const isSampled = (traceOptionsByte & 0x01) === 0x01;
    result.traceOptionsInterpretation = `Sampled: ${isSampled ? 'Yes' : 'No'}. (Raw: ${result.traceOptions})`;
    if (result.validationNotes.traceOptionsFieldId && !result.validationNotes.traceOptions) {
        result.validationNotes.traceOptions = "Value parsed, but preceded by an invalid Trace Options Field ID.";
    } else if (result.validationNotes.traceOptionsFieldId && result.validationNotes.traceOptions) {
        result.validationNotes.traceOptions += " Additionally, value parsed, but preceded by an invalid Trace Options Field ID.";
    }
  }

  if (decodedBytes.length > 29) {
    result.extraData = bytesToHex(decodedBytes.slice(29));
    const extraDataNote = `Header contains ${decodedBytes.length - 29} extra byte(s) beyond the standard 29: ${result.extraData}.`;
    if (result.validationNotes.general) {
      result.validationNotes.general += ` ${extraDataNote}`;
    } else {
      result.validationNotes.general = extraDataNote;
    }
  }

  if (result.isValid && decodedBytes.length < 29 && decodedBytes.length > 0) {
      result.validationNotes.general = (result.validationNotes.general || "") + ` Header is shorter than the expected 29 bytes for all required fields.`;
      result.isValid = false;
  }

  return result;
};


export const parseGrpcTagsBin = (header: string): GrpcTagsBinParsed => {
  const result: GrpcTagsBinParsed = {
    type: 'gRPC Tags Bin (grpc-tags-bin)',
    tags: [],
    isValid: true,
    validationNotes: createInitialValidationNotes(),
  };

  if (header.trim() === '') {
    return result;
  }

  let decodedBytes: Uint8Array;
  try {
    const binaryString = atob(header);
    decodedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      decodedBytes[i] = binaryString.charCodeAt(i);
    }
  } catch (e) {
    result.validationNotes.general = "Invalid Base64 encoding for tags.";
    if (e instanceof Error) {
        result.validationNotes.general += ` Details: ${e.message}`;
    }
    result.isValid = false;
    return result;
  }

  if (decodedBytes.length === 0 && header.trim() !== '') {
     result.validationNotes.general = "Header is not empty but Base64 decodes to empty.";
     result.isValid = false;
     return result;
  }
  if (decodedBytes.length === 0 && header.trim() === '') {
      return result;
  }

  let offset = 0;

  if (offset >= decodedBytes.length) {
    result.validationNotes.general = "Tag data incomplete: Missing Version ID.";
    result.isValid = false;
    return result;
  }
  const versionId = decodedBytes[offset++];
  if (versionId !== 0x00) {
    result.validationNotes.general = `Invalid Version ID for tags. Expected 0x00, got 0x${versionId.toString(16)}.`;
    result.isValid = false;
  }

  const textDecoder = new TextDecoder('utf-8', { fatal: true });

  while (offset < decodedBytes.length) {
    const currentTag: GrpcTag = { key: '', value: '', isValid: true };

    if (offset >= decodedBytes.length) {
      currentTag.note = "Incomplete tag: Missing Tag Field ID."; currentTag.isValid = false; result.isValid = false;
      result.tags.push(currentTag); break;
    }
    const tagFieldId = decodedBytes[offset++];
    if (tagFieldId !== 0x00) {
      currentTag.note = (currentTag.note || "") + `Invalid Tag Field ID. Expected 0x00, got 0x${tagFieldId.toString(16)}. `;
      currentTag.isValid = false; result.isValid = false;
    }

    if (offset >= decodedBytes.length) {
      currentTag.note = (currentTag.note || "") + "Incomplete tag: Missing Key Length. "; currentTag.isValid = false; result.isValid = false;
      result.tags.push(currentTag); break;
    }
    const keyLen = decodedBytes[offset++];
    if (offset + keyLen > decodedBytes.length) {
      currentTag.note = (currentTag.note || "") + `Incomplete tag: Key Length (${keyLen}) exceeds remaining data. `;
      currentTag.isValid = false; result.isValid = false;
      result.tags.push(currentTag); break;
    }

    try {
      currentTag.key = textDecoder.decode(decodedBytes.subarray(offset, offset + keyLen));
    } catch (e) {
      currentTag.note = (currentTag.note || "") + "Invalid UTF-8 in Tag Key. ";
      currentTag.key = `[Invalid UTF-8: ${bytesToHex(decodedBytes.subarray(offset, offset + keyLen))}]`;
      currentTag.isValid = false; result.isValid = false;
    }
    offset += keyLen;

    if (offset >= decodedBytes.length) {
      currentTag.note = (currentTag.note || "") + "Incomplete tag: Missing Value Length. "; currentTag.isValid = false; result.isValid = false;
      result.tags.push(currentTag); break;
    }
    const valLen = decodedBytes[offset++];
    if (offset + valLen > decodedBytes.length) {
      currentTag.note = (currentTag.note || "") + `Incomplete tag: Value Length (${valLen}) exceeds remaining data. `;
      currentTag.isValid = false; result.isValid = false;
      result.tags.push(currentTag); break;
    }

    try {
      currentTag.value = textDecoder.decode(decodedBytes.subarray(offset, offset + valLen));
    } catch (e) {
      currentTag.note = (currentTag.note || "") + "Invalid UTF-8 in Tag Value. ";
      currentTag.value = `[Invalid UTF-8: ${bytesToHex(decodedBytes.subarray(offset, offset + valLen))}]`;
      currentTag.isValid = false; result.isValid = false;
    }
    offset += valLen;

    result.tags.push(currentTag);
  }

  if (offset > decodedBytes.length && result.isValid) {
      result.validationNotes.general = (result.validationNotes.general || "") + "Parsing error: Offset exceeded buffer length unexpectedly.";
      result.isValid = false;
  }
  return result;
};


export const parseTraceHeader = (headerValue: string, type: TraceHeaderTypeString): ParsedTraceInfo | null => {
  switch (type) {
    case 'W3C TraceParent':
      return parseW3CTraceParent(headerValue);
    case 'W3C TraceState':
      return parseW3CTraceState(headerValue);
    case 'B3 Single Header':
      return parseB3SingleHeader(headerValue);
    case 'Jaeger (uber-trace-id)':
      return parseJaegerHeader(headerValue);
    case 'AWS X-Ray (X-Amzn-Trace-Id)':
      return parseAWSRayTraceId(headerValue);
    case 'Datadog Trace ID (x-datadog-trace-id)':
      return parseDatadogId(headerValue, 'Datadog Trace ID (x-datadog-trace-id)');
    case 'Datadog Parent ID (x-datadog-parent-id)':
      return parseDatadogId(headerValue, 'Datadog Parent ID (x-datadog-parent-id)');
    case 'Datadog Sampling Priority (x-datadog-sampling-priority)':
      return parseDatadogSamplingPriority(headerValue);
    case 'Datadog Tags (x-datadog-tags)':
      return parseDatadogTags(headerValue);
    case 'gRPC Trace Bin (grpc-trace-bin)':
      return parseGrpcTraceBin(headerValue);
    case 'gRPC Tags Bin (grpc-tags-bin)':
      return parseGrpcTagsBin(headerValue);
    default:
      const exhaustiveCheck: never = type;
      console.warn(`Unknown trace header type provided to parser: ${exhaustiveCheck}`);
      return null;
  }
};