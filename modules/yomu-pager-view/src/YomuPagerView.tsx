import * as React from 'react';
import { YomuPagerViewProps, YomuPagerViewRef } from './YomuPagerView.types';
import { requireNativeViewManager } from 'expo-modules-core';

export const PagerView: React.ComponentType<YomuPagerViewProps> = requireNativeViewManager('YomuPagerView');

export const YomuPagerView = React.forwardRef<YomuPagerViewRef, YomuPagerViewProps>((props, ref) => {
  return <PagerView {...props} ref={ref} />;
});