import http, { IncomingMessage, Server, ServerResponse } from "http";
import axios, { AxiosBasicCredentials, AxiosResponse, AxiosError, AxiosRequestConfig } from "axios";
import {
    API,
    APIEvent,
    CharacteristicEventTypes,
    CharacteristicGetCallback,
    CharacteristicSetCallback,
    CharacteristicValue,
    DynamicPlatformPlugin,
    HAP,
    Logging,
    PlatformAccessory,
    PlatformAccessoryEvent,
    PlatformConfig,
} from "homebridge";
import { allowedNodeEnvironmentFlags } from "process";
import { CameraSettings, DahuaLorexPlatformConfig } from './configTypes';
import { log } from "console";
import md5 from "blueimp-md5";

const PLUGIN_NAME = "homebridge-dahua-alarm-plugin";
const PLATFORM_NAME = "DahuaLorexAlarmPlatform";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;
let Accessory: typeof PlatformAccessory;

export = (api: API) => {
    hap = api.hap;

    Accessory = api.platformAccessory;
    try {
        api.registerPlatform(PLATFORM_NAME, DahuaLorexAlarmPlatform);
    }
    catch (error) {
        if (error instanceof Error) {
            let mesg = error.message;
            let name = error.name;
        }
    }
};

class DahuaLorexAlarmPlatform implements DynamicPlatformPlugin {

    private readonly log: Logging;
    private readonly api: API;

    private requestServer?: Server;

    private readonly accessories: PlatformAccessory[] = [];

    private siren: boolean = false;

    private cameras: DahuaLorexCamera[] = [];

    constructor(log: Logging, config: PlatformConfig, api: API) {
        this.log = log;
        this.api = api;

        log.info("Dauha/Lorex starting DahuaLorexAlarmPlatform constructor");

        config = config as DahuaLorexPlatformConfig;

        log.info("Dahua/Lorex config:"+JSON.stringify(config));

        config.cameras?.forEach((cameraConfig: CameraSettings) => {
          let error = false;
          
        let lorexDahuaCamera: DahuaLorexCamera = {
          IP: cameraConfig.cameraCredentials.IP,
          channel: cameraConfig.channel,
          index: cameraConfig.index,
          username: cameraConfig.cameraCredentials.username,
          password: cameraConfig.cameraCredentials.password
        };

          this.cameras[this.cameras.length] = lorexDahuaCamera;
        }
        );
        // probably parse config or something here

        log.info("Dahua/Lorex Alarm plugin finished initializing! " + this.cameras.length + " cameras configured.");

        /*
         * When this event is fired, homebridge restored all cached accessories from disk and did call their respective
         * `configureAccessory` method for all of them. Dynamic Platform plugins should only register new accessories
         * after this event was fired, in order to ensure they weren't added to homebridge already.
         * This event can also be used to start discovery of new accessories.
         */
        api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
            log.info("Dahua/Lorex Alarm platform 'didFinishLaunching'");

            // The idea of this plugin is that we open a http service which exposes api calls to add or remove accessories
            this.addAccessory("Trigger all Alarms on All Cameras");
        });
    };

    /*
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory): void {
        this.log("Configuring Dahua/Lorex Alarm accessory %s", accessory.displayName);

        accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
            this.log("%s identified!", accessory.displayName);
        });

        accessory.getService(hap.Service.Switch)!.getCharacteristic(hap.Characteristic.On)
            .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
                this.log.info("%s Switch was set to: " + value);
                if (value == true) {
                    this.log.info("Fire the sirens on all cameras.");
                    this.triggerAllAlarms();
                }
                if (value == false) {
                    this.log.info("Stop siren.  Set to off.");
                    this.silenceAllAlarms();
                }
                callback();
            });

        this.accessories.push(accessory);
    }

    // --------------------------- CUSTOM METHODS ---------------------------

    private getCameraIP = (cameraNumber: number): string => {
        return this.cameras[cameraNumber].IP;
    }

    private getCameraChannel = (cameraNumber: number): string => {
        return this.cameras[cameraNumber].channel;
    }

    private getCameraUserName = (cameraNumber: number): string => {
        return this.cameras[cameraNumber].username;
    }

    private getCameraPassWord = (cameraNumber: number): string => {
        return this.cameras[cameraNumber].password;
    }

    controlDahuaLorexCameraAlarm = (cameraIP: String | null, channel: string, value: number, userName : string, passWord: string) => {
        let postData1 = '{"method":"global.login","params":{"userName":"admin","password":"","clientType":"Web3.0","loginType":"Direct"},"id":1}:';
        console.log("PostData1:" + postData1);
        axios.post('http://' + cameraIP + '/RPC2_Login', postData1
        ).then(function(response) {
            let sessionId = response.data.session;
            let random = response.data.params.random;
            let realm = response.data.params.realm;
            console.log("userName:" + userName + " random:" + random + " realm:" + realm);
            let passwordString = 'admin' + ':' + realm + ':' + passWord;
            console.log("PasswordString:" + passwordString);
            let passwordTotalString = userName + ':' + random + ':' + md5(passwordString).toUpperCase();
            console.log("PasswordTotalString:" + passwordTotalString);
            let hexPass = md5(passwordTotalString).toUpperCase();
            let postData2 = '{"method":"global.login","params":{"userName":'+ userName + ',"password":"' + hexPass + '","clientType":"Web3.0","loginType":"Direct","authorityType":"Default"},"id":2,"session":"' + sessionId + '"}';
            console.log("postData2:" + postData2);
            axios.post('http://' + cameraIP + '/RPC2_Login', postData2
            ).then(function(response) {
                console.log("Second Login Response Data:" + JSON.stringify(response.data));
                let postData3 = '{"method":"CoaxialControlIO.control","params":{"channel":'+ channel + ',"info":[{"Type":2,"IO":' + value +',"TriggerMode":2}]},"id":3,"session":"' + sessionId + '"}';
                console.log("PostData3:" + postData3);
                axios.post('http://' + cameraIP + '/RPC2', postData3
                ).then(function(response) {
                    console.log("Command Response:" + JSON.stringify(response.data));
                    let result = response.data.result;
                    if (result) {
                        if (value == 1)
                        {
                        console.log("Alarm Triggered!");
                        }
                        if (value == 0)
                        {
                          console.log("Alarm Silenced!");
                        }
                    }
                }).catch(function(error) {
                    console.log("Command Error:" + error);
                });
            }).catch(function(error) {
                console.log("Second Login Error:" + error);
            });
        }).catch(function(error) {
            if (error.response) {
                console.log("error: " + error.response);
                console.log("Data: " + error.response.data);
                console.log("Status: " + error.response.status);
                console.log("Headers: " + error.response.headers);
            }
            console.log("Error:" + error);
        });

    }

    triggerAllAlarms() {
        this.log.info("Triggering All Alarms");
        this.siren = true
        while (this.siren)
        {
        for (var camera of this.cameras) {
            let cameraURL = this.getCameraIP(camera.index);
            let channel = this.getCameraChannel(camera.index);
            let userName = this.getCameraUserName(camera.index);
            let passWord = this.getCameraPassWord(camera.index);
            this.controlDahuaLorexCameraAlarm(cameraURL, channel, 1, userName, passWord);
        }
      }
      sleep(10000);
      }

    silenceAllAlarms() {
        this.log.info("Silencing All Alarms");
        this.siren = false;
        for (var camera of this.cameras) {
          let cameraIP = this.getCameraIP(camera.index);
          let channel = this.getCameraChannel(camera.index);
          let userName = this.getCameraUserName(camera.index);
          let passWord = this.getCameraPassWord(camera.index);
          this.controlDahuaLorexCameraAlarm(cameraIP, channel, 0, userName, passWord);
        }
    }

    addAccessory(name: string) {
        this.log.info("Adding new accessory with name %s", name);

        // uuid must be generated from a unique but not changing data source, name should not be used in the most cases. But works in this specific example.
        const uuid = hap.uuid.generate(name);
        const accessory = new Accessory(name, uuid);

        accessory.addService(hap.Service.Switch, "Alarm");

        this.configureAccessory(accessory); // abusing the configureAccessory here

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    removeAccessories() {
        // we don't have any special identifiers, we just remove all our accessories

        this.log.info("Removing all Dahua/Lorex accessories");

        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);
        this.accessories.splice(0, this.accessories.length); // clear out the array
    }
    // ----------------------------------------------------------------------
}

type DahuaLorexCamera = {
    index: number,
    IP: string,
    channel: string,
    username: string,
    password: string
}