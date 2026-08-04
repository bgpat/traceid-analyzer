
import React from 'react';
import { TraceHeaderTypeString, AppCardData } from '../../types';
import CardHeader from './CardHeader';
import CardDetails from './CardDetails';
import CardItem from './CardItem';

interface CardProps {
  vendorName: string;
  headersData: AppCardData[];
  onValueChange: (newValue: string, type: TraceHeaderTypeString) => void;
  renderHeaderDetails: (headerData: AppCardData) => React.ReactNode;
}

const Card: React.FC<CardProps> = ({ 
  vendorName,
  headersData,
  onValueChange,
  renderHeaderDetails,
}) => {
  return (
    <div className="bg-white shadow-xl rounded-xl flex flex-col w-full max-w-sm mx-auto">
      <CardHeader title={vendorName} />
      <CardDetails headersData={headersData} onValueChange={onValueChange}>
        {headersData.map((hd) => (
          <CardItem key={`${hd.type}-item-card`} headerData={hd}>
            {renderHeaderDetails(hd)}
          </CardItem>
        ))}
      </CardDetails>
    </div>
  );
};

export default Card;
