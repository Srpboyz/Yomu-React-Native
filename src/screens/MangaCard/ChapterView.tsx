import { memo } from "react";
import { StyleSheet, Text } from "react-native"
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { Chapter } from "../../types"

interface Props {
    chapter: Chapter
    isSelected: boolean;
    onPress(): void;
    onLongPress(): void;
}

const ChapterView = (props: Props) => {
    const { chapter, isSelected } = props
    const readStyles = chapter.read ? chapterViewStyles.read : {}

    return (
        <GestureHandlerRootView>
            <TouchableOpacity
                style={{ backgroundColor: isSelected ? "#333333" : undefined, paddingHorizontal: 5, borderRadius: 5 }}
                activeOpacity={0.5}
                onPress={props.onPress}
                onLongPress={() => { props.onLongPress() }}
                delayLongPress={500}
            >
                <Text style={{ ...chapterViewStyles.text, ...readStyles, fontSize: 14 }}>{chapter.title}</Text>
                <Text style={{ ...chapterViewStyles.text, ...readStyles, fontSize: 12 }}>{new Date(chapter.uploaded * 1000).toLocaleDateString()}</Text>
            </TouchableOpacity>
        </GestureHandlerRootView>
    )
}

const chapterViewStyles = StyleSheet.create({
    text: { color: "white", flexWrap: "wrap", paddingVertical: 3 },
    read: { color: "grey" }
})

export default memo(ChapterView)