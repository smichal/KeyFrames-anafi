import { action, observable, computed } from 'mobx';
import { NativeModules, AsyncStorage } from 'react-native';
import { create, persist } from 'mobx-persist'
import React from 'react';
import { parseMetadata, tajectory, makeFlightPlan } from '../cljs/app'
import uuid from 'react-native-uuid';
import { startsWith, some } from 'lodash';


let Drone = NativeModules.DroneApi;

class KeyFrame {
  @persist photo: string = ""
  @persist @observable metadata: string = ""
  id = ""

  constructor (photo: string, metadata: string) {
    this.id = uuid.v1()
    this.photo = photo
    this.metadata = metadata
  }

  @computed.struct get location() {
    return parseMetadata(this.metadata)
  }
}

export class FlightPlan {
  @persist @observable name = ""
  @persist('list', KeyFrame) @observable keyframes: KeyFrame[] = []
  @persist @observable loop: boolean = false
  @persist @observable flightSpeed: number = 3
  @persist @observable rotationSpeed: number = 20

  constructor (name: string) {
    this.name = name
  }

  @action.bound
  addKeyFrame(uri: string) {
    let promise = startsWith(uri, "ph://") ? Drone.parsePH(uri.substring(5, 41)) : Drone.parseImage(uri)
    return promise.then(([metadata, base64]: any) => {
      console.log("Metadata", uri, metadata)
      const parsed = parseMetadata(metadata);
      const isCorrect = metadata && metadata.match('Anafi') && parsed.latitude && parsed.longitude;
      if(isCorrect) {
        this.keyframes.push(new KeyFrame("data:image/jpeg;base64, " + base64, metadata))
      }
    }).catch(() => null)
  }

  @action.bound
  addKeyFrames(uris: string[]) {
    return Promise.all(uris.map(this.addKeyFrame))
  }

  @computed get tajectory() {
    return tajectory(this.keyframes.map(x => x.location), this.loop)
  }

  @action.bound
  moveKeyframe(frame: KeyFrame, offset: number) {
    const from = this.keyframes.indexOf(frame)
    const to = Math.max(0, Math.min(this.keyframes.length - 1, from + offset))
    this.keyframes.splice(to, 0, this.keyframes.splice(from, 1)[0]);
  }

  @action.bound
  deleteFrame(frame: KeyFrame) {
    const idx = this.keyframes.indexOf(frame)
    this.keyframes.splice(idx, 1);
  }

  @computed get mavlinkplan() {
    return makeFlightPlan(this.tajectory.segments, this.flightSpeed, this.rotationSpeed)
  }

}

class AppStore {
  @persist('list', FlightPlan) @observable flightPlans : FlightPlan[] = [];

  @observable isConnected: boolean = true;
  @observable hydrated: boolean = false;

  @action.bound
  addFlightPlan(name: string) {
    if(!some(this.flightPlans, (p) => p.name == name)) {
      this.flightPlans.push(new FlightPlan(name))
    }
  }

  @action.bound
  deleteFlightPlan(plan: FlightPlan) {
    const idx = this.flightPlans.indexOf(plan)
    this.flightPlans.splice(idx, 1);
  }
}

const hydrate = create({
  storage: AsyncStorage,
})
const store = new AppStore();
hydrate('app', store).then(action(() => store.hydrated = true))
export default store;

export const StoreContext = React.createContext({});
