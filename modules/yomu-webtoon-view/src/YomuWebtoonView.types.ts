import type { StyleProp, ViewStyle } from 'react-native';

export type YomuWebtoonViewRef = {
  scrollToIndex: (index: number) => void;
};

export type YomuWebtoonViewProps = {
  urls: string[];
  onSingleTap?: (event: { nativeEvent: {} }) => void;
  onDoubleTap?: (event: { nativeEvent: {} }) => void;
  onCurrentIndexChanged?: (event: { nativeEvent: { newIndex: number } }) => void;
  onScroll?: (event: { nativeEvent: {} }) => void;
  onEndReached?: (event: { nativeEvent: {} }) => void;
  style?: StyleProp<ViewStyle>;
};
