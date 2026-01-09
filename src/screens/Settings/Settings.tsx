import { useEffect, useRef } from "react"
import { Text, TextInput, View } from "react-native"
import { SelectList } from 'react-native-dropdown-select-list'
import { useDispatch, useSelector } from "react-redux"
import { setHttpAddress, setReaderDirection } from "../../store"
import { ReaderDirection, ReduxState } from "../../types"

const Settings = () => {
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)
    const readerDirection = useSelector((state: ReduxState) => state.readerDirection)
    const httpRef = useRef<TextInput | null>(null)
    const websocketRef = useRef<TextInput | null>(null)
    const dispatch = useDispatch()

    useEffect(() => httpRef.current?.clear(), [httpAddress])

    const isUrl = (url: string) => {
        try {
            new URL(url)
            return true
        } catch (TypeError) {
            return false
        }
    }

    return (
        <View style={{ flexDirection: "column", padding: 20, gap: 20 }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Text style={{ color: "white", fontSize: 17 }}>Http Address</Text>
                <TextInput
                    ref={httpRef}
                    cursorColor="white"
                    style={{
                        backgroundColor: "#222222",
                        color: "white",
                        height: 40,
                        flex: 1
                    }}
                    placeholderTextColor="white"
                    placeholder={httpAddress || "Ex: http://127.0.0.1:6969"}
                    autoCapitalize="none"
                    enterKeyHint="enter"
                    multiline={false}
                    numberOfLines={1}
                    onSubmitEditing={(event) => {
                        const address = event.nativeEvent.text.trim();
                        dispatch(setHttpAddress(isUrl(address) ? address : undefined))
                    }}
                />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
                <Text style={{ color: "white", fontSize: 17, marginTop: 8 }}>Reader Direction</Text>
                <SelectList
                    inputStyles={{ color: "white" }}
                    dropdownTextStyles={{ color: "white" }}
                    search={false}
                    data={Object.values(ReaderDirection)}
                    placeholder={readerDirection}
                    setSelected={(option: string) => dispatch(setReaderDirection(option as ReaderDirection))}
                />
            </View>
        </View>
    )
}

export default Settings