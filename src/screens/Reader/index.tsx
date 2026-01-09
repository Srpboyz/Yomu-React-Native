import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { StaticScreenProps, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Slider } from '@react-native-assets/slider'
import * as NavigationBar from "expo-navigation-bar";
import { useSelector, useDispatch } from "react-redux";
import ImageButton from "../../components/ImageButton";
import { setReaderDirection } from "../../store";
import { Chapter, ReaderDirection, ReduxState } from "../../types";
import PageView from "./PageView";


type Props = StaticScreenProps<{
    chapters: Chapter[];
    currentChapterIndex: number;
}>;


const Reader = ({ route }: Props) => {
    const { width } = useWindowDimensions()
    const { chapters } = route.params
    const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(route.params.currentChapterIndex)
    const [pageCount, setPageCount] = useState<number>(0)
    const [currentPage, setCurrentPage] = useState<number>(0)
    const [overlayShown, setOverlayShown] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)
    const readerDirection = useSelector((state: ReduxState) => state.readerDirection)
    const isHorizontal = readerDirection === ReaderDirection.LeftToRight || readerDirection === ReaderDirection.RightToLeft
    const navigation = useNavigation()
    const insets = useSafeAreaInsets()
    const dispatch = useDispatch()

    const startScale = useSharedValue(0)
    const scale = useSharedValue(1)
    const offsetX = useSharedValue(0)
    const prevOffsetX = useSharedValue(0);
    const ref = useRef<any>()


    useEffect(() => {
        navigation.setOptions({ headerShown: false });

        StatusBar.setHidden(true)
        NavigationBar.setVisibilityAsync("hidden");
        NavigationBar.setBehaviorAsync("overlay-swipe");


        return () => {
            StatusBar.setHidden(false);
            NavigationBar.setVisibilityAsync("visible");
            NavigationBar.setBehaviorAsync("inset-swipe");
        }
    }, [])

    useEffect(() => {
        StatusBar.setHidden(!overlayShown);
        NavigationBar.setVisibilityAsync(overlayShown ? "visible" : "hidden");
    }, [overlayShown])

    useEffect(() => {
        const chapter = chapters[currentChapterIndex]
        let cancelled = false

        setPageCount(0)
        setLoading(true)

        fetch(`${httpAddress}/chapter/${chapter.id}/pages`)
            .then(res => res.json().then(data => {
                if (!cancelled) { setPageCount(data.pages) }
            }))
            .catch(() => navigation.goBack())
            .finally(() => setLoading(false))

        return () => { cancelled = true }

    }, [currentChapterIndex])


    const prevChapter = () => {
        if (currentChapterIndex > 0) { setCurrentChapterIndex(currentChapterIndex - 1) }
    }

    const nextChapter = () => {
        if (currentChapterIndex < chapters.length - 1) { setCurrentChapterIndex(currentChapterIndex + 1) }
    }

    const markChapterAsRead = () => {
        const chapter = chapters[currentChapterIndex]
        fetch(`${httpAddress}/chapter/${chapter.id}/read`, { method: "POST" })
    }

    const getNextReaderDirection = (direction: ReaderDirection) => {
        if (direction === ReaderDirection.Vertical) {
            return (
                <ImageButton
                    source={require("../../../assets/vertical.png")}
                    onPress={() => dispatch(setReaderDirection(ReaderDirection.RightToLeft))}
                />
            )
        }

        if (direction === ReaderDirection.RightToLeft) {
            return (
                <ImageButton
                    source={require("../../../assets/right-to-left.png")}
                    onPress={() => dispatch(setReaderDirection(ReaderDirection.LeftToRight))}
                />
            )
        }

        return (
            <ImageButton
                source={require("../../../assets/left-to-right.png")}
                onPress={() => dispatch(setReaderDirection(ReaderDirection.Vertical))}
            />
        )
    }

    const clamp = (val: number, min: number, max: number) => {
        return Math.min(Math.max(val, min), max);
    }

    const singleTap = Gesture.Tap()
        .maxDistance(3)
        .onEnd((e, success) => { if (success) setOverlayShown(!overlayShown) })
        .runOnJS(true);
    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            const newScale = scale.value == 1 ? 1.5 : 1;
            scale.value = withTiming(newScale, { duration: 100 });

            prevOffsetX.value = 0
            offsetX.value = withTiming(0, { duration: 100 })
        })
        .runOnJS(true);
    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            startScale.value = scale.value
        })
        .onUpdate((e) => {
            scale.value = clamp(startScale.value * e.scale, 0.5, 1.5);
        })
        .onEnd((e) => {
            const newScale = clamp(startScale.value * e.scale, 0.5, 1.5)
            if (newScale <= 1) {
                prevOffsetX.value = 0
                offsetX.value = withTiming(0, { duration: 100 })
            }
            else {
                const maxOffset = Math.abs(width * (newScale - 1)) / 2;
                const newOffsetX = clamp(offsetX.value, -maxOffset, maxOffset)
                offsetX.value = withTiming(newOffsetX, { duration: 100 })
            }
        })
        .runOnJS(true);
    const panGesture = Gesture.Pan()
        .maxPointers(1)
        .onStart(() => { prevOffsetX.value = offsetX.value })
        .onUpdate((e) => {
            if (scale.value <= 1) return;

            const maxOffset = Math.abs(width * (scale.value - 1)) / 2;
            const maxOffsetChange = width / 2 - 50
            const newOffsetX = clamp(prevOffsetX.value + e.translationX, -maxOffsetChange, maxOffsetChange)

            offsetX.value = clamp(newOffsetX, -maxOffset, maxOffset);
        })
        .runOnJS(true)
    const nativeGesture = Gesture.Native();
    const gestures = Gesture.Race(
        pinchGesture,
        Gesture.Simultaneous(nativeGesture, panGesture),
        Gesture.Exclusive(doubleTap, singleTap)
    );

    const animatedStyle = useAnimatedStyle(() => {
        const styleWidth = width * (!isHorizontal ? scale.value : 1)
        const translateX = !isHorizontal ? offsetX.value : 0

        return {
            width: styleWidth,
            transform: [{ translateX: translateX }]
        }

    });


    return (
        <GestureHandlerRootView style={{ backgroundColor: "black", width: "100%", height: "100%" }}>
            <GestureDetector gesture={gestures}>
                {!loading
                    ? <FlatList
                        ref={ref}
                        data={Array.from({ length: pageCount }, (_, index) => index)}
                        contentContainerStyle={{ alignItems: "center" }}
                        renderItem={({ item }) => (
                            <PageView key={item}
                                styles={animatedStyle}
                                isHorizontal={isHorizontal}
                                url={`${httpAddress}/chapter/${chapters[currentChapterIndex].id}/page/${item}`}
                            />
                        )}
                        onViewableItemsChanged={({ viewableItems }) => setCurrentPage(viewableItems.length > 0 ? (viewableItems[0].index || 0) : 0)}
                        onScroll={(e) => setOverlayShown(false)}
                        onEndReached={markChapterAsRead}
                        onScrollToIndexFailed={() => { }}
                        horizontal={isHorizontal}
                        inverted={readerDirection === ReaderDirection.LeftToRight}
                        pagingEnabled={isHorizontal}
                    />
                    : <View
                        style={{
                            width: "100%",
                            height: "100%",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <ActivityIndicator size="large" color="white" />
                    </View>
                }
            </GestureDetector>

            <View
                style={{
                    ...styles.overlay,
                    display: !overlayShown ? "none" : undefined,
                    flexDirection: "row",
                    gap: 10,
                    borderBottomLeftRadius: 10,
                    borderBottomRightRadius: 10,
                    paddingTop: insets.top + 10,
                    paddingHorizontal: 20,
                    paddingBottom: 20,
                    minHeight: 75
                }}
            >
                <ImageButton source={require("../../../assets/previous.png")} onPress={navigation.goBack} />
                <Text
                    style={{
                        color: "white",
                        width: "60%",
                        fontSize: 20,
                        textShadowColor: "black",
                        textShadowRadius: 2,
                        textAlign: "center",
                        marginHorizontal: 10,
                        flex: 1
                    }}
                >
                    {chapters[currentChapterIndex].title}
                </Text>
                {getNextReaderDirection(readerDirection)}
            </View>

            <View style={{
                ...styles.overlay,
                backgroundColor: "transparent",
                bottom: 5 + (overlayShown ? insets.bottom : 0)
            }}>
                <Text style={{ color: "white", textShadowColor: "black", textShadowRadius: 2 }}>
                    {pageCount > 0 ? currentPage + 1 : 0} / {pageCount}
                </Text>
            </View>

            <View
                style={{
                    ...styles.overlay,
                    display: !overlayShown ? "none" : undefined,
                    flexDirection: "row",
                    gap: 15,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                    bottom: 0,
                    height: 100
                }}
            >
                <ImageButton source={require("../../../assets/previous.png")} onPress={prevChapter} />
                <Slider
                    style={{ width: "70%" }}
                    maximumValue={pageCount - 1}
                    value={currentPage}
                    onValueChange={(page) => { ref.current.scrollToIndex({ index: page, animated: false }); return false }}
                    thumbTintColor={"white"}
                    step={1}
                />
                <ImageButton source={require("../../../assets/next.png")} onPress={nextChapter} />
            </View>
        </GestureHandlerRootView>
    )
}

const styles = StyleSheet.create({
    overlay: {
        backgroundColor: "#000000AA",
        width: "100%",
        position: "absolute",
        justifyContent: "center",
        alignItems: "center"
    }
})

export default Reader