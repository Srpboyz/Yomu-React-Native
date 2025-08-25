import { memo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Image, useImage } from "expo-image";
import { useSelector } from "react-redux";
import { ReduxState, Source } from "../../types";

interface Props {
    source: Source
    onPress(): void
}

const SourceView = ({ source, ...props }: Props) => {
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)
    const image = useImage(`${httpAddress}/sources/${source.id}/icon`)

    return (
        <TouchableOpacity activeOpacity={0.8} onPress={props.onPress}>
            <View style={{ flexDirection: "row", paddingHorizontal: 17, paddingVertical: 10 }}>
                {image !== null
                    ? <Image
                        style={{ marginRight: 10, width: 30, height: 30 }}
                        source={image}
                        cachePolicy="memory"
                        priority="low"
                    />
                    : <View
                        style={{
                            width: 30,
                            height: 30,
                            marginRight: 10,
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <ActivityIndicator size="large" color="white" />
                    </View>
                }
                <Text style={{ color: "white", fontSize: 20 }}>{source.name}</Text>
            </View>
        </TouchableOpacity>
    )
}


export default memo(SourceView)