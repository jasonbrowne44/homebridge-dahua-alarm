import { PlatformIdentifier, PlatformName } from 'homebridge';

export type DahuaLorexPlatformConfig = {
  platform: PlatformName | PlatformIdentifier;
  name?: string;
  cameras?: Array<CameraSettings>;
};

export type CameraCredentials = {
  IP: string;
  username: string;
  password: string;
}

export type CameraSettings = {
  index: number;
  cameraName: string;
  channel: string;
  cameraCredentials: CameraCredentials;
};%
