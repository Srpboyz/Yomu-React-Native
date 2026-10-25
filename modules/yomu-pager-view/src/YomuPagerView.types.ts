import type { StyleProp, ViewStyle } from 'react-native';

export type YomuPagerViewRef = {
  scrollToIndex: (index: number) => void;
};

export type YomuPagerViewProps = {
  urls: string[];
  inverted?: boolean;
  onSingleTap?: (event: { nativeEvent: {} }) => void;
  onCurrentIndexChanged?: (event: { nativeEvent: { newIndex: number } }) => void;
  onScroll?: (event: { nativeEvent: {} }) => void;
  onEndReached?: (event: { nativeEvent: {} }) => void;
  style?: StyleProp<ViewStyle>;
};
