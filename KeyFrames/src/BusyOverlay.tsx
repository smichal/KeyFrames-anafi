import React from "react";
import { Modal, ActivityIndicator, View, Text } from "react-native";

const BusyOverlay = ({ visible }) =>
  <Modal
    visible={visible}
    transparent={true}
    supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
  >
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <ActivityIndicator size="large"/>
    </View>

  </Modal>

export default BusyOverlay
