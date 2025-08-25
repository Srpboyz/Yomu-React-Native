import React from "react";
import { FlatList } from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from '@react-navigation/native';
import { ReduxState } from "../../types";
import SourceView from "./SourceView";


const SourceList = () => {
    const sources = useSelector((state: ReduxState) => state.sources)
    const navigation = useNavigation()


    return (
        <FlatList
            data={sources}
            renderItem={({ item, index }) =>
                <SourceView key={index} source={item} onPress={() => { navigation.navigate("SourcePage", { source_id: item.id }) }} />
            }
        />
    )
}

export default SourceList