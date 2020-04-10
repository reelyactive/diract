/**
 * Copyright reelyActive 2017-2020
 * We believe in an open Internet of Things
 *
 * DirAct is jointly developed by reelyActive and Code Blue Consulting
 */

// User-configurable constants
const INSTANCE_ID = [ 0x00, 0x00, 0x00, 0x01 ];
const NAMESPACE_FILTER_ID = [ 0xc0, 0xde, 0xb1, 0x0e, 0x1d,
                              0xd1, 0xe0, 0x1b, 0xed, 0x0c ];
const RSSI_THRESHOLD = -85;
const SCAN_DURATION_MILLISECONDS = 200;
const SCAN_INTERVAL_MILLISECONDS = 4800;
const ADVERTISING_INTERVAL_MILLISECONDS = 500;
const DISABLE_SERIAL_SERVICE = false;
const BUZZ_MILLISECONDS = 180;

// Eddystone protocol constants
const EDDYSTONE_UUID = 'feaa';
const EDDYSTONE_UID_FRAME = 0x00;
const EDDYSTONE_NAMESPACE_OFFSET = 2;
const EDDYSTONE_NAMESPACE_LENGTH = 10;
const EDDYSTONE_INSTANCE_OFFSET = 14;

// DirAct constants
const CODE_BLUE_MANUFACTURER_ID = 0x0583;
const DIRACT_FRAME = 0x01;
const DIRACT_DEFAULT_COUNT_LENGTH = 0x07;
const DIRACT_INSTANCE_LENGTH = 4;
const MAX_NUMBER_STRONGEST = 3;
const MAX_BATTERY_VOLTAGE = 3.0;
const MIN_BATTERY_VOLTAGE = 2.0;
const MAX_RSSI_TO_ENCODE = -28;
const MIN_RSSI_TO_ENCODE = -92;
const MAX_ACCELERATION_TO_ENCODE = 2;
const MAX_ACCELERATION_MAGNITUDE = 0x1f;
const INVALID_ACCELERATION_CODE = 0x20;
const SCAN_OPTIONS = {
    filters: [
      { manufacturerData: { 0x0583: {} } },
      { services: [ EDDYSTONE_UUID ] }
    ]
};

// Global variables
let devicesInRange = {};
let nearestRssi = [];
let sensorData = [ 0x82, 0x08, 0x3f ];
let advertisingOptions = {
  interval: ADVERTISING_INTERVAL_MILLISECONDS,
  showName: false,
  manufacturer: CODE_BLUE_MANUFACTURER_ID,
  manufacturerData: []
};
let encodedBattery = 0x3f;
let cyclicCount = 0;
let isSleeping = false;
let initiateSleep = false;


/**
 * Encode the battery percentage.
 * @return {Number} The battery percentage.
 */
function encodeBatteryPercentage() {
  let voltage = NRF.getBattery();
  
  if(voltage <= MIN_BATTERY_VOLTAGE) {
    return 0x00;
  }
  if(voltage >= MAX_BATTERY_VOLTAGE) {
    return 0x3f;
  }

  return Math.round(0x3f * (voltage - MIN_BATTERY_VOLTAGE) /
         (MAX_BATTERY_VOLTAGE - MIN_BATTERY_VOLTAGE));
}


/**
 * Encode the given acceleration.
 * @param {Number} acceleration The given acceleration (in g).
 * @return {Number} The encoded acceleration.
 */
function encodeAcceleration(acceleration) {
  if(acceleration >= 0) {
    return Math.min(0x1f, Math.round(acceleration * 0x10));
  }
  else {
    return Math.max(0x21, 0x3f + Math.round(acceleration * 0x10));
  }
}


/**
 * Update the sensor data (battery & acceleration) for the advertising packet.
 */
function updateSensorData() {
  let acc = Bangle.getAccel();
  
  // Update the battery measurement each time the cyclic count resets
  if(cyclicCount === 0) {
    encodedBattery = encodeBatteryPercentage();
  }
  
  sensorData[0] = ((encodeAcceleration(acc.x) << 2) & 0xfc) |
                  ((encodeAcceleration(acc.y) >> 4) & 0x03);
  sensorData[1] = ((encodeAcceleration(acc.y) << 4) & 0xf0) |
                  ((encodeAcceleration(acc.z) >> 2) & 0x0f);
  sensorData[2] = ((encodeAcceleration(acc.z) << 6) & 0xc0) |
                  (encodedBattery & 0x3f);
}


/**
 * Handle the given device discovered on scan and process further if
 * Eddystone-UID or DirAct.
 * @param {BluetoothDevice} device The discovered device.
 */
function handleDiscoveredDevice(device) {
  let isEddystone = (device.hasOwnProperty('services') &&
                     device.hasOwnProperty('serviceData') &&
                     (device.services[0] === EDDYSTONE_UUID));
  let isCodeBlue = (device.hasOwnProperty('manufacturer') &&
                    device.manufacturer === CODE_BLUE_MANUFACTURER_ID);
  
  if(isEddystone) {
    let isEddystoneUID = (device.serviceData[EDDYSTONE_UUID][0] ===
                          EDDYSTONE_UID_FRAME);
    if(isEddystoneUID) {
      handleEddystoneUidDevice(device.serviceData[EDDYSTONE_UUID],
                               device.rssi, device.id);
    }
  }
  else if(device.manufacturer === CODE_BLUE_MANUFACTURER_ID) {
    let isDirAct = (device.manufacturerData[0] === DIRACT_FRAME);
    if(isDirAct) {
      handleDirActDevice(device.manufacturerData, device.rssi, device.id);
    }
  }
}


/**
 * Handle the given Eddystone-UID device, adding to the devices in range if
 * it meets the filter criteria.
 * @param {Array} serviceData The Eddystone service data.
 * @param {Number} rssi The received signal strength.
 * @param {String} deviceId The device's 48-bit advertiser address.
 */
function handleEddystoneUidDevice(serviceData, rssi, deviceId) {
  for(let cByte = 0; cByte < EDDYSTONE_NAMESPACE_LENGTH; cByte++) {
    if(serviceData[EDDYSTONE_NAMESPACE_OFFSET + cByte] !== NAMESPACE_FILTER_ID[cByte]) {
      return;
    }
  }
  
  let instance = [];
  
  for(let cByte = 0; cByte < DIRACT_INSTANCE_LENGTH; cByte++) {
    instance.push(serviceData[EDDYSTONE_INSTANCE_OFFSET + cByte]);
  }
  
  updateDevicesInRange(deviceId, instance, rssi);
}


/**
 * Handle the given DirAct device, adding to the devices in range if
 * it meets the filter criteria.
 * @param {Array} manufacturerData The DirAct manufacturer data.
 * @param {Number} rssi The received signal strength.
 * @param {String} deviceId The device's 48-bit advertiser address.
 */
function handleDirActDevice(manufacturerData, rssi, deviceId) {
  let instance = [];
  
  for(let cByte = 2; cByte <= 5; cByte++) {
    instance.push(manufacturerData[cByte]);
  }
  
  updateDevicesInRange(deviceId, instance, rssi);
}


/**
 * Update the list of devices in range with the given device info.
 * @param {String} deviceId The device's 48-bit advertiser address.
 * @param {Array} instance The DirAct 4-byte instance id.
 * @param {Number} rssi The received signal strength.
 */
function updateDevicesInRange(deviceId, instance, rssi) {
  let isDeviceInList = devicesInRange.hasOwnProperty(deviceId);
  
  if(isDeviceInList) {
    let device = devicesInRange[deviceId];
    device.rssi = (device.rssi + rssi) / 2;
  }
  else {
    devicesInRange[deviceId] = { instance: instance, rssi: rssi };
  }
}


/**
 * Determine the strongest devices in range, based on rssi.
 * @param {Number} limit The number of devices to limit to.
 * @return {Array} Array of the advertiser addresses of the strongest devices.
 */
function determineStrongestDevicesInRange(limit) {
  let strongest = [];
  let rssiList = [];
  
  for(let deviceId in devicesInRange) {
    let rssi = devicesInRange[deviceId].rssi;
    
    if(strongest.length === 0) {
      strongest.push(deviceId);
      rssiList.push(rssi);
    }
    else {
      for(let cStrongest = 0; cStrongest < strongest.length; cStrongest++) {
        if(rssi > rssiList[cStrongest]) {
          strongest.splice(cStrongest, 0, deviceId);
          rssiList.splice(cStrongest, 0, rssi);
          cStrongest = strongest.length;
        }
        else if((cStrongest < limit) && (cStrongest === (strongest.length - 1))) {
          strongest.push(deviceId);
          rssiList.push(rssi);
          cStrongest = strongest.length;
        }
      }
    }
  }
  
  return strongest.slice(0, limit);
}


/**
 * Encode the given RSSI.
 * @param {Number} rssi The given RSSI.
 * @return {Number} The encoded RSSI.
 */
function encodeRssi(rssi) {
  rssi = Math.round(rssi);
  
  if(rssi >= MAX_RSSI_TO_ENCODE) {
    return 0x3f;
  }
  if(rssi <= MIN_RSSI_TO_ENCODE) {
    return 0x00;
  }
  return rssi - MIN_RSSI_TO_ENCODE;
}


/**
 * Append the instance and rssi of the nearest devices to the given data array.
 * @param {Array} data The manufacturerData array.
 */
function appendNearestDevices(data) {
  let strongest = determineStrongestDevicesInRange(MAX_NUMBER_STRONGEST);
  let message = '';
  nearestRssi = [];
  
  strongest.forEach(function(deviceId) {
    let device = devicesInRange[deviceId];
    let deviceDisplay = ('000' + ((device.instance[2] * 256) +
                                               device.instance[3])).substr(-4);
    
    data.push(device.instance[0], device.instance[1], device.instance[2],
              device.instance[3], encodeRssi(device.rssi));
    message += deviceDisplay + ' @ ' + Math.round(device.rssi) + 'dBm\r\n';
    nearestRssi.push(device.rssi);
  });
  E.showMessage(message, 'DirAct');
}


/**
 * Compile the DirAct manufacturer data.
 */
function compileManufacturerData() {
  let data = [
    DIRACT_FRAME,
    DIRACT_DEFAULT_COUNT_LENGTH,
    INSTANCE_ID[0], INSTANCE_ID[1], INSTANCE_ID[2], INSTANCE_ID[3],
    sensorData[0], sensorData[1], sensorData[2]
  ];
  
  appendNearestDevices(data);

  cyclicCount = (cyclicCount + 1) % 8; // Increment cyclic count
  
  data[1] = (cyclicCount << 5) + (data.length - 2);
  
  return data;
}


/**
 * Vibrate for each of the nearest devices in proportion to RSSI
 */
function vibrateForNearest() {
  if(nearestRssi.length) {
    let strengths = [];
    
    nearestRssi.forEach(function(rssi) {
      strengths.push(1 - ((MAX_RSSI_TO_ENCODE - rssi) /
                          (MAX_RSSI_TO_ENCODE - MIN_RSSI_TO_ENCODE)));
    });
    Bangle.buzz(BUZZ_MILLISECONDS, strengths[0])
      .then(() => new Promise(resolve => setTimeout(resolve,
                                                    BUZZ_MILLISECONDS * 1.5)))
      .then(function() {
        if(strengths.length > 1) { Bangle.buzz(BUZZ_MILLISECONDS,
                                               strengths[1]); }
      })
      .then(() => new Promise(resolve => setTimeout(resolve,
                                                    BUZZ_MILLISECONDS * 1.5)))
      .then(function() {
        if(strengths.length > 2) { Bangle.buzz(BUZZ_MILLISECONDS,
                                               strengths[2]); }
      });
  }
}


/**
 * Go to sleep.
 */
function sleep() {
  initiateSleep = false;
  isSleeping = true;
  NRF.sleep();
}


/**
 * Stop scanning, update and advertise updated manufacturer data.
 */
function updateNearestAndAdvertise() {
  NRF.setScan();                                     // Stop scanning
  
  if(initiateSleep) {
    return sleep();
  }
  
  updateSensorData();
  advertisingOptions.manufacturerData = compileManufacturerData();
  vibrateForNearest();
  NRF.setAdvertising({}, advertisingOptions);        // Start advertising
  setTimeout(diract, SCAN_INTERVAL_MILLISECONDS);    // Schedule next scan
}


/**
 * Start scanning and set timeout to stop and compile.
 */
function diract() {
  devicesInRange = {};                               // Reset previous results
  
  if(initiateSleep) {
    return sleep();
  }
  
  NRF.setScan(handleDiscoveredDevice, SCAN_OPTIONS); // Start scanning...
  setTimeout(updateNearestAndAdvertise, SCAN_DURATION_MILLISECONDS); // ...stop
}


/**
 * Watch the button to toggle between sleep and wake
 */
setWatch(function(e) {
  if(isSleeping) {
    // Wake
    isSleeping = false;
    NRF.wake();
    diract();
  }
  else if(!initiateSleep) {
    // Sleep
    initiateSleep = true;
  }
}, BTN1, { edge: "rising", repeat: true, debounce: 50 });


// Begin DirAct execution
diract();


if(DISABLE_SERIAL_SERVICE) {
  NRF.setServices({}, { uart: false });
}
