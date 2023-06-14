# homebridge-dahua-alarm
Homebridge plugin for Dahua/Lorex Camera Siren triggering for home security systems.

This is a homebridge plugin that adds a switch to your homebridge based security system to control the sirens on your Dahua/Lorex cameras.  When this switch is turned on, it triggers the siren on each of your Dahua/Lorex cameras that you list in your configuration under "cameras".  Dahua/Lorex cameras usually only produce a siren sound for 10-15 seconds on a single camera.  This plugin will force all of the cameras in your system to produce a siren sound as long as the switch is on.  I'm not sure why Dahua/Lorex chose to make the cameras only produce a siren sound for 10-15 seconds.  It's not very loud.  It doesn't seem like this would scare anyone off. Especially since only the single camera that detects motion produces a siren sound.  Hopefully this plugin will improve your current security system and scare intruders off.

This plugin has only been tested with a Dahua/Lorex N844A8 NVR and Lorex E893AB cameras.  This plugin should function with most Dahua/Lorex NVRs, DVRs, and cameras.  It uses Dahua's/Lorex's implementation of basic authentication and the RPC interface that the NVR uses to talk to the cameras.  Dahua/Lorex has blocked using the camera sirens with the simple cgi-bin commands, so I was forced to use the more complex RPC interface that the NVR uses to talk to its cameras.  Just let me know if it works on your system and I can add this to the compatibility chart.

FYI, I haven't added https support, but this is easy to add if anyone needs it.

### Compatible NVRs

N844A8, but should be compatible with most Dahua/Lorex NVRs.

### Compatible Dahua/Lorex DVRs

Unknown, but should be compatible with most Dahua/Lorex DVRs.

### Compatible Dahua/Lorex Cameras

E893AB, but should be compatible with most Dahua/Lorex Cameras.


### Configuration:

Just add your camera's IP address, username and password to add a camera to the security system under "cameras" in your configuration.

### Development
- `npm run build` to get JS output in `dist`

