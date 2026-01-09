import { useEffect, useState, memo } from "react";
import { Alert } from "react-native";
import { useSelector } from "react-redux";
import MangaList from "../../components/MangaList";
import { Manga, ReduxState, Source } from "../../types";
import { sse, EventType } from "../../sse";

interface Props {
    source: Source
}

const LatestMangas = ({ source }: Props) => {
    const [mangas, setMangas] = useState<Manga[]>([])
    const [page, setPage] = useState<number>(1)
    const [canLoadMore, setCanLoadMore] = useState<boolean>(true)
    const [refresh, setRefresh] = useState<boolean>(false)
    const [isLoading, setLoading] = useState<boolean>(false)
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)


    useEffect(() => {
        const events = [EventType.LIBRARY_ADD, EventType.LIBRARY_REMOVE, EventType.MANGA_DETAILS_UPDATE]
        const subscriptions = events.map((eventType) => (
            sse.addListener(eventType, (data) => messageReceived(eventType, data))
        ))
        return () => subscriptions.forEach((subscription) => subscription.remove())
    }, [])


    useEffect(() => fetchLatest(), [page])


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

    const fetchLatest = () => {
        if (!canLoadMore || isLoading) return;
        fetch(`${httpAddress}/sources/${source.id}/latest/${page}`)
            .then(res => res.json().then(mangaList => {
                setMangas(currentMangas => currentMangas.concat(mangaList.mangas));
                setCanLoadMore(mangaList.has_next_page);

            }))
            .catch((_e) => {
                setMangas(currentMangas => {
                    if (currentMangas.length === 0) {
                        Alert.alert(source.name, "Failed To load page", [{ "text": "Ok" }])
                        return [];
                    }

                    return currentMangas;
                });
                setCanLoadMore(false);
            })
            .finally(() => {
                setRefresh(false)
                setLoading(false)
            })
        setLoading(true)
    }

    const reset = () => {
        setRefresh(true)
        setMangas([])
        setCanLoadMore(true)
        if (page !== 1) return setPage(1);
        fetchLatest();
    }

    return (
        <MangaList
            mangas={mangas}
            refresh={refresh}
            onRefresh={reset}
            onEndReached={() => { if (mangas.length !== 0) setPage(page + 1) }}
            displaySpinner={canLoadMore && !refresh}
        />
    )
}

export default memo(LatestMangas)