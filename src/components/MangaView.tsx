import React, { memo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ImageBackground } from "expo-image";
import { Manga, ReduxState } from "../types";
import { useSelector } from "react-redux";

interface Props {
    manga: Manga;
    isSelected: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
}

const MangaView = (props: Props) => {
    const { manga, isSelected } = props
    const [imageFailed, setImageFailed] = useState<boolean>(false)
    const [imageLoading, setImageLoading] = useState<boolean>(false)
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)

    const imageSource = manga.thumbnail ? { uri: `${httpAddress}/manga/${manga.id}/thumbnail` } : undefined

    const thumbnailChildren = manga.library
        ? (
            <>
                <Image style={{ width: 20, height: 20, position: "absolute", top: 5, left: 5 }} source={require("../../assets/book.png")} />
                <Image style={{ width: 20, height: 20, position: "absolute", top: 5, right: 5 }} source={{ uri: `${httpAddress}/sources/${manga.source}/icon` }} />
            </>
        )
        : undefined

    const getImage = () => {
        if (imageSource === undefined) {
            return <View style={{ ...mangaViewStyles.imageSize }}>No Thumbnail Found</View>
        }

        if (imageFailed) {
            return (
                <View style={mangaViewStyles.imageSize}>
                    {thumbnailChildren}
                    <Text>Failed to load thumbnail</Text>
                </View>
            )
        }

        return (
            <ImageBackground
                style={mangaViewStyles.imageSize}
                imageStyle={{ borderRadius: 5 }}
                source={imageSource}
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => setImageFailed(true)}
            >
                {thumbnailChildren}
                {imageLoading
                    ? <ActivityIndicator size="large" color="white" />
                    : null
                }
            </ImageBackground>
        )
    }

    return (
        <TouchableOpacity
            style={{
                borderColor: isSelected ? "#0A84FF" : undefined,
                borderWidth: 4,
                borderRadius: 10,
            }}
            activeOpacity={0.8}
            onPress={props.onPress}
            onLongPress={props.onLongPress}
        >
            <View style={mangaViewStyles.container}>
                {getImage()}
                <Text
                    style={{
                        color: "white",
                        paddingHorizontal: 5,
                        paddingVertical: 5,
                        textAlign: "center"
                    }}
                    numberOfLines={2}
                >
                    {manga.title}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

const mangaViewStyles = StyleSheet.create({
    container: { width: 165, height: 270, marginBottom: 5, alignItems: "center", borderRadius: 5 },
    imageSize: { width: 165, height: 240, alignItems: "center", justifyContent: "center" }
})

export default memo(MangaView)