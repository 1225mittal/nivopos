import React from 'react';
import { PosBilling } from './PosBilling';
import { StoreProfile } from '../types';

export interface CounterPOSProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onNavigateToProducts: () => void;
  onNavigateToSettings: () => void;
}

export const CounterPOS: React.FC<CounterPOSProps> = (props) => {
  return <PosBilling {...props} />;
};

export default CounterPOS;
