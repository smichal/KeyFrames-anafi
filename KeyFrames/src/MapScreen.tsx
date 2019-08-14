import React from "react";
import { NavigationScreenProps } from "react-navigation";

import Icon from 'react-native-vector-icons/Ionicons'
import { View, Text } from "react-native";
import { human, iOSColors, systemWeights } from 'react-native-typography'
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import { FlightPlan } from "./store";
import { observer } from "mobx-react";
import { map, min, max } from "lodash";

@observer
export default class MapScreen extends React.Component<NavigationScreenProps> {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Map',
      tabBarIcon: ({ focused, tintColor }) => <Icon name="ios-map" size={30} color={focused ? tintColor : iOSColors.midGray} />,
    };
  };

  render() {
    const plan: FlightPlan = this.props.navigation.getParam('plan')
    const points = plan.tajectory.points


    const latitudeMin = min(map(points, 'latitude'))
    const latitudeMax = max(map(points, 'latitude'))

    const longitudeMin = min(map(points, 'longitude'))
    const longitudeMax = max(map(points, 'longitude'))


    if(points.length <= 1) {
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
        <Text style={[human.body, { color: iOSColors.gray }]}>Add some keyframes to see trajectory on a map.</Text>
      </View>
    }

    return <View
      style={{ flex: 1 }}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={{
          latitude: (latitudeMin + latitudeMax) / 2,
          longitude: (longitudeMin + longitudeMax) / 2,
          latitudeDelta: (latitudeMax - latitudeMin) + 0.0003,
          longitudeDelta: (longitudeMax - longitudeMin) + 0.0003,
        }}
        mapType='hybrid'
        showsTraffic={false}
      >

        {points.map((x, i) => (
          <Polyline
            key={"dir" + i}
            coordinates={[x, { latitude: x.latitude + 0.00005 * Math.cos(x.yaw * Math.PI / 180), longitude: x.longitude + 0.00005 * Math.sin(x.yaw * Math.PI / 180) }]}
            strokeWidth={2}
            strokeColor="green"
          />
        ))}

        <Polyline
          coordinates={points}
          strokeWidth={2}
          strokeColor="red"
        />

        {plan.keyframes.map((x, i) => (
          <Marker
            key={i}
            coordinate={x.location}
          />
        ))}

      </MapView>

    </View>;
  }
}
