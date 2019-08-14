//
//  Drone.m
//  KeyFrames
//
//  Created by Michał Stachurski on 07/06/2019.
//  Copyright © 2019 Michał Stachurski. All rights reserved.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTConvert.h>


@interface RCT_EXTERN_MODULE(DroneApi, NSObject)

RCT_EXTERN_METHOD(start)
RCT_EXTERN_METHOD(isConnected:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(fly:(NSString *)planTxt resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requiresMainQueueSetup)
RCT_EXTERN_METHOD(parsePH:(NSString *)file resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(parseImage:(NSString *)file resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getPhotosFromDrone:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getThumbnailFromDrone:(NSInteger)idx  resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(downloadDronePhotos:(NSArray)ids  resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(methodQueue)

/*
- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}
+ (BOOL)requiresMainQueueSetup
{
  return YES;  // only do this if your module initialization relies on calling UIKit!
}*/

@end

