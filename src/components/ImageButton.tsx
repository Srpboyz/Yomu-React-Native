import { Image, ImageSourcePropType, ImageStyle, TouchableOpacity, ViewStyle } from "react-native"

interface Props {
    source?: ImageSourcePropType;
    styles?: ViewStyle
    imageStyles?: ImageStyle
    onPress(): void
}

const ImageButton = (props: Props) => {
    const imageStyles = props.imageStyles || {}
    const styles = props.styles || {}

    return (
        <TouchableOpacity style={styles} activeOpacity={0} onPressOut={props.onPress}>
            <Image style={{ width: 20, height: 20, ...imageStyles }} source={props.source} />
        </TouchableOpacity>
    )
}

export default ImageButton