import { ActivityIndicator, FlatList } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { Manga } from "../types";
import MangaView from "./MangaView";

interface Props {
    mangas: Manga[]
    refresh: boolean;
    displaySpinner: boolean;
    onRefresh?: (() => void)
    onEndReached?: (() => void)
}

const MangaList = (props: Props) => {
    const { mangas, refresh, displaySpinner } = props
    const navigation = useNavigation()

    return (
        <FlatList
            refreshing={refresh}
            onRefresh={props.onRefresh}
            contentContainerStyle={{ alignItems: "center", justifyContent: "center", gap: 5, paddingBottom: 10 }}
            columnWrapperStyle={{ gap: 10 }}
            numColumns={2}
            data={mangas}
            renderItem={({ item, index }) => (
                <MangaView
                    key={`manga-${item.id}-${index}`}
                    manga={item}
                    isSelected={false}
                    onPress={() => { navigation.navigate("MangaCard", { manga: { ...item } }) }}
                />
            )}
            onEndReached={props.onEndReached}
            ListFooterComponent={displaySpinner ? <ActivityIndicator size="large" color="white" /> : null}
        />
    )
}

export default MangaList