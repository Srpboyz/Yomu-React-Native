import React, { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Text, TextInput, View } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { Route, TabBar, TabView } from "react-native-tab-view";
import { AdvancedCheckbox } from "react-native-advanced-checkbox";
import { useSelector } from "react-redux";
import ImageButton from "../../components/ImageButton";
import MangaView from "../../components/MangaView";
import { Category, Manga, ReduxState } from "../../types";
import { ws, EventType } from "../../websocket";

const Library = () => {
    const [mangas, setMangas] = useState<Manga[]>([])
    const [filteredMangas, setFilteredMangas] = useState<Manga[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedMangas, setSelectedMangas] = useState<Manga[]>([])
    const [categoryIndex, setCategoryIndex] = useState(0);
    const [isSearching, setSearching] = useState<boolean>(false)
    const [modalVisible, setModalVisible] = useState<boolean>(false)
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)
    const navigation = useNavigation()
    const ref = useRef<TextInput | null>(null)

    const routes: Route[] = [{ key: "all", title: "All" }].concat(categories.map((category) => {
        return { key: category.id.toString(), title: category.name }
    }))

    useEffect(() => {
        const events = [
            EventType.LIBRARY_ADD,
            EventType.LIBRARY_REMOVE,
            EventType.CATEGORY_CREATED,
            EventType.CATEGORY_DELETED,
            EventType.CATEGORY_MANGA_ADDED,
            EventType.CATEGORY_MANGA_REMOVED,
            EventType.MANGA_DETAILS_UPDATE,
        ]
        events.forEach((eventType) => {
            ws.addListener(eventType, (data: Manga) => messageReceived(eventType, data))
        })
    }, [])

    useEffect(() => {
        if (httpAddress !== undefined) {
            fetch(`${httpAddress}/library`).then(res => res.json().then(setMangas))
            fetch(`${httpAddress}/category`).then(res => res.json().then((categories: Category[]) =>
                setCategories(categories.map(category => {
                    fetch(`${httpAddress}/category/${category.id}/mangas`).then(res => res.json().then((mangas: Manga[]) =>
                        setCategories(currentCategories => currentCategories.map((c => {
                            if (c.id !== category.id) return c;
                            return { ...c, mangas: mangas }
                        })))
                    ))
                    return { ...category, mangas: [] }
                }))
            ))
        } else {
            setCategories([])
            setMangas([])
            setFilteredMangas([])
            setSearching(false)
        }
    }, [httpAddress])

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => {
                const length = selectedMangas.length

                return (
                    <View style={{ flexDirection: "row" }}>
                        <ImageButton
                            styles={{ display: length > 0 ? undefined : "none", marginRight: 15 }}
                            source={require("../../../assets/trash.png")}
                            onPress={() => {
                                setSelectedMangas((mangas) => {
                                    if (categoryIndex > 0) {
                                        const category = categories[categoryIndex - 1]
                                        mangas.forEach(manga => {
                                            fetch(`${httpAddress}/category/${category.id}/manga/${manga.id}`, {
                                                method: "DELETE"
                                            })
                                        })
                                    } else {
                                        mangas.forEach(manga => {
                                            fetch(`${httpAddress}/library/${manga.id}`, { method: "DELETE" })
                                        })
                                    }
                                    return []
                                })
                            }}
                        />
                        <ImageButton
                            styles={{ marginRight: 15 }}
                            source={require("../../../assets/categories.png")}
                            onPress={() => {
                                if (length > 0 && categories.length > 0) {
                                    setModalVisible(true)
                                } else {
                                    navigation.navigate("CategoryList")
                                }
                            }}
                        />
                        <ImageButton
                            styles={{ marginRight: 15 }}
                            source={require("../../../assets/search.png")}
                            onPress={() => {
                                setSearching((isSearching) => {
                                    if (isSearching) ref.current?.clear()
                                    setFilteredMangas([])
                                    return !isSearching
                                })
                            }}
                        />
                    </View>
                )
            }
        })
    }, [selectedMangas])


    const messageReceived = (eventType: EventType, data: any) => {
        if (eventType === EventType.LIBRARY_ADD) {
            setMangas((mangas) => [...mangas, data].sort((a, b) => a.id - b.id))
            return;
        }

        if (eventType === EventType.LIBRARY_REMOVE) {
            setMangas((mangas) => mangas.filter((manga) => manga.id !== data.id))
            setFilteredMangas((mangas) => mangas.filter((manga) => manga.id !== data.id))
            return
        }

        if (eventType === EventType.CATEGORY_CREATED) {
            setCategories((categories) => [...categories, { ...data, mangas: [] }])
            return
        }

        if (eventType === EventType.CATEGORY_DELETED) {
            setCategories((categories) => categories.filter((category) => category.id !== data.id))
            return
        }

        if (eventType === EventType.CATEGORY_MANGA_ADDED) {
            setCategories((categories) => categories.map((category) => {
                if (category.id !== data.category_id) return category
                return {
                    ...category,
                    mangas: [...category.mangas, data.manga].sort((a, b) => a.id - b.id)
                }
            }))
            return
        }

        if (eventType === EventType.CATEGORY_MANGA_REMOVED) {
            setCategories((categories) => categories.map((category) => {
                if (category.id !== data.category_id) return category
                return { ...category, mangas: category.mangas.filter(manga => manga.id != data.manga_id) }
            }))
            return
        }

        if (eventType === EventType.MANGA_DETAILS_UPDATE) {
            setMangas((mangas) => mangas.map((manga) => {
                if (manga.id !== data.id) return manga
                return { ...manga, ...data }
            }))
        }
    }

    const updateFilteredMangas = (text: string, mangas: Manga[]) => {
        text = text.toLowerCase()
        setFilteredMangas(
            text.length > 0
                ? mangas.filter(manga => manga.title.toLowerCase().includes(text))
                : []
        )
    }

    const renderTabBar = (props: any, showTabBar: boolean) => (
        <TabBar
            {...props}
            style={{ backgroundColor: "#000000", display: !showTabBar ? "none" : undefined }}
            indicatorStyle={{ backgroundColor: "#90CAF9" }}
            activeColor="#90CAF9"
            onTabPress={() =>
                setSearching(() => {
                    ref.current?.clear()
                    setFilteredMangas([])
                    return false
                })
            }
        />
    );

    const renderScene = (mangas: Manga[]) => {
        return (
            <>
                <TextInput
                    ref={ref}
                    cursorColor="white"
                    placeholderTextColor="white"
                    style={{
                        display: !isSearching ? "none" : undefined,
                        backgroundColor: "#222222",
                        color: "white",
                        height: 40
                    }}
                    textAlign="center"
                    enterKeyHint="search"
                    placeholder="Search..."
                    onChangeText={(text: string) => updateFilteredMangas(text, mangas)}
                />
                <FlatList
                    contentContainerStyle={{ alignItems: "center", justifyContent: "center", gap: 5, paddingBottom: 10 }}
                    columnWrapperStyle={{ gap: 10 }}
                    numColumns={2}
                    data={mangas}
                    renderItem={({ item }) => {
                        return (
                            <MangaView
                                key={`library-manga-${item.id}`}
                                manga={item}
                                isSelected={selectedMangas.includes(item)}
                                onPress={() => {
                                    if (selectedMangas.length > 0) {
                                        setSelectedMangas(selectedMangas => {
                                            if (!selectedMangas.includes(item)) {
                                                return [...selectedMangas, item]
                                            }
                                            return selectedMangas.filter(manga => manga.id !== item.id)
                                        })
                                    } else {
                                        navigation.navigate("MangaCard", { manga: { ...item } })
                                    }
                                }}
                                onLongPress={() => {
                                    setSelectedMangas(selectedMangas => {
                                        if (!selectedMangas.includes(item)) {
                                            return [...selectedMangas, item]
                                        }
                                        return selectedMangas.filter(manga => manga.id !== item.id)
                                    })
                                }}
                            />
                        )
                    }}
                />
            </>
        )
    };

    return (
        <>
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
            >
                <View
                    style={{
                        display: "flex",
                        backgroundColor: "#12121266",
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <View
                        style={{
                            backgroundColor: "#121212",
                            borderRadius: 20,
                            padding: 20,
                            width: "75%",
                            height: 170,
                            justifyContent: "space-between"
                        }}
                    >
                        <View style={{ gap: 10 }}>
                            <Text style={{ color: "white", fontSize: 20 }}>Set Category</Text>
                            <View>
                                {categories.map((category => {
                                    return (
                                        <AdvancedCheckbox
                                            key={`modal-category-${category.id}`}
                                            label={category.name}
                                            labelStyle={{ color: "white" }}
                                            value={selectedMangas.every(manga =>
                                                category.mangas.find(categoryManga => categoryManga.id === manga.id)
                                            )}
                                            onValueChange={(checked) => {
                                                const mangas = checked
                                                    ? selectedMangas.filter(manga =>
                                                        !category.mangas.some(categoryManga =>
                                                            categoryManga.id === manga.id
                                                        )
                                                    )
                                                    : selectedMangas

                                                const method = checked ? "POST" : "DELETE"
                                                mangas.forEach(manga => {
                                                    fetch(`${httpAddress}/category/${category.id}/manga/${manga.id}`, {
                                                        method: method
                                                    })
                                                })
                                            }}
                                        />
                                    )
                                }))}
                            </View>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                            <Text
                                style={{ color: "#0A84FF", fontSize: 19 }}
                                onPress={() => {
                                    setSelectedMangas([])
                                    setModalVisible(false)
                                }}
                            >
                                Done
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
            <TabView
                navigationState={{ index: categoryIndex, routes: routes }}
                renderTabBar={(props) => renderTabBar(props, categories.length > 0)}
                renderScene={({ route }) => {
                    if (isSearching && filteredMangas.length > 0) {
                        return renderScene(filteredMangas)
                    }

                    if (route.key === "all") {
                        return renderScene(mangas)
                    }

                    const category = categories.find((c => c.id === parseInt(route.key)))
                    const categoryMangas = category !== undefined ? category.mangas : []

                    return renderScene(categoryMangas)
                }}
                onIndexChange={setCategoryIndex}
            />
        </>
    )
}

export default Library;