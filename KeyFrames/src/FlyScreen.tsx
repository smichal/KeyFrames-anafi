import React from "react";
import { NavigationScreenProps } from "react-navigation";

import Icon from 'react-native-vector-icons/Ionicons'
import { View, Text, Button, NativeModules, Image, StyleSheet, TouchableOpacity, Linking, Alert, SafeAreaView } from "react-native";
import { human, iOSColors, systemWeights } from 'react-native-typography'
import { observer } from "mobx-react";
import { FlightPlan, StoreContext } from "./store";
import BusyOverlay from "./BusyOverlay";

@observer
export default class FlyScreen extends React.Component<NavigationScreenProps> {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Fly',
      tabBarIcon: ({ focused, tintColor }) => <Icon name="ios-paper-plane" size={30} color={focused ? tintColor : iOSColors.midGray} />,
    };
  };

  state = { busy: false }

  static contextType = StoreContext

  render() {
    const plan: FlightPlan = this.props.navigation.getParam('plan')
    let Drone = NativeModules.DroneApi;
    const isConnected = this.context.isConnected

    if(!plan.keyframes.length) {
      return <View style={{
        flex: 1,
        alignItems: "center",
        justifyContent: 'center',
        padding: 8,
      }}>
        <Icon
          name="md-paper-plane"
          size={56}
          color={iOSColors.gray}
          style={{margin: 8}}
        />
        <Text style={[human.body, { color: iOSColors.gray }]}>Add some keyframes to make a flight plan.</Text>
      </View>
    }

    return <View style={{
      flex: 1,
    }}>
      <BusyOverlay visible={this.state.busy}/>
      <Image
        source={{ uri: plan.keyframes[0].photo }}
        blurRadius={15}
        style={{
          resizeMode: 'cover',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <SafeAreaView style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
      }}>
        <Icon
          name="md-paper-plane"
          size={56}
          color="rgba(255,255,255,0.8)"
          style={{
            textShadowColor: 'rgba(0, 0, 0, 0.75)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 10,
            padding: 8
          }}
        />

        {isConnected
          && <>
            <View style={{
              //backgroundColor: "rgba(0,0,0,0.3)",
              //padding: 16,
              //borderRadius: 8,
            }}>
              <Text style={[human.subhead, {
                color: iOSColors.white,
                padding: 8,
                margin: 16,
                //shadowColor: iOSColors.black,
                //shadowOpacity: 0.2,
                //shadowRadius: 10,
                textAlign: 'justify',
                textShadowColor: 'rgba(0, 0, 0, 0.75)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 10,
              }]}>
                Click a button below to send flight plan to the drone and start a mission.
                Your drone will fly to the first point in plan and then it'll start recording.
                Keep an eye on the drone and take over control if necessary.
                You will be taken to the "Free Flight 6" app for easier supervision over the drone.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                const fly = () => {
                  this.setState({busy: true})
                  Drone.fly(plan.mavlinkplan).then(() => {
                    this.setState({busy: false})
                    Linking.openURL('com.parrot.freeflight3://')
                  }).catch(() => {
                    this.setState({busy: false})
                    Alert.alert("An error occurred", "Please check connection with a drone")
                  })
                }
                if (true || this.context.isConnected) {
                  Alert.alert("Are you sure?", "Is it safe to start now?", [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Yes',
                      style: 'destructive',
                      onPress: fly,
                    }
                  ])
                }
              }}
            >
              <View style={{
                backgroundColor: "rgba(0,0,0,0.3)",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 50,
                borderColor: iOSColors.white,
                borderWidth: 2,
              }}>
                <Text style={[human.headline, {
                  color: iOSColors.white,
                  textTransform: 'uppercase'
                }]}>
                  Start flight plan
                </Text>
              </View>
            </TouchableOpacity>
          </>}

        {!isConnected
          && <View style={{
            //flexDirection: 'row',
            margin: 16,
            //justifyContent: 'space-around',
            alignItems: 'center',
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: 16,
            borderRadius: 8,
          }}>
            <Icon name="ios-warning" color={iOSColors.white} size={32} />
            <Text style={[human.subhead, {
              color: iOSColors.white,
              //textAlign: 'justify',
              textAlign: 'center',
              textShadowColor: 'rgba(0, 0, 0, 0.75)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 10,
              marginTop: 8,
              //flex: 1,
            }]}
            >
              The drone is not connected. Check connection. {'\n'}
              You can connect to the drone via WiFi or via a controller.
            </Text>
          </View>}

      </SafeAreaView>
    </View>;
  }
}
