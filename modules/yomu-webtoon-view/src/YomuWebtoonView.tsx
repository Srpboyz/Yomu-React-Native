import * as React from 'react';
import { YomuWebtoonViewProps, YomuWebtoonViewRef } from './YomuWebtoonView.types';
import { requireNativeViewManager } from 'expo-modules-core';

export const WebtoonView: React.ComponentType<YomuWebtoonViewProps> = requireNativeViewManager('YomuWebtoonView');

export const YomuWebtoonView = React.forwardRef<YomuWebtoonViewRef, YomuWebtoonViewProps>((props, ref) => {
  return <WebtoonView {...props} ref={ref} />;
});