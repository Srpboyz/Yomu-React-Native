import { ActivityIndicator, View } from "react-native"
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";


interface Props {
    onSingleTap?: () => void;
}

const Spinner = ({ onSingleTap }: Props) => {

    const singleTap = Gesture.Tap()
        .maxDistance(3)
        .onEnd((_e, success) => { if (success) onSingleTap?.() })
        .runOnJS(true)
    const doubleTap = Gesture.Tap().numberOfTaps(2)
    const tapGesture = Gesture.Exclusive(doubleTap, singleTap)


    return (
        <GestureHandlerRootView style={{ backgroundColor: "black", width: "100%", height: "100%" }}>
            <GestureDetector gesture={tapGesture}>
                <View
                    style={{
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <ActivityIndicator size="large" color="white" />
                </View>
            </GestureDetector>
        </GestureHandlerRootView>
    )
}

export default Spinner