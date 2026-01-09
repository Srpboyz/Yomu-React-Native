import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { createStaticNavigation, DarkTheme, StaticParamList } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CategoryList from './screens/CategoryList';
import Library from './screens/Library';
import MangaCard from './screens/MangaCard';
import SourceList from './screens/SourceList';
import SourcePage from './screens/SourcePage';
import Reader from './screens/Reader';
import Settings from './screens/Settings/Settings';
import { setHttpAddress, setSources, updateFilters } from './store';
import { ReduxState } from './types';
import { sse, EventType } from "./sse";


const BottomTabs = createBottomTabNavigator({
    screens: {
        Library: {
            screen: Library,
            options: {
                tabBarIcon: ({ focused }) => (
                    <MaterialIcons
                        name="local-library"
                        size={24}
                        color={focused ? "#5A5A5A" : "#444444"}
                    />
                )
            }
        },
        Sources: {
            screen: SourceList,
            options: {
                tabBarIcon: ({ focused }) => (
                    <Ionicons
                        name={focused ? "compass" : "compass-outline"}
                        size={24}
                        color={focused ? "#5A5A5A" : "#444444"}
                    />
                )
            }
        },
        Settings: {
            screen: Settings,
            options: {
                tabBarIcon: ({ focused }) => (
                    <Ionicons
                        name={focused ? "settings" : "settings-outline"}
                        size={24}
                        color={focused ? "#5A5A5A" : "#444444"}
                    />
                )
            }
        }
    }
});

const Stack = createNativeStackNavigator({
    screens: {
        Tabs: {
            screen: BottomTabs,
            options: { headerShown: false }
        },
        CategoryList: CategoryList,
        MangaCard: MangaCard,
        SourcePage: SourcePage,
        Reader: Reader,
    }
})

const Navigation = createStaticNavigation(Stack)


export default function App() {
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)
    const dispatch = useDispatch()

    useEffect(() => {
        AsyncStorage.getItem("httpAddress").then(value => {
            if (value !== null) {
                dispatch(setHttpAddress(value))
            }
        })

        sse.addListener(EventType.SOURCE_FILTERS_UPDATED, messageReceived)
    }, [])

    useEffect(() => {
        if (httpAddress !== undefined) {
            fetch(`${httpAddress}/sources`)
                .then(res => res.json().then((sources) => dispatch(setSources(sources))))
            sse.changeUrl(`${httpAddress}/sse`)
        } else {
            dispatch(setSources([]))
            sse.changeUrl(undefined)
        }
    }, [httpAddress])

    const messageReceived = (data: any) => dispatch(updateFilters(data))

    return (
        <>
            <Navigation theme={DarkTheme} />
            <StatusBar translucent backgroundColor={"#00000000"} />
        </>
    );
}

type StackParamsList = StaticParamList<typeof Stack>;

declare global {
    namespace ReactNavigation {
        interface RootParamList extends StackParamsList { }
    }
}