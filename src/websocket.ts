import { AppState, NativeEventEmitter } from 'react-native';

class YomuWebsocket extends NativeEventEmitter {
    private url: string | undefined
    private ws: WebSocket | null
    private attempts: number

    constructor() {
        super();

        this.url = undefined;
        this.ws = null;
        this.attempts = 0;

        AppState.addEventListener("change", (state) => {
            if (state !== "active") {
                this.ws?.close()
                this.ws = null
            } else {
                this.createWebSocket()
            }
        })
    }

    private createWebSocket() {
        if (this.url === undefined || this.attempts >= 3) return;
        this.attempts++;

        this.ws = new WebSocket(this.url)
        this.ws.onopen = () => { this.attempts = 0 }
        this.ws.onmessage = (event) => {
            const message: { type: string, data: any } = JSON.parse(event.data)
            this.emit(message.type, message.data)
        }
        this.ws.onerror = () => {
            if (AppState.currentState === "active") { this.createWebSocket() }
        }
    }

    public changeUrl(url?: string) {
        this.url = url;
        this.ws?.close();
        this.attempts = 0;
        this.createWebSocket();
    }
}

export const ws = new YomuWebsocket();

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