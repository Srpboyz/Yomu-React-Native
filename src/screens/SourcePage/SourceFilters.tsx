import React, { memo, useEffect, useState } from "react"
import { View } from "react-native";
import { AdvancedCheckbox } from 'react-native-advanced-checkbox';
import { useSelector } from "react-redux";
import CheckBoxGroup from "../../components/CheckBoxGroup";
import { ReduxState, Source } from "../../types"


interface Props {
    source: Source
}

const SourceFilters = ({ source }: Props) => {
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)
    const [checkboxDisabled, setCheckboxDisabled] = useState<boolean>(false)
    const filters = source.filters

    useEffect(() => setCheckboxDisabled(false), [source.filters])

    const updateFilters = (key: string, value: any) => {
        const newFilters = filters.map(filter => {
            if (key !== filter.key) return filter
            return { ...filter, value: value }
        })

        fetch(`${httpAddress}/sources/${source.id}/filters`, {
            method: "POST",
            body: JSON.stringify(newFilters)
        })

        setCheckboxDisabled(true)
    }

    const getFilters = () => {
        if (!source.has_filters) return null;

        return (
            filters.map(filter => {
                if (filter.type === "CHECKBOX") {
                    return (
                        <AdvancedCheckbox
                            key={filter.key}
                            label={filter.display_name}
                            labelStyle={{ color: "white" }}
                            value={filter.value}
                            onValueChange={checked => updateFilters(filter.key, checked)}
                            disabled={checkboxDisabled}
                        />
                    )
                }
                if (filter.type === "LIST") {
                    return (
                        <CheckBoxGroup
                            key={filter.key}
                            title={filter.display_name}
                            values={filter.value}
                            options={filter.options}
                            disabled={checkboxDisabled}
                            onValueChanged={(selectedValues) => updateFilters(filter.key, selectedValues)}
                        />
                    )
                }
            })
        )
    }

    return (
        <View style={{ marginHorizontal: 15, marginTop: 10 }}>
            {getFilters()}
        </View>
    )
}

export default memo(SourceFilters)