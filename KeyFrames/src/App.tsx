/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React from 'react';
//import { Provider } from 'mobx-react/native';
import { createStackNavigator, createAppContainer, createBottomTabNavigator } from "react-navigation";
import PlansScreen from './PlansScreen';
import store, { StoreContext } from './store';
import PlanScreen from './PlanScreen';
import MapScreen from './MapScreen';
import FlyScreen from './FlyScreen';
import { NativeModules, Text } from 'react-native';
import { action } from 'mobx';


const PlanNavigator = createBottomTabNavigator({
  Plan: PlanScreen,
  Map: MapScreen,
  Fly: FlyScreen,
}, {
    navigationOptions: ({ navigation }) => ({
      title: navigation.state.routes[0].params.plan.name,
      headerRight: navigation.getChildNavigation('Plan').getParam('headerRight')
    }),
    tabBarOptions: {
      style: { backgroundColor: "#F9F9F9" }
    }

  })

const AppNavigator = createStackNavigator({
  Home: {
    screen: PlansScreen,
  },
  PlanN: {
    screen: PlanNavigator,
  }

}, {
    headerMode: 'float',
    defaultNavigationOptions: {
      headerStyle: {
        backgroundColor: "#F9F9F9",
      },
      headerBackTitle: null,
    }
  });

const AppContainer = createAppContainer(AppNavigator);

export default class App extends React.Component {
  interval: any = null

  componentDidMount() {
    let Drone = NativeModules.DroneApi;
    Drone.start()

    const checkConnection = action(() => {
      Drone.isConnected((x: boolean) => {
        store.isConnected = x
        console.log("connection", store.isConnected)
      })
    })
    this.interval = setInterval(checkConnection, 5000);
  }

  componentWillUnmount() {
    clearInterval(this.interval)
  }

  render() {
    // Use a Provider to pass the current theme to the tree below.
    // Any component can read it, no matter how deep it is.
    // In this example, we're passing "dark" as the current value.
    return (
      <StoreContext.Provider value={store}>
        <AppContainer />
      </StoreContext.Provider>
    );
  }
}
