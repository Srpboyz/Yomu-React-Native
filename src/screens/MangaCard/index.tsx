import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { StaticScreenProps, useNavigation } from '@react-navigation/native';
import { Image } from "expo-image";
import { useSelector } from "react-redux";
import ImageButton from "../../components/ImageButton";
import { Chapter, Manga, ReduxState } from "../../types";
import { sse, EventType } from "../../sse";
import ChapterView from "./ChapterView";


type Props = StaticScreenProps<{ manga: Manga }>;


const MangaCard = ({ route }: Props) => {
    const [manga, setManga] = useState<Manga>(route.params.manga);
    const [chapters, setChapters] = useState<Chapter[]>([])
    const [selectedChapters, setSelectedChapters] = useState<Chapter[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [flipped, setFlipped] = useState<boolean>(false);
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)
    const navigation = useNavigation()

    useEffect(() => {
        const events = [
            EventType.LIBRARY_ADD,
            EventType.LIBRARY_REMOVE,
            EventType.MANGA_DETAILS_UPDATE,
            EventType.CHAPTER_LIST_UPDATE,
            EventType.CHAPTER_READ_STATUS_CHANGED
        ]

        const subscriptions = events.map((eventType) => (
            sse.addListener(eventType, (data) => messageReceived(eventType, data))
        ))

        !manga.initialized ? updateManga() : fetchChapters()
        return () => subscriptions.forEach((subscription) => subscription.remove())
    }, [])

    useEffect(() => {
        const options = manga !== undefined
            ? {
                headerTitle: manga.title,
                headerRight: () => {
                    const hasUnread = selectedChapters.some((chapter) => !chapter.read)
                    const hasRead = selectedChapters.some((chapter) => chapter.read)

                    return (
                        <View style={{ flexDirection: "row" }}>
                            <ImageButton
                                styles={{ display: hasUnread ? undefined : "none", marginRight: 15 }}
                                source={require("../../../assets/read.png")}
                                onPress={() => { markChaptersAsRead(selectedChapters) }}
                            />
                            <ImageButton
                                styles={{ display: hasRead ? undefined : "none", marginRight: 15 }}
                                source={require("../../../assets/unread.png")}
                                onPress={() => { markChaptersAsUnread(selectedChapters) }}
                            />
                            <ImageButton
                                source={manga.library ? require("../../../assets/minus.png") : require("../../../assets/plus.png")}
                                onPress={manga.library ? removeFromLibrary : addToLibrary}
                            />
                        </View>
                    )
                }
            }
            : { headerTitle: "MangaCard", headerRight: undefined }

        navigation.setOptions({ ...options });
    }, [navigation, manga, selectedChapters]);


    const addToLibrary = () => fetch(`${httpAddress}/library/${manga.id}`, { method: "POST" })
    const removeFromLibrary = () => fetch(`${httpAddress}/library/${manga.id}`, { method: "DELETE" })
    const updateManga = () => {
        fetch(`${httpAddress}/manga/${manga.id}/update`, { method: "POST" })
        setRefreshing(true)
        setTimeout(() => setRefreshing(false), 5000)
    }
    const fetchChapters = () => {
        fetch(`${httpAddress}/manga/${manga.id}/chapters`)
            .then(res => res.json().then(chapters => { setChapters(chapters); setRefreshing(false) }))
    }

    const messageReceived = (eventType: EventType, data: { id: number }) => {
        setRefreshing(false)

        if (eventType === EventType.CHAPTER_LIST_UPDATE) return fetchChapters();

        if (eventType === EventType.CHAPTER_READ_STATUS_CHANGED) {
            setChapters((chapters) =>
                chapters.map(chapter => {
                    if (chapter.id !== data.id) return chapter;
                    return { ...chapter, read: !chapter.read }
                })
            )
            setRefreshing(false)
        }

        if (data.id !== manga.id) return;

        if (eventType === EventType.LIBRARY_ADD && data.id === manga.id) {
            setManga(manga => { return { ...manga, library: true } })
            setRefreshing(false)
        } else if (eventType === EventType.LIBRARY_REMOVE && data.id === manga.id) {
            setManga(manga => { return { ...manga, library: false } })
            setRefreshing(false)
        } else if (eventType === EventType.MANGA_DETAILS_UPDATE && data.id === manga.id) {
            setManga(manga => { return { ...manga, ...data } })
            setRefreshing(false)
        }
    }

    const markChaptersAsRead = (chapters: Chapter[]) => {
        chapters.filter((chapter) => !chapter.read).forEach((chapter) => { fetch(`${httpAddress}/chapter/${chapter.id}/read`, { method: "POST" }) })
        setSelectedChapters([])
    }

    const markChaptersAsUnread = (chapters: Chapter[]) => {
        chapters.filter((chapter) => chapter.read).forEach((chapter) => { fetch(`${httpAddress}/chapter/${chapter.id}/unread`, { method: "POST" }) })
        setSelectedChapters([])
    }

    return (
        <View style={{ height: "100%" }}>
            <ScrollView
                style={{ paddingHorizontal: 18 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={updateManga} />}
            >
                <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
                        <Image
                            style={{ display: "flex", borderRadius: 5, alignItems: "center", width: 120, height: 175 }}
                            source={{ uri: `${httpAddress}/manga/${manga.id}/thumbnail` }}
                            priority="high"
                        />
                        <View style={{ "flex": 1 }}>
                            <Text style={{ ...mangaCardStyles.text, fontSize: 20 }}>{manga.title}</Text>
                            <Text style={{ ...mangaCardStyles.text, fontSize: 13 }}>Author: {manga.author || "None"}</Text>
                            <Text style={{ ...mangaCardStyles.text, fontSize: 13 }}>Artist: {manga.artist || "None"}</Text>
                        </View>
                    </View>
                    <Text style={{ ...mangaCardStyles.text, fontSize: 16, fontWeight: "bold" }}>Description</Text>
                    <Text style={{ ...mangaCardStyles.text, fontSize: 14 }}>{manga.description}</Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ ...mangaCardStyles.text, fontSize: 16, fontWeight: "bold" }}>
                            {chapters.length} Chapter(s)
                        </Text>
                        <ImageButton
                            imageStyles={{ width: 23, height: 23 }}
                            source={require("../../../assets/flip.png")}
                            onPress={() => setFlipped((flipped) => !flipped)}
                        />
                    </View>
                    <View style={{ flexDirection: `column${!flipped ? "-reverse" : ""}` }}>
                        {chapters.map((chapter, index) =>
                            <ChapterView
                                key={index}
                                chapter={chapter}
                                isSelected={selectedChapters.includes(chapter)}
                                onPress={() => {
                                    if (selectedChapters.length > 0) {
                                        if (!selectedChapters.includes(chapter)) {
                                            setSelectedChapters((selectedChapters) => [...selectedChapters, chapter])
                                        } else {
                                            setSelectedChapters((selectedChapters) => selectedChapters.filter((c => c.id !== chapter.id)))
                                        }
                                    } else {
                                        navigation.navigate("Reader", { chapters: chapters, currentChapterIndex: index })
                                    }
                                }}
                                onLongPress={() => {
                                    if (!selectedChapters.includes(chapter)) {
                                        setSelectedChapters((selectedChapters) => [...selectedChapters, chapter])
                                    } else {
                                        setSelectedChapters((selectedChapters) => selectedChapters.filter((c => c.id !== chapter.id)))
                                    }
                                }}
                            />
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}

const mangaCardStyles = StyleSheet.create({
    text: { color: "white", flexWrap: "wrap" }
})


export default MangaCard