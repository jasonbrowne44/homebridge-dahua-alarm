import { PlatformIdentifier, PlatformName } from 'homebridge';

export type DahuaLorexPlatformConfig = {
  platform: PlatformName | PlatformIdentifier;
  cameras?: Array<CameraSettings>;
};

export type CameraCredentials = {
  ip: string;
  user: string;
  password: string;
}

export type CameraSettings = {
  channel: number;
  cameraName: string;
  cameraCredentials: CameraCredentials;
};
