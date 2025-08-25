import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Modal, Text, TextInput, View } from "react-native"
import { useSelector } from "react-redux"
import { useNavigation } from "@react-navigation/native"
import ImageButton from "../../components/ImageButton"
import { Category, ReduxState } from "../../types"

const CategoryList = () => {
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setLoading] = useState<boolean>(true)
    const [modalVisible, setModalVisible] = useState<boolean>(false)
    const [text, setText] = useState<string>("")
    const httpAddress = useSelector((state: ReduxState) => state.httpAddress)
    const navigation = useNavigation()
    const ref = useRef<TextInput | null>(null)

    useEffect(() => {
        navigation.setOptions({ headerTitle: "Categories" })
        fetch(`${httpAddress}/category`)
            .then((res) => res.json().then((categories) => {
                navigation.setOptions({
                    headerTitle: "Categories",
                    headerRight: () => {
                        return (
                            <ImageButton
                                source={require("../../../assets/plus.png")}
                                onPress={() => setModalVisible(true)}
                            />
                        )
                    }
                })
                setCategories(categories)
            }))
            .catch(() => setCategories([]))
            .finally(() => setLoading(false))
    }, [])


    const createCategory = (name: string) => {
        fetch(`${httpAddress}/category/create/${name}`, { method: "POST" })
            .then((res) => res.json().then(category => setCategories((categories) => [...categories, category])))
    }

    const removeCategory = (category_id: number) => {
        fetch(`${httpAddress}/category/${category_id}`, { method: "DELETE" })
            .then(() => setCategories((categories) => categories.filter(category => category.id !== category_id)))
    }


    if (isLoading) {
        return (
            <View style={{ width: "100%", height: "100%" }}>
                <ActivityIndicator size="large" color="white" />
            </View>
        )
    }

    return (
        <View style={{ flexDirection: "column", width: "100%", height: "100%" }}>
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
                            <Text style={{ color: "white", fontSize: 20 }}>Create Category</Text>
                            <TextInput
                                ref={ref}
                                cursorColor="white"
                                placeholderTextColor="white"
                                style={{
                                    backgroundColor: "#222222",
                                    borderRadius: 10,
                                    color: "white",
                                    height: 40,
                                }}
                                onChangeText={setText}
                                placeholder="Enter Name"
                            />
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                            <Text
                                style={{ color: "#0A84FF", fontSize: 19 }}
                                onPress={() => {
                                    ref.current?.clear()
                                    setModalVisible(false)
                                }}
                            >
                                Cancel
                            </Text>
                            <Text
                                style={{ color: "#0A84FF", fontSize: 19 }}
                                onPress={() => {
                                    createCategory(text)
                                    ref.current?.clear()
                                    setModalVisible(false)
                                }}
                            >
                                Create
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
            {categories?.map((category) => {
                return (
                    <View
                        key={`category-item-${category.id}`}
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            padding: 10
                        }}
                    >
                        <Text style={{ color: "white", fontSize: 15 }}>{category.name}</Text>
                        <ImageButton
                            source={require("../../../assets/minus.png")}
                            onPress={() => removeCategory(category.id)}
                        />
                    </View>
                )
            })}
        </View>
    )
}

export default CategoryList