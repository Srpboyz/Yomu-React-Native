import { AppState, NativeEventEmitter } from 'react-native';
import EventSource from "react-native-sse";


class YomuSSE extends NativeEventEmitter {
    private url: string | undefined
    private sse: EventSource | null
    private attempts: number

    constructor() {
        super();

        this.url = undefined;
        this.attempts = 0;
        this.sse = null

        AppState.addEventListener("change", (state) => {
            if (state !== "active") {
                this.sse?.close()
                this.sse = null
            } else {
                this.createSSEClient()
            }
        })
    }

    private createSSEClient() {
        if (this.url === undefined || this.attempts >= 3) return;
        this.attempts++;

        this.sse = new EventSource(this.url)
        this.sse.addEventListener("open", (e) => { this.attempts = 0 })
        this.sse.addEventListener("message", (event) => {
            if (event.data === null) return;
            const message: { type: string, data: any } = JSON.parse(event.data)
            this.emit(message.type, message.data)
        })
        this.sse.addEventListener("error", (e) => {
            if (AppState.currentState === "active") { this.createSSEClient() }
        })
    }

    public changeUrl(url?: string) {
        this.url = url;
        this.attempts = 0;
        this.createSSEClient();
    }
}

export const sse = new YomuSSE();

export enum EventType {
    SOURCE_FILTERS_UPDATED = "SOURCE_FILTERS_UPDATED",

    LIBRARY_ADD = "LIBRARY_ADD",
    LIBRARY_REMOVE = "LIBRARY_REMOVE",

    CATEGORY_CREATED = "CATEGORY_CREATED",
    CATEGORY_DELETED = "CATEGORY_DELETED",
    CATEGORY_MANGA_ADDED = "CATEGORY_MANGA_ADDED",
    CATEGORY_MANGA_REMOVED = "CATEGORY_MANGA_REMOVED",

    MANGA_DETAILS_UPDATE = "MANGA_DETAILS_UPDATE",
    CHAPTER_LIST_UPDATE = "CHAPTER_LIST_UPDATE",
    CHAPTER_READ_STATUS_CHANGED = "CHAPTER_READ_STATUS_CHANGED",

}