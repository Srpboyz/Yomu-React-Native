import { useEffect, useState } from "react";
import { StaticScreenProps, useNavigation } from "@react-navigation/native";
import { TabBar, TabView } from "react-native-tab-view";
import { useSelector } from "react-redux";
import { ReduxState, Source } from "../../types";
import LatestMangas from "./LatestMangas";
import SearchMangas from "./SearchMangas";
import SourceFilters from "./SourceFilters";

interface Route {
    key: string;
    title: string
}

const routes: Route[] = [
    { key: "latest", title: "Latest" },
    { key: "search", title: "Search" },
    { key: "filters", title: "Filters" },
];


type Props = StaticScreenProps<{ source_id: number }>;


const SourcePage = ({ route }: Props) => {
    const [index, setIndex] = useState(0);
    const source = useSelector((state: ReduxState) => state.sources.find((source) => source.id === route.params.source_id) as Source)
    const navigation = useNavigation()

    useEffect(() => {
        navigation.setOptions({ headerTitle: source.name })
    }, [])

    const renderTabBar = (props: any) => (
        <TabBar
            {...props}
            style={{ backgroundColor: "#000000" }}
            indicatorStyle={{ backgroundColor: "#90CAF9" }}
            activeColor="#90CAF9"
        />
    );

    const renderScene = ({ route }: { route: Route }) => {
        switch (route.key) {
            case "latest":
                return (
                    <LatestMangas
                        key={`source-${source.filters.map((filter => `${filter.value}`)).join("-")}`}
                        source={source}
                    />
                )
            case "search":
                return <SearchMangas source={source} />
            case "filters":
                return <SourceFilters source={source} />
            default:
                return null;
        }
    };

    return (
        <TabView
            navigationState={{ index, routes }}
            renderTabBar={renderTabBar}
            renderScene={renderScene}
            onIndexChange={setIndex}
        />
    )
}

export default SourcePage