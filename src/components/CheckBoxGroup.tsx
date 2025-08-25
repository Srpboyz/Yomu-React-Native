import { AdvancedCheckbox } from 'react-native-advanced-checkbox';
import { Text, View } from "react-native";

interface Props {
    title: string;
    options: string[];
    values: string[]
    disabled: boolean;
    onValueChanged(values: string[]): void
}

const CheckBoxGroup = (props: Props) => {
    const { title, options, values, disabled } = props

    const valuedChanged = (key: string, value: boolean) => {
        const newValues = !value ? values.filter((v) => v !== key) : [...values, key];
        props.onValueChanged(newValues)
    }

    return (
        <View>
            <Text style={{ color: "white", fontSize: 17, fontWeight: "bold" }}>{title}</Text>
            {options.map((option, index) => {
                return (
                    <AdvancedCheckbox
                        key={`${title}/${option}/${index}`}
                        label={(option[0].toUpperCase() + option.substring(1).toLowerCase()).replace("_", " ")}
                        labelStyle={{ color: "white" }}
                        disabled={disabled}
                        value={values.includes(option)}
                        onValueChange={(changed) => valuedChanged(option, changed as boolean)}
                    />
                )
            })}
        </View>
    )
}

export default CheckBoxGroup