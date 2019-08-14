import React from 'react';
import { observer } from 'mobx-react';
import { FlightPlan } from './store';
import { SwipeListView, SwipeRow } from 'react-native-swipe-list-view';
import { View, Alert, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons'
import IconM from 'react-native-vector-icons/MaterialCommunityIcons'
import { human, iOSColors, systemWeights } from 'react-native-typography'
import { isUndefined } from 'lodash';
import { getPreciseDistance } from 'geolib';

const styles = StyleSheet.create({
  card: {
    marginTop: 16,//24,
    marginHorizontal: 0,
    padding: 8,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    backgroundColor: iOSColors.white,
    borderRadius: 6,
    ...Platform.select({
      android: { elevation: 16 },
      ios: {
        shadowColor: "black",
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.2,
        shadowRadius: 4
      }
    })
  },
  label: {
    ...human.footnoteObject,
    ...systemWeights.semibold,
    color: iOSColors.gray,
    textAlign: 'center',
  }
})

const Keyframe = observer(({ keyframe }: any) => {
  const x = keyframe
  return <View style={{
    maxWidth: 500,
    paddingLeft: 40,
    alignSelf: 'center',
    flexDirection: 'row',
  }}>
    <View
    style={[styles.card, { flexDirection: 'row', marginRight: 8, flex: 1 }]}
  >
    <View style={{
      overflow: "hidden",
      borderTopLeftRadius: 6,
      borderBottomLeftRadius: 6,
      margin: -8,
      marginRight: 0,
    }}>
      <Image
        style={{
          flex: 1,
          aspectRatio: 16 / 9,
          height: 120,
        }}
        source={{ uri: x.photo }}
      />
    </View>
    <View style={{ flex: 1, minWidth: 80, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconNumber text="Altitude" icon="altimeter">{x.location.altitude.toFixed(1) + " m"}</IconNumber>
      <IconNumber text="Heading" icon="compass-outline" angle={x.location.yaw}>{((x.location.yaw + 360) % 360).toFixed(0) + "°"}</IconNumber>
      <IconNumber text="Camera angle" icon="camera-outline" angle={x.location.pitch + 90}>{x.location.pitch.toFixed(0) + "°"}</IconNumber>
    </View>
  </View>
  </View>
})

const TimeLineEntry = ({ withDot }: { withDot: boolean }) => (
  <View style={{
    width: 40,
    paddingRight: 8,
    alignItems: 'center',
    alignSelf: 'stretch',
  }}>
    <View style={{
      position: 'absolute',
      top: 0,
      width: 1,
      height: '100%',
      backgroundColor: iOSColors.lightGray
    }} />
    {withDot
      && <View style={{
        backgroundColor: iOSColors.purple,
        width: 16,
        height: 16,
        borderRadius: 8,
        position: 'absolute',
        top: 16,
        shadowColor: iOSColors.purple,
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.5,
        shadowRadius: 4
      }}
      />}
  </View>
)

const IconNumber = ({ text, icon, children, angle }: any) => (
  <View>
    <Text style={{
      color: iOSColors.gray,
      fontSize: 8,
      textTransform: 'uppercase',
      textAlign: 'center',
    }}>{text}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', alignSelf: 'center' }}>
      <IconM name={icon} size={16} color={iOSColors.gray} />
      <Text style={[
        human.body,
        {
          marginLeft: 4,

        }]}>{children}</Text>
      {!isUndefined(angle)
        && <IconM name="ray-start-arrow" size={16} color={iOSColors.gray} style={{
          transform: [{ rotate: (angle - 90) + 'deg' }]
        }} />}
    </View>
  </View>
)

const FlightInfo = observer(({ flight }: any) => {
  const [x, nextFrame] = flight
  const distance = getPreciseDistance(x.location, nextFrame.location, 0.01)
  const altDiff = nextFrame.location.altitude - x.location.altitude
  const speed = 5
  const time = Math.max(distance / speed, Math.abs(altDiff / 4))
  return <View style={{
    maxWidth: 500,
    paddingLeft: 40,
    alignSelf: 'center',
    flexDirection: 'row',
  }}>
    <View
    style={{
      marginTop: 16,
      marginRight: 8,
      flex: 1,
    }}
  >
    <View
      style={{ flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginRight: 8 }}
    >
      <IconNumber text="Distance" icon="arrow-expand-horizontal">{distance.toFixed(1) + " m"}</IconNumber>
      <IconNumber text="Climb" icon="arrow-expand-vertical">{altDiff.toFixed(1).replace('-0.0', '0.0') + " m"}</IconNumber>
      {/*<IconNumber text="Flight time" icon="timer">{time.toFixed(0) + " s"}</IconNumber>
      <IconNumber text="Approx. speed" icon="speedometer">{speed.toFixed(0) + " m/s"}</IconNumber>*/}
    </View>
  </View>
  </View>
})

@observer
export default class KeyframesList extends React.Component<{
  plan: FlightPlan
}> {
  render() {
    const plan = this.props.plan
    const keyframes = plan.keyframes
    const listItems: any = []
    keyframes.forEach((frame, idx) => {
      listItems.push({ keyframe: frame })
      if (idx < keyframes.length - 1 || plan.loop) {
        listItems.push({ flight: [frame, keyframes[(idx + 1) % keyframes.length]] })
      }
    })

    const deleteKeyframe = (frame: any) => {
      Alert.alert("Delete keyframe", "Are you sure you want to delete this keyframe?", [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        { text: 'Delete', style: 'destructive', onPress: () => plan.deleteFrame(frame) },
      ])
    }

    return (
      <SwipeListView
        useFlatList
        data={listItems}
        renderItem={({ item }, rowMap) => {
          if (item.keyframe) {
            return <Keyframe keyframe={item.keyframe} />
          } else {
            return <SwipeRow disableLeftSwipe={true} disableRightSwipe={true} rightOpenValue={0}>
              <View />
              <FlightInfo flight={item.flight} />
            </SwipeRow>
          }
        }}
        previewRowKey={listItems.length ? listItems[0].keyframe.id : ""}
        previewDuration={100}
        rightOpenValue={-75}
        stopRightSwipe={-75 - 8}
        disableRightSwipe
        renderHiddenItem={({ item }, rowMap) => (
          <View style={{ height: '100%', flexDirection: 'row', justifyContent: 'center' }}>
            <View style={{ flex:1, maxWidth: 500, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
              <TimeLineEntry withDot={!!item.keyframe} />
              {!!item.keyframe
                && <View style={{
                  width: 75 + 16,
                  backgroundColor: iOSColors.midGray,
                  marginTop: 16,
                  marginRight: 8,
                  borderRadius: 6,
                  alignItems: 'stretch',
                }}>
                  <TouchableOpacity style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: 16,
                  }}
                    onPress={() => plan.moveKeyframe(item.keyframe, -1)}
                  >
                    <Icon name="ios-arrow-up" color={iOSColors.white} size={28} />
                  </TouchableOpacity>
                  <TouchableOpacity style={{
                    backgroundColor: iOSColors.red,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: 16,
                  }}
                    onPress={() => deleteKeyframe(item.keyframe)}
                  >
                    <Icon name="ios-trash" color={iOSColors.white} size={28} />
                  </TouchableOpacity>
                  <TouchableOpacity style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: 16,
                  }}
                    onPress={() => plan.moveKeyframe(item.keyframe, 1)}
                  >
                    <Icon name="ios-arrow-down" color={iOSColors.white} size={28} />
                  </TouchableOpacity>
                </View>
              }
            </View>
          </View>
        )}
        keyExtractor={(item, index) => item.keyframe ? item.keyframe.id : [item.flight[0].id, item.flight[1].id].join('-')}
        style={{ paddingBottom: 24 }}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={() => (
          <View style={{
            flex: 1,
            alignItems: "center",
            justifyContent: 'center',
            marginTop: 100,
          }}>
            <Icon
              name="md-paper-plane"
              size={56}
              color={iOSColors.gray}
              style={{ margin: 8 }}
            />
            <Text style={[human.title2, { color: iOSColors.gray }]}>There's nothing here, yet.</Text>
            <Text style={[human.footnote, { color: iOSColors.gray, marginTop: 4 }]}>
              Click "+" above to add JPEG photos that will become keyframes. {'\n'}
            </Text>
          </View>
        )}
      />
    );

  }
}