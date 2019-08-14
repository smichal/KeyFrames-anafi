import React from 'react';
import { View, Text, SafeAreaView, Button, FlatList, AlertIOS, TouchableOpacity, TouchableHighlight, Alert, Image } from 'react-native';
import { observer } from 'mobx-react';
import { StoreContext, FlightPlan } from './store';
import { NavigationScreenProps } from 'react-navigation';
import { SwipeListView } from 'react-native-swipe-list-view';
import { iOSColors, human } from 'react-native-typography';
import Icon from 'react-native-vector-icons/Ionicons'
import { take } from 'lodash';
import BusyOverlay from './BusyOverlay'

@observer
export default class PlansScreen extends React.Component<NavigationScreenProps> {
  static navigationOptions = ({ navigation }) => {
    return {
      headerLeft: (
        <Text style={{
          fontSize: 31,
          fontWeight: 'bold',
          marginLeft: 16,
        }}>
          Flight plans
      </Text>),
      headerRight: (
        <Button
          title="Add new"
          onPress={navigation.getParam('addNewPlan')}
        />),
    };
  };

  static contextType = StoreContext

  addNewPlan = () => {
    AlertIOS.prompt("Enter name for a new flight plan", undefined, (text) => {
      this.context.addFlightPlan(text)
    })
  }

  componentDidMount() {
    this.props.navigation.setParams({ addNewPlan: this.addNewPlan });
  }

  render() {
    const plans: FlightPlan[] = this.context.flightPlans.slice();

    const deleteFlightPlan = (plan: any) => {
      Alert.alert("Delete flight plan", "Are you sure you want to delete this flight plan?", [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        { text: 'Delete', style: 'destructive', onPress: () => this.context.deleteFlightPlan(plan) },
      ])
    }

    const Item = observer(({ item }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
      <View
        style={{
          flex: 1,
        }}>
        <Text style={human.title3}>
          {item.name}
        </Text>
        <Text style={[human.footnote, { color: iOSColors.gray }]}>
          {item.keyframes.length} keyframes
      </Text>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {take(item.keyframes, 3).map((k: any, i) => (
          <Image
            source={{ uri: k.photo }}
            key={i}
            style={{
              height: 48,
              aspectRatio: 1,
              marginLeft: 8,
              borderRadius: 6,
            }}
          />
        ))}

      </View>
    </View>)

    return <SafeAreaView style={{ flex: 1 }}>
      <BusyOverlay visible={!this.context.hydrated}/>
      <SwipeListView
        useFlatList
        style={{ flex: 1 }}
        data={plans}
        previewRowKey={plans.length ? plans[0].name : ""}
        previewDuration={100}
        renderItem={({ item }) => <TouchableHighlight
          underlayColor="#f9f9f9"
          onPress={() => this.props.navigation.navigate('PlanN', { plan: item })}
          style={{ backgroundColor: iOSColors.white }}
        >
          <Item item={item} />
        </TouchableHighlight>}
        ItemSeparatorComponent={() =>
          <View style={{
            height: 1,
            backgroundColor: "#E5E5EA",
            marginHorizontal: 16
          }}
          />
        }
        keyExtractor={(item, index) => "" + item.name}
        rightOpenValue={-75}
        stopRightSwipe={-75 - 8}
        disableRightSwipe
        renderHiddenItem={({ item }, rowMap) => (
          <TouchableOpacity style={{
            height: '100%',
            backgroundColor: iOSColors.red,
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingRight: 32,
          }}
            onPress={() => deleteFlightPlan(item)}
          >
            <Icon name="ios-trash" color={iOSColors.white} size={28} />
          </TouchableOpacity>
        )}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={() => {
          if(!this.context.hydrated) return <View/>;
          return (
          <View style={{
            flex: 1,
            alignItems: "center",
            justifyContent: 'center',
          }}>
            <Icon
              name="md-paper-plane"
              size={56}
              color={iOSColors.gray}
              style={{ margin: 8 }}
            />
            <Text style={[human.title2, { color: iOSColors.gray }]}>There's nothing here, yet.</Text>
            <Text style={[human.body, { color: iOSColors.gray, marginTop: 4 }]}>Click "Add new" above to get started.</Text>
          </View>
        )}}
      />
    </SafeAreaView>
  }
}