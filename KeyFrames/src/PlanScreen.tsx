import React from 'react';
import { View, Button, ActionSheetIOS, ScrollView, Image, CameraRoll, NativeModules, Modal, Text, StyleSheet, Platform, Slider, TouchableOpacity, TouchableWithoutFeedback, Alert, Switch } from 'react-native';
import { observer } from 'mobx-react';

import { NavigationScreenProps, NavigationEvents } from 'react-navigation';
import { FlightPlan } from './store';
import { isString, uniq, isUndefined, flatMap, concat, range, map, times, isArray } from 'lodash'

import { human, iOSColors, systemWeights } from 'react-native-typography'
import Icon from 'react-native-vector-icons/Ionicons'
import IconM from 'react-native-vector-icons/MaterialCommunityIcons'
import PhotoPicker from './PhotoPicker';



import { getPreciseDistance } from 'geolib'
import KeyframesList from './KeyframesList';
import { action } from 'mobx';
import BusyOverlay from './BusyOverlay';

let Drone = NativeModules.DroneApi;

@observer
export default class PlanScreen extends React.Component<NavigationScreenProps> {
  static navigationOptions = ({ navigation }) => {
    return {
      tabBarLabel: 'Keyframes',
      // icon timeline-outline
      tabBarIcon: ({ focused, tintColor }) => <Icon name="ios-film" size={30} color={focused ? tintColor : iOSColors.midGray} />,

      headerRight: (
        <Button
          title="Add"
          onPress={() => null}
        />
      )
    };
  };


  state: {
    photos: string[],
    dronePhotosCount: number,
    pickerVisible: boolean,
    settingsVisible: boolean,
    loop: boolean,
    flightSpeed: number,
    rotationSpeed: number,
    loadMore(): void,
    busy: boolean,
  } = {
      photos: [],
      dronePhotosCount: 0,
      pickerVisible: false,
      settingsVisible: false,
      loop: false,
      flightSpeed: 0,
      rotationSpeed: 0,
      loadMore: (() => null),
      busy: false,
    }

  loading = false

  addFromPhotos = () => {
    const loadMore = (from: any) => () => {
      if (this.loading) return;
      this.loading = true
      CameraRoll.getPhotos({
        first: 30,
        after: from,
        groupTypes: 'All',
        assetType: 'Photos',
        mimeTypes: ['image/jpeg'],
      }).then(r => {
        const edges: any[] = r.edges.filter(x =>
          ((x.node.image.width == 4608 && x.node.image.height == 3456)
            || (x.node.image.width == 5344 && x.node.image.height == 4016))
          && x.node.location.latitude)
        const nextPage = edges.map(p => p.node.image.uri)

        //console.log("RRR", r.page_info, r.edges.map((x) => x.node.image.uri), this.state.photos, nextPage)

        this.setState({
          photos: isUndefined(from) ? nextPage : uniq(this.state.photos.concat(nextPage)),
          dronePhotosCount: 0,
          pickerVisible: true,
          loadMore: r.page_info.has_next_page ? loadMore(r.page_info.end_cursor) : (() => null)
        });
        this.loading = false
      })
        .catch((err) => {
          console.log(err)
          //Error Loading Images
        });
    }
    loadMore(undefined)()
  }

  addFromDrone = () => {
    setTimeout(() => {
      Drone.getPhotosFromDrone().then((photosCount: number) => {
        console.log("photosCount", photosCount)
        this.setState({
          dronePhotosCount: photosCount,
          photos: [],
          pickerVisible: true,
          loadMore: (() => null),
        });
      }).catch(() => {
        Alert.alert("The drone is not connected", "Connect to the drone (via the controller of wifi) or use photos from drone saved in Library.")
      })
    }, 1000)
  }

  addClicked = () => {
    ActionSheetIOS.showActionSheetWithOptions({
      title: "Select the source of new keyframes",
      options: ['Choose from Library...', 'Choose from the drone...', 'Cancel',],
      cancelButtonIndex: 2,
    },
      (buttonIndex: number) => {
        [this.addFromPhotos, this.addFromDrone, (() => null)][buttonIndex]()
      }
    )
  }

  photosSelected = (selected: any[]) => {
    this.setState({ pickerVisible: false, busy: true })
    const plan: FlightPlan = this.props.navigation.getParam('plan')
    const images = selected.filter(isString)
    if (images.length > 0) {
      plan.addKeyFrames(images).then(() => this.setState({ busy: false }))
    }

    const ids = selected.filter(isArray).map((x) => x[0])
    
    if(!ids.length && !images.length) { this.setState({ busy: false }) }

    if (ids.length > 0) {
      Drone.downloadDronePhotos(ids).then((urls: string[]) => {
        plan.addKeyFrames(urls).then(() => this.setState({ busy: false }))
      }).catch(() => {
        Alert.alert("Error in downloading photos from the drone.")
      })
    }
  }

  render() {
    const plan: FlightPlan = this.props.navigation.getParam('plan')


    const Separator = () => <View style={{ height: 1, backgroundColor: "#E5E5EA", marginHorizontal: -16 }} />

    const openSettings = () => {
      this.setState({
        settingsVisible: true,
        loop: plan.loop,
        flightSpeed: plan.flightSpeed,
        rotationSpeed: plan.rotationSpeed,
      })
    }
    const closeSettings = action(() => {
      this.setState({ settingsVisible: false })
      plan.loop = this.state.loop
      plan.flightSpeed = this.state.flightSpeed
      plan.rotationSpeed = this.state.rotationSpeed
    })


    return (
      <>
        <BusyOverlay visible={this.state.busy} />
        <ScrollView style={{ flex: 1 }}>
          <NavigationEvents
            onWillFocus={() => this.props.navigation.setParams({
              headerRight: (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={this.addClicked}
                  >
                    <Icon name="ios-add" size={32} color={iOSColors.blue} style={{ marginHorizontal: 8 }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={openSettings}
                  >
                    <Icon name="ios-settings" size={30} color={iOSColors.blue} style={{ marginHorizontal: 8 }} />
                  </TouchableOpacity>
                </View>)
            })}
            onWillBlur={() => this.props.navigation.setParams({ headerRight: null })}
          />

          <KeyframesList plan={plan} />

        </ScrollView>

        <PhotoPicker
          data={concat(this.state.photos as any[], map(range(this.state.dronePhotosCount), (x) => [x, NativeModules.DroneApi.getThumbnailFromDrone(x)]))}
          //images={this.state.photos}
          //dronePhotosCount={this.state.dronePhotosCount}
          visible={this.state.pickerVisible}
          onDone={this.photosSelected}
          loadMore={this.state.loadMore}
        />

        <Modal
          visible={this.state.settingsVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={closeSettings}
          supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            //alignItems: 'stretch'
          }}>

            <TouchableWithoutFeedback onPress={closeSettings}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>

            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <View
                style={{
                  backgroundColor: iOSColors.white,
                  borderRadius: 12,
                  padding: 16,
                  paddingBottom: 32,
                  maxWidth: 500,
                  flex: 1,
                }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  marginTop: -8,
                }}>
                  <Text style={human.headline}>Flight settings</Text>
                  <Button
                    title="Done"
                    onPress={closeSettings}
                  />
                </View>
                <Separator />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4, }}>
                  <Text style={human.subhead}>Loop (return to first point)</Text>
                  <Switch
                    value={this.state.loop}
                    onValueChange={(v) => this.setState({ loop: v })}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-between' }}>
                    <Text style={human.subhead}>Max flight speed</Text>
                    <Text style={human.subhead}>{this.state.flightSpeed.toFixed(1)} m/s</Text>
                  </View>
                  <Slider
                    style={{ flex: 0.8, marginLeft: 8 }}
                    minimumValue={0.1}
                    maximumValue={10}
                    step={0.1}
                    onValueChange={(v) => this.setState({ flightSpeed: v })}
                    value={this.state.flightSpeed}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-between' }}>
                    <Text style={human.subhead}>Max rotation speed</Text>
                    <Text style={human.subhead}>{this.state.rotationSpeed.toFixed(0)} °/s</Text>
                  </View>
                  <Slider
                    style={{ flex: 0.8, marginLeft: 8 }}
                    minimumValue={1}
                    maximumValue={180}
                    step={1}
                    onValueChange={(v) => this.setState({ rotationSpeed: v })}
                    value={this.state.rotationSpeed}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </>)
  }
}
