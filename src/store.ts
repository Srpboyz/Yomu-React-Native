import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ReaderDirection, ReduxState } from './types';


const initialState: ReduxState = {
    httpAddress: undefined,
    websocketAddress: undefined,
    readerDirection: ReaderDirection.Vertical,
    sources: []
}

const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setHttpAddress: (state, action) => {
            state.httpAddress = action.payload;
            AsyncStorage.setItem("httpAddress", action.payload)
        },
        setWebsocketAddress: (state, action) => {
            const address = action.payload
            state.websocketAddress = action.payload
            AsyncStorage.setItem("websocketAddress", address)
        },
        setReaderDirection: (state, action) => {
            state.readerDirection = action.payload
        },
        setSources: (state, action) => {
            state.sources = action.payload
        },
        updateFilters: (state, action) => {
            const data = action.payload;
            state.sources = state.sources.map(source => {
                if (source.id !== data.id) return source
                return {
                    ...source,
                    filters: source.filters.map((filter) => {
                        return { ...filter, value: data[filter.key] }
                    })
                }
            })
        }
    }
})

export const store = configureStore({
    reducer: settingsSlice.reducer
})

export const { setHttpAddress, setReaderDirection, setSources, setWebsocketAddress, updateFilters } = settingsSlice.actions