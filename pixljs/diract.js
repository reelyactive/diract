/**
 * Copyright reelyActive 2017-2023
 * We believe in an open Internet of Things
 *
 * DirAct is jointly developed by reelyActive and Code Blue Consulting
 */


// User-configurable constants
const INSTANCE_ID = null; // null = auto-generated.  Or specify ID with:
                          // new Uint8Array([ 0x00, 0x00, 0x00, 0x01 ]);
const NAMESPACE_FILTER_ID = [ 0x49, 0x6f, 0x49, 0x44, 0x44,
                              0x69, 0x72, 0x41, 0x63, 0x74 ];
const IGNORED_INSTANCE_IDS = new Uint32Array([ 0xe8c17e45, 0x4e5e77e4 ]);
const PROXIMITY_RSSI_THRESHOLD = -65;
const PROXIMITY_LED_RSSI_THRESHOLD = -65;
const PROXIMITY_TABLE_SIZE = 8;
const OBSERVE_PERIOD_MILLISECONDS = 400;
const BROADCAST_PERIOD_MILLISECONDS = 1600;
const PROXIMITY_PACKET_INTERVAL_MILLISECONDS = 200;
const ENABLE_BUTTON = false;
const ENABLE_BACKLIGHT = true;
const VOID_MENU_VALUE = '-';


// Eddystone protocol constants
const EDDYSTONE_UUID = 'feaa';
const EDDYSTONE_UID_FRAME = 0x00;
const EDDYSTONE_NAMESPACE_OFFSET = 2;
const EDDYSTONE_NAMESPACE_LENGTH = 10;
const EDDYSTONE_INSTANCE_OFFSET = 14;


// DirAct constants
const DIRACT_MANUFACTURER_ID = 0x0583;  // Code Blue Consulting
const DIRACT_PROXIMITY_FRAME = 0x01;
const DIRACT_DIGEST_FRAME = 0x11;
const DIRACT_DEFAULT_COUNT_LENGTH = 0x07;
const DIRACT_INSTANCE_LENGTH = 4;
const DIRACT_INSTANCE_OFFSET = 2;
const MAX_NUMBER_STRONGEST = 3;
const MAX_BATTERY_VOLTAGE = 3.0;
const MIN_BATTERY_VOLTAGE = 2.0;
const MAX_RSSI_TO_ENCODE = -28;
const MIN_RSSI_TO_ENCODE = -92;
const INVALID_ACCELERATION_CODE = 0x20;
const SCAN_OPTIONS = {
    filters: [
      { manufacturerData: { 0x0583: {} } },
      { services: [ EDDYSTONE_UUID ] }
    ]
};


// Other constants
const BITS_PER_BYTE = 8;
const DUMMY_INSTANCE_ID = 0;
const DUMMY_RSSI = MIN_RSSI_TO_ENCODE;


// Global variables
let instanceId;
let proximityInstances = new Uint32Array(PROXIMITY_TABLE_SIZE);
let proximityRssis = new Int8Array(PROXIMITY_TABLE_SIZE);
let sensorData = [ 0x82, 0x08, 0x3f ];
let cyclicCount = 0;
let lastDigestTime = 0;
let isProximityDetected = false;
let isSleeping = false;
let initiateSleep = false;
let menu = {
  "": { title: "-----  DirAct  -----", fontHeight: 10,
        predraw: g => { g.setFont('6x8'); } },
  "Nearest": { value: "" },
  "[0]": { value: VOID_MENU_VALUE },
  "[1]": { value: VOID_MENU_VALUE },
  "[2]": { value: VOID_MENU_VALUE }
};


/**
 * Initiate observer mode, scanning for devices in proximity.
 */
function observe() { 
  proximityInstances.fill(DUMMY_INSTANCE_ID);         // Reset proximity
  proximityRssis.fill(DUMMY_RSSI);                    //   table data

  if(initiateSleep) {
    return sleep();
  }
  
  NRF.setScan(handleDiscoveredDevice, SCAN_OPTIONS);  // Start scanning
  setTimeout(broadcast, OBSERVE_PERIOD_MILLISECONDS); // ...until period end
}


/**
 * Compile the scan results and initiate broadcaster mode, advertising either
 * proximity or digest packets, in consequence.
 */
function broadcast() {
  NRF.setScan();                                     // Stop scanning
  
  if(initiateSleep) {
    return sleep();
  }

  let sortedProximityIndices = getSortedIndices(proximityRssis);

  updateSensorData();
  broadcastProximity(sortedProximityIndices);
}


/**
 * Initiate broadcaster mode advertising proximity packets.
 * @param {TypedArray} sortedIndices The sorted proximity table indices.
 */
function broadcastProximity(sortedIndices) {
  let advertisingOptions = {
      interval: PROXIMITY_PACKET_INTERVAL_MILLISECONDS,
      showName: false,
      manufacturer: DIRACT_MANUFACTURER_ID
  };

  advertisingOptions.manufacturerData = compileProximityData(sortedIndices);
  NRF.setAdvertising({}, advertisingOptions);         // Start advertising
  setTimeout(observe, BROADCAST_PERIOD_MILLISECONDS); // ...until period end
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
  let isManufacturer = (device.hasOwnProperty('manufacturer') &&
                        device.manufacturer === DIRACT_MANUFACTURER_ID);
  
  if(isEddystone) {
    let isEddystoneUID = (device.serviceData[EDDYSTONE_UUID][0] ===
                          EDDYSTONE_UID_FRAME);
    if(isEddystoneUID) {
      handleEddystoneUidDevice(device.serviceData[EDDYSTONE_UUID], device.rssi);
    }
  }
  else if(isManufacturer) {
    let isDirAct = ((device.manufacturerData[0] === DIRACT_PROXIMITY_FRAME) ||
                    (device.manufacturerData[0] === DIRACT_DIGEST_FRAME));
    if(isDirAct) {
      handleDirActDevice(device.manufacturerData, device.rssi);
    }
  }
}


/**
 * Handle the given Eddystone-UID device, adding to the devices in range if
 * it meets the filter criteria.
 * @param {Array} serviceData The Eddystone service data.
 * @param {Number} rssi The received signal strength.
 */
function handleEddystoneUidDevice(serviceData, rssi) {
  for(let cByte = 0; cByte < EDDYSTONE_NAMESPACE_LENGTH; cByte++) {
    let namespaceIndex = EDDYSTONE_NAMESPACE_OFFSET + cByte;
    if(serviceData[namespaceIndex] !== NAMESPACE_FILTER_ID[cByte]) {
      return;
    }
  }
  
  let instanceId = 0;
  let bitShift = (DIRACT_INSTANCE_LENGTH - 1) * BITS_PER_BYTE;

  for(let cByte = 0; cByte < DIRACT_INSTANCE_LENGTH; cByte++) {
    let instanceByte = serviceData[EDDYSTONE_INSTANCE_OFFSET + cByte];
    instanceId += instanceByte << bitShift;
    bitShift -= BITS_PER_BYTE;
  }

  let unsignedInstanceId = new Uint32Array([instanceId])[0];

  if(!IGNORED_INSTANCE_IDS.includes(unsignedInstanceId)) {
    updateProximityTable(instanceId, rssi);
  }
}


/**
 * Handle the given DirAct device, adding to the devices in range if
 * it meets the filter criteria.
 * @param {Array} manufacturerData The DirAct manufacturer data.
 * @param {Number} rssi The received signal strength.
 */
function handleDirActDevice(manufacturerData, rssi) {
  let instanceId = 0;
  let bitShift = (DIRACT_INSTANCE_LENGTH - 1) * BITS_PER_BYTE;
  
  for(let cByte = DIRACT_INSTANCE_OFFSET;
      cByte < DIRACT_INSTANCE_OFFSET + DIRACT_INSTANCE_LENGTH; cByte++) {
    let instanceByte = manufacturerData[cByte];
    instanceId += instanceByte << bitShift;
    bitShift -= BITS_PER_BYTE;
  }
  
  updateProximityTable(instanceId, rssi);
}


/**
 * Update the proximity table with the given instance's RSSI.  If the instance
 * already exists, combine RSSI values in a weighted average.
 * @param {String} instanceId The DirAct 4-byte instance id as a 32-bit integer.
 * @param {Number} rssi The received signal strength.
 */
function updateProximityTable(instanceId, rssi) {
  let instanceIndex = proximityInstances.indexOf(instanceId);
  let isNewInstance = (instanceIndex < 0);

  if(isNewInstance) {
     let nextIndex = proximityInstances.indexOf(DUMMY_INSTANCE_ID);
     if(nextIndex >= 0) {
       proximityInstances[nextIndex] = instanceId;
       proximityRssis[nextIndex] = rssi;
     }
  }
  else {
    proximityRssis[instanceIndex] = (proximityRssis[instanceIndex] + rssi) / 2;
  }
}


/**
 * Compile the DirAct proximity data.
 * @param {TypedArray} sortedIndices The sorted proximity table indices.
 */
function compileProximityData(sortedIndices) {
  let data = [
    DIRACT_PROXIMITY_FRAME, DIRACT_DEFAULT_COUNT_LENGTH,
    instanceId[0], instanceId[1], instanceId[2], instanceId[3],
    sensorData[0], sensorData[1], sensorData[2]
  ];
  let isNewProximityDetected = false;
  menu['[0]'].value = VOID_MENU_VALUE;
  menu['[1]'].value = VOID_MENU_VALUE;
  menu['[2]'].value = VOID_MENU_VALUE;

  for(let cInstance = 0; cInstance < MAX_NUMBER_STRONGEST; cInstance++) {
    let index = sortedIndices[cInstance];

    if(proximityRssis[index] >= PROXIMITY_RSSI_THRESHOLD) {
      let instanceId = proximityInstances[index];
      data.push((instanceId >> 24) & 0xff, (instanceId >> 16) & 0xff,
                (instanceId >> 8) & 0xff, instanceId & 0xff,
                encodeRssi(proximityRssis[index]));
      if(proximityRssis[index] >= PROXIMITY_LED_RSSI_THRESHOLD) {
        isNewProximityDetected = true;
      }
      menu['[' + cInstance + ']'].value = instanceId.toString(16) + ' @ ' +
                                          proximityRssis[index] + 'dBm';
    }
    else {
      cInstance = PROXIMITY_TABLE_SIZE; // Break
    }
  }

  cyclicCount = (cyclicCount + 1) % 8;
  
  data[1] = (cyclicCount << 5) + (data.length - 2);

  isProximityDetected = isNewProximityDetected;

  E.showMenu(menu);
  
  return data;
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
 * Encode the acceleration.
 * @return {Array} The encoded acceleration [ x, y, z ].
 */
function encodeAcceleration() {
  return { x: INVALID_ACCELERATION_CODE,
           y: INVALID_ACCELERATION_CODE,
           z: INVALID_ACCELERATION_CODE };
}


/**
 * Update the sensor data (battery & acceleration) for the advertising packet.
 */
function updateSensorData() {
  
  // Update the battery measurement each time the cyclic count resets
  if(cyclicCount === 0) {
    encodedBattery = encodeBatteryPercentage();
  }

  encodedAcceleration = encodeAcceleration();

  sensorData[0] = ((encodedAcceleration.x << 2) & 0xfc) |
                  ((encodedAcceleration.y >> 4) & 0x3f);
  sensorData[1] = ((encodedAcceleration.y << 4) & 0xf0) |
                  ((encodedAcceleration.z >> 2) & 0x0f);
  sensorData[2] = ((encodedAcceleration.z << 6) & 0xc0) |
                  (encodedBattery & 0x3f);
}


/**
 * Determine the sorted order of the indices of the given array.
 * @return {Uint8Array} The array of indices sorted in descending order.
 */
function getSortedIndices(unsortedArray) {
  let sortedIndices = new Uint8Array(unsortedArray.length);

  sortedIndices.forEach((value, index) => sortedIndices[index] = index);
  sortedIndices.sort((a, b) => unsortedArray[b] - unsortedArray[a]);

  return sortedIndices;
}


/**
 * Create an instance ID from the least-significant 2-bytes of the advAddress.
 * @return {Uint8Array} The automatically-generated instance ID.
 */
function autoInstanceId() {
  let address = NRF.getAddress();

  return new Uint8Array([ 0x00, 0x00, parseInt(address.substring(12, 14), 16),
                          parseInt(address.substring(15, 17), 16) ]);
}


/**
 * Put the nRF to sleep.
 */
function sleep() {
  initiateSleep = false;
  isSleeping = true;
  NRF.sleep();
}


/**
 * Toggle from sleep to wake, or initiate sleep from wake.
 */
function toggleSleepWake() {
  if(isSleeping) {
    isSleeping = false;
    NRF.wake();
    observe();
  }
  else if(!initiateSleep) {
    initiateSleep = true;
  }
}

// Begin DirAct execution and watch button to toggle between sleep/wake
require("Font6x8").add(Graphics);
E.showMenu(menu);
instanceId = INSTANCE_ID || autoInstanceId();
observe();
if(ENABLE_BUTTON) {
  setWatch(toggleSleepWake, BTN, {edge: "rising", repeat: true, debounce: 50});
}
if(ENABLE_BACKLIGHT) {
  LED.set();
}
