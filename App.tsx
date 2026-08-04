import React, { useState, useCallback } from 'react';
import {
  TraceHeaderTypeString,
  SharedTraceContext,
} from './types';

import W3CCard from './components/cards/vendors/W3CCard';
import DatadogCard from './components/cards/vendors/DatadogCard';
import B3Card from './components/cards/vendors/B3Card';
import JaegerCard from './components/cards/vendors/JaegerCard';
import AWSXRayCard from './components/cards/vendors/AWSXRayCard';
import GrpcCard from './components/cards/vendors/GrpcCard';

const parseInitialW3CHeaderForFlatState = (headerValue: string): SharedTraceContext => {
  const parts = headerValue.split('-');
  if (
    parts.length === 4 &&
    /^[0-9a-f]{2}$/.test(parts[0]) &&
    parts[0] !== 'ff' &&
    /^[0-9a-f]{32}$/.test(parts[1]) &&
    !/^[0]+$/.test(parts[1]) &&
    /^[0-9a-f]{16}$/.test(parts[2]) &&
    /^[0-9a-f]{2}$/.test(parts[3])
  ) {
    return {
      sourceType: 'W3C TraceParent',
      otelVersion: parts[0],
      otelTraceId: parts[1],
      otelParentSpanId: parts[2],
      otelTraceFlags: parts[3],
    };
  }
  return {
    sourceType: 'W3C TraceParent',
    otelVersion: '00',
    otelTraceId: '0'.repeat(32),
    otelParentSpanId: '0'.repeat(16),
    otelTraceFlags: '00',
  };
};

const App: React.FC = () => {
  const initialW3CHeaderValue = '00-68445e5000000000d6658e3c2c63e938-e80786e2bfeab4d4-01';

  const [sharedContext, setSharedContext] = useState<SharedTraceContext>(() =>
    parseInitialW3CHeaderForFlatState(initialW3CHeaderValue)
  );

  const handleCardValueChange = useCallback(
    (
      _inputValue: string,
      inputType: TraceHeaderTypeString,
      newSharedContextFromCard: Partial<SharedTraceContext> | null
    ) => {
      if (newSharedContextFromCard) {
        setSharedContext((prevContext) => ({
          ...prevContext,
          ...newSharedContextFromCard,
          sourceType: inputType,
        }));
      } else {
        setSharedContext((prevContext) => ({
          ...prevContext,
          sourceType: inputType,
        }));
      }
    },
    []
  );

  return (
    <React.Fragment>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <W3CCard
          key="w3c-card"
          sharedContext={sharedContext}
          onValueChange={handleCardValueChange}
        />
        <DatadogCard
          key="datadog-card"
          sharedContext={sharedContext}
          onValueChange={handleCardValueChange}
        />
        <B3Card
          key="b3-card"
          sharedContext={sharedContext}
          onValueChange={handleCardValueChange}
        />
        <JaegerCard
          key="jaeger-card"
          sharedContext={sharedContext}
          onValueChange={handleCardValueChange}
        />
        <AWSXRayCard
          key="awsxray-card"
          sharedContext={sharedContext}
          onValueChange={handleCardValueChange}
        />
        <GrpcCard
          key="grpc-card"
          sharedContext={sharedContext}
          onValueChange={handleCardValueChange}
        />
      </div>
    </React.Fragment>
  );
};

export default App;
