import { useEffect, useState, memo } from "react";
import { TextInput } from "react-native";
import { useSelector } from "react-redux";
import MangaList from "../../components/MangaList";
import { Manga, ReduxState, Source } from "../../types";
import { ws, EventType } from "../../websocket";

interface Props {
    source: Source
}

const SearchMangas = ({ source }: Props) => {
    const [mangas, setMangas] = useState<Manga[]>([])
    const [searchText, setSearchText] = useState<string>("")
    const [hasSpinner, setSpinner] = useState<boolean>(false)
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)


    useEffect(() => {
        const events = [EventType.LIBRARY_ADD, EventType.LIBRARY_REMOVE, EventType.MANGA_DETAILS_UPDATE]
        const subscriptions = events.map((eventType) => (
            ws.addListener(eventType, (data) => messageReceived(eventType, data))
        ))
        return () => subscriptions.forEach((subscription) => subscription.remove())
    }, [])


    useEffect(() => searchManga(), [searchText])


    const messageReceived = (eventType: EventType, data: Manga) => {
        setMangas((mangas) =>
            mangas.map((manga) => {
                if (data.id !== manga.id) return manga;

                let updatedManga: Manga | undefined = undefined
                if (eventType === EventType.LIBRARY_ADD && data.id === manga.id) {
                    updatedManga = { ...manga, library: true }
                } else if (eventType === EventType.LIBRARY_REMOVE && data.id === manga.id) {
                    updatedManga = { ...manga, library: false }
                } else if (eventType === EventType.MANGA_DETAILS_UPDATE && data.id === manga.id) {
                    updatedManga = { ...manga, ...data }
                }

                return updatedManga || manga
            })
        )
    }

    const searchManga = () => {
        setMangas([])

        if (searchText === "") {
            return;
        }

        fetch(`${httpAddress}/sources/${source.id}/search/${searchText}`)
            .then(res => res.json().then(mangaList => { setMangas(mangaList.mangas) }))
            .finally(() => setSpinner(false))

        setSpinner(true);
    }

    return (
        <>
            <TextInput
                cursorColor="white"
                placeholderTextColor="white"
                style={{
                    backgroundColor: "#222222",
                    color: "white",
                    height: 40
                }}
                textAlign="center"
                enterKeyHint="search"
                placeholder="Search..."
                onSubmitEditing={(event) => setSearchText(event.nativeEvent.text)}
            />
            <MangaList mangas={mangas} refresh={false} displaySpinner={hasSpinner} />
        </>
    )
}

export default memo(SearchMangas)