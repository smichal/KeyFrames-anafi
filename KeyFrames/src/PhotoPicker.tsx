import React from "react";

import Icon from 'react-native-vector-icons/Ionicons'
import { View, Modal, FlatList, Image, Text, SafeAreaView, Button, NativeModules } from "react-native";
import { human, iOSColors, systemWeights } from 'react-native-typography'
import { TouchableOpacity, ScrollView } from "react-native-gesture-handler";
import { without, concat, range, isString } from "lodash";
import usePromise from 'react-promise';

interface Props {
  //images: string[];
  //dronePhotosCount: number;
  data: any[];
  visible: boolean;
  onDone(images: string[]): void;
  loadMore(): void;
}

const Img = ({ img, selected }) => {
  console.log("img", img)
  if (isString(img)) {
    return <Image
      source={{ uri: img }}
      style={{
        aspectRatio: 16 / 9,
        opacity: selected ? 1 : 0.8,
      }}
    />
  } else {
    const { value, loading } = usePromise<string>(img[1])
    if (loading) return <View style={{ aspectRatio: 16 / 9, backgroundColor: "f9f9f9f9" }} />
    //console.log("value", value)
    return <Image
      source={{ uri: 'data:image/jpeg;base64,' + value }}
      style={{
        aspectRatio: 16 / 9,
        opacity: selected ? 1 : 0.8,
      }}
    />
  }
}

export default class PhotoPicker extends React.Component<Props> {
  state: {
    selected: string[],
  } = {
      selected: []
    }

  render() {
    return <View>
      <Modal
        visible={!!this.props.visible}
        animationType="slide"
        transparent={true}
        supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
      >
        <View
          style={{
            backgroundColor: iOSColors.white,
            flex: 1,
            borderRadius: 6,
            shadowColor: "black",
            shadowOpacity: 0.2,
            shadowRadius: 16
          }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginHorizontal: 8,
              marginBottom: 8,
            }}>
              <Button
                title="Cancel"
                onPress={() => this.props.onDone([])}
              />
              <Text style={human.headline}>Select keyframes</Text>
              <Button
                title="Done"
                onPress={() => this.props.onDone(this.state.selected)}
              />
            </View>

            <FlatList
              style={{ flex: 1, marginHorizontal: -1 }}
              data={this.props.data}
              keyExtractor={(item, index) => "" + item}
              renderItem={({ item }) => {
                const selected = this.state.selected.includes(item)
                return <View style={{ width: '33.33%', alignItems: 'stretch' }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (selected) {
                        this.setState({ selected: without(this.state.selected, item) })
                      } else {
                        this.setState({ selected: this.state.selected.concat([item]) })
                      }
                    }}>
                    <View style={{ flex: 1, margin: 1, }}>
                      <Img
                        img={item}
                        selected={selected}
                      />
                      <Icon
                        name={selected ? "ios-radio-button-on" : "ios-radio-button-off"}
                        size={30}
                        color={iOSColors.white}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          opacity: 0.95,
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              }}
              numColumns={3}
              columnWrapperStyle={{ justifyContent: 'flex-start' }}
              onEndReached={this.props.loadMore}
            />

          </SafeAreaView>
        </View>
      </Modal>
    </View>;
  }
}
