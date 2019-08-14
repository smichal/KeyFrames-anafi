//
//  File.swift
//  KeyFrames
//
//  Created by Michał Stachurski on 07/06/2019.
//  Copyright © 2019 Michał Stachurski. All rights reserved.
//

import Foundation

import GroundSdk
import os.log
import CoreImage
import Photos

@objc(DroneApi)
class DroneApi: NSObject  {
  
  let encoder = JSONEncoder()
  var groundSdk: GroundSdk?
  var autoConnection : AutoConnection?
  
  @objc(start)
  func start() {
    if(self.groundSdk == nil) {
      print("Starting drone API")
      self.groundSdk = GroundSdk()
      
      self.autoConnection = groundSdk!.getFacility(desc: Facilities.autoConnection) as! AutoConnection
      autoConnection!.start()
    }
  }
  
  @objc(isConnected:)
  func isConnected(callback: RCTResponseSenderBlock) -> Void {
    callback([autoConnection?.drone?.state.connectionState == .connected])
  }
  
  @objc(fly:resolve:reject:)
  func fly(planTxt: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    if(autoConnection?.drone?.state.connectionState != .connected) {
      reject("conncection_error", "can not connect", nil);
      return;
    }
    
    let flightPlan = autoConnection!.drone!.getPilotingItf(PilotingItfs.flightPlan)!
    
    let tmpDir = FileManager.default.temporaryDirectory
    let planFile = tmpDir.appendingPathComponent("plan.mavlink").path
    assert(FileManager.default.createFile(atPath: planFile, contents: planTxt.data(using: .utf8)), "file not created")
    
    print("upload plan", planFile)
    flightPlan.uploadFlightPlan(filepath: planFile)
    
    //sleep(3)
    DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(3), execute: {
      print("state", flightPlan.latestUploadState)

      
      print("Reaseons", flightPlan.unavailabilityReasons)
      
      let started = flightPlan.activate(restart: false)
      
      print("error", flightPlan.latestActivationError.description)
      
      if(started) {
        os_log("started")
        resolve("ok")
      } else {
        os_log("NOT started")
        reject("error", "", nil)
      }
       })
  }
  
  func getMetadataAndThumbnail(imageData: Data) -> [String?] {
    let start: Int = imageData.range(of: "<rdf:RDF".data(using: String.Encoding.utf8 )!)?.first ?? 0
    let end: Int = imageData.range(of: "</rdf:RDF>".data(using: String.Encoding.utf8 )!)?.last ?? 0
    let metadata = String(decoding: imageData[start ..< (end + 1)], as: UTF8.self)
    
    let image = UIImage(data: imageData)!
    
    let size = CGSize(width: 640, height: 360)
    let renderer = UIGraphicsImageRenderer(size: size)
    let thumbnail = renderer.image { (context) in
      image.draw(in: CGRect(origin: .zero, size: size))
    }
    
    return [metadata, thumbnail.jpegData(compressionQuality: 0.8)?.base64EncodedString()]
  }
  
  @objc(parsePH:resolve:reject:)
  func parsePH(file: String, resolve: @escaping RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) -> Void {
    let asset = PHAsset.fetchAssets(withLocalIdentifiers: [file], options: nil)
    guard let result = asset.firstObject else {
      print("zonk", file)
      reject("file not found", nil, nil)
      return
    }

    let imageManager = PHImageManager.default()
    let options = PHImageRequestOptions()
    options.isSynchronous = true
    
    imageManager.requestImageData(for: result, options: options, resultHandler: {
      (data, responseString, imageOriet, info) -> Void in
      let imageData = data!
      resolve(self.getMetadataAndThumbnail(imageData: imageData))
    })
  }
  
  @objc(parseImage:resolve:reject:)
  func parseImage(file: String, resolve: @escaping RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) -> Void {
    let imageData = try! Data(contentsOf: URL(string: file)!)
    resolve(self.getMetadataAndThumbnail(imageData: imageData))
  }
  
  
  private var mediaStoreRef: Ref<MediaStore>?
  private var mediaListRef: Ref<[MediaItem]>!
  private var downloadRequest: Ref<MediaDownloader>!
  
  var droneMedia: [MediaItem] = []
  var thumbnailsDownloanders: [Int:Ref<UIImage>] = [:]
  
  @objc(getPhotosFromDrone:reject:)
  func getPhotosFromDrone(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    print("connection state", autoConnection?.drone?.state.connectionState)
    if(autoConnection?.drone?.state.connectionState != .connected) {
      reject("conncection_error", "can not connect", nil);
      return;
    }
    
    print("connected")
    
    var urls: [URL] = []
    
    mediaStoreRef = autoConnection!.drone!.getPeripheral(Peripherals.mediaStore) { [weak self] mediaStore in
      print("mediaStoreRef", mediaStore)
      
      self!.mediaListRef = mediaStore?.newList {
        [weak self] mediaList in
        if let mediaList = mediaList {
          let m = mediaList.filter { x in
            return x.resources[0].format == MediaItem.Format.jpg || (x.resources.count > 1 && x.resources[1].format == MediaItem.Format.jpg)
          }
          self!.droneMedia = m
          resolve(m.count)
        }
      }
    }
  }

  @objc(getThumbnailFromDrone:resolve:reject:)
  func getThumbnailFromDrone(idx: Int, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    print("getThumbnailFromDrone", idx)
    self.thumbnailsDownloanders[idx] = self.mediaStoreRef!.value!.newThumbnailDownloader(media: droneMedia[idx]) { thumbnail in
      if let thumbnail = thumbnail {
        resolve(thumbnail.jpegData(compressionQuality: 0.8)?.base64EncodedString())
      } else {
        reject("no thumbnail", "", nil)
      }
    }
  }
  
  @objc(downloadDronePhotos:resolve:reject:)
  func downloadDronePhotos(ids: [Int], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    print("connection state", autoConnection?.drone?.state.connectionState)
    if(autoConnection?.drone?.state.connectionState != .connected) {
      reject("conncection_error", "can not connect", nil);
      return;
    }
    
    print("connected")
    
    var urls: [URL] = []
    
    let toDownload = MediaResourceListFactory.listWith(allButDngOf: ids.map({droneMedia[$0]}))
    let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("fetch-" + UUID().uuidString)
    self.downloadRequest = mediaStoreRef!.value!.newDownloader(mediaResources: toDownload, destination: .directory(path: tmp.path)) { mediaDownloader in
      if let mediaDownloader = mediaDownloader {
        if(mediaDownloader.status == .complete) {
          print("done", urls)
          resolve(urls.map({$0.absoluteString}))
        }
        if(mediaDownloader.status == .fileDownloaded) {
          let url = mediaDownloader.fileUrl!
          urls.append(url)
          print("done1", url)
        }
        if(mediaDownloader.status == .error) {
          reject("downloading_error", "", nil);
        }
      }
    }
  }
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc func methodQueue() -> DispatchQueue {
    return DispatchQueue.main
   //return DispatchQueue(label: "keyframes")
  }
}

