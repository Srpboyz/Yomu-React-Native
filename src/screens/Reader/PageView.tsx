import { memo, useRef, useState } from "react";
import { ActivityIndicator, Button, PixelRatio, Text, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { Image, useImage } from "expo-image";

interface Props {
    isHorizontal: boolean
    styles: any,
    url: string,
}

const PageView = (props: Props) => {
    const { width, height } = useWindowDimensions()
    const [failed, setFailed] = useState(false)
    const ref = useRef<(() => void) | null>(null)
    const image = useImage(props.url, {
        onError(error, retry) {
            ref.current = retry;
            setFailed(true)
        }
    })

    const fitToWidth = image !== null && ((PixelRatio.getPixelSizeForLayoutSize(height) / image.height) > (PixelRatio.getPixelSizeForLayoutSize(width) / image.width))

    const imageWidth = props.isHorizontal && fitToWidth ? width : undefined
    const imageHeight = props.isHorizontal && !fitToWidth ? "100%" : undefined
    const alignItems = props.isHorizontal ? "center" : undefined
    const justifyContent = props.isHorizontal ? "center" : undefined

    const getContent = () => {
        if (image !== null) {
            return (
                <Image
                    style={{
                        aspectRatio: image.width / image.height,
                        width: imageWidth,
                        height: imageHeight
                    }}
                    source={image}
                    cachePolicy="none"
                />
            )
        }

        if (!failed) {
            return (
                <View style={{
                    backgroundColor: "black",
                    width: "100%",
                    height: height,
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <ActivityIndicator size="large" color="white" />
                </View>
            )
        }

        return (
            <View style={{ width: width, height: height, alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Text style={{ color: "white", textAlign: "center", fontSize: 17 }}>Failed to load Image</Text>
                <Button title="Retry" onPress={() => { if (ref.current !== null) ref.current(); setFailed(false) }} />
            </View>
        )
    }

    return (
        <Animated.View
            style={[
                {
                    width: width,
                    alignItems: alignItems,
                    justifyContent: justifyContent
                },
                props.styles
            ]}
        >
            {getContent()}
        </Animated.View>
    )
}

export default memo(PageView)
