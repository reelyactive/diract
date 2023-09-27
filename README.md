DirAct
======

__DirAct__ is embedded software for proximity interaction detection: _Who is interacting with whom/what?_  The lightweight code runs on Bluetooth Low Energy wearables, badges and beacons.

![DirAct Logo](https://reelyactive.github.io/diract/images/diract-logo-black.png)

__DirAct__ is written in JavaScript for [Espruino](https://www.espruino.com/), which runs on just about any device with a Nordic nRF52 microcontroller, and can be programmed through the web browser using the [Espruino Web IDE](https://www.espruino.com/ide/).  __DirAct__ advertising packets can be decoded by the [advlib-ble-manufacturers](https://github.com/reelyactive/advlib-ble-manufacturers/) library which is part of reelyActive's [Pareto Anywhere](https://www.reelyactive.com/pareto/anywhere/) open source middleware suite.

Learn more at [reelyactive.com/diract](https://www.reelyactive.com/diract/) and at [reelyactive.github.io/diract](https://reelyactive.github.io/diract/).


Programming Espruino devices with DirAct
----------------------------------------

The following Espruino devices are supported.

### Puck.js

Code is available in the __puckjs__ folder of this repository.  See our [Puck.js Development Guide](https://reelyactive.github.io/diy/puckjs-dev/) for detailed programming instructions.

### Pixl.js

Code is available in the __pixljs__ folder of this repository.

### Bangle.js

__DirAct__ is available directly from the [Bangle App Loader](https://banglejs.com/apps/#diract).  For development, see our [Bangle.js Development Guide](https://reelyactive.github.io/diy/banglejs-dev/) tutorial for detailed programming instructions.

Code for the original Bangle.js v1 is available in the __banglejs__ folder of [release-0.1](https://github.com/reelyactive/diract/tree/release-0.1) of this repository.

### ca-va-bracelet

Code is available in the __ca-va-bracelet__ folder of this repository.  See the [ca-va-bracelet](https://upverter.com/profile/cavabracelet/) open hardware project based on the MDBT42Q module, which runs Espruino.


Programming other devices with DirAct
-------------------------------------

The following devices which can be programmed to run Espruino are supported.

### micro:bit v2

Code for the BBC micro:bit v2 (the version with the microphone, speaker and a nRF52833 microcontroller) is available in the __microbit-v2__ folder of this repository.  See the [Espruino micro:bit guide](https://www.espruino.com/MicroBit) for programming instructions.


DirAct Identifiers
------------------

Each __DirAct__ device shall identify itself with a unique INSTANCE_ID.  By default, the two least-significant bytes of the nRF advertiser address are used as the unique INSTANCE_ID, unless a specific ID is entered, as below:

```javascript
// Auto-generate a unique INSTANCE_ID:
const INSTANCE_ID = null;
```

```javascript
// Specify INSTANCE_ID of 00000001
const INSTANCE_ID = new Uint8Array([ 0x00, 0x00, 0x00, 0x01 ]);
```

__DirAct__ devices recognise not only their peers, but also beacons which transmit an [InteroperaBLE Identifier](https://reelyactive.github.io/interoperable-identifier/) with the DirAct entity UUID (496f4944446972416374).

__DirAct__ devices transmit advertising packets which include _manufacturer specific data_ using the [Bluetooth-SIG-assigned Company Identifier](https://www.bluetooth.com/specifications/assigned-numbers/company-identifiers/) of Code Blue Consulting (0x0583), the co-developers of __DirAct__.  Developers may continue to use this company identifier for experimental and educational purposes.  However, __company identifier 0x0583 may NOT be used for commercial use of the DirAct embedded software__.  An entity may [request a company identifier from the Bluetooth SIG](https://www.bluetooth.com/specifications/assigned-numbers/company-identifiers/) and use this instead.  [Contact us](https://www.reelyactive.com/contact/) if in doubt.


DirAct filters on AOS 8.x
-------------------------

HPE Aruba Networking access points running AOS 8.x offer a DirAct filter for forwarding BLE Data in their IoT WebSocket Interface.  Note that the DirAct checkbox has the behaviour of forwarding _only_ __DirAct__ digest packets.

![DirAct AOS8 filtering](https://reelyactive.github.io/diract/images/diract-aos8-filtering.png)

In order to forward _both_ __DirAct__ proximity _and_ digest packets, instead include a Company Identifier filter with the value `0583`.

See our [Configure an Aruba Instant AP](https://reelyactive.github.io/diy/aruba-instant-config/) tutorial for more details on this integration.


Project History
---------------

__DirAct__ is jointly developed by [reelyActive](https://www.reelyactive.com) and [Code Blue Consulting](https://consultcodeblue.com/).  The code was open sourced as v0.x in 2019.

__DirAct__ v1.x, released at the start of the COVID-19 pandemic, added a digest feature to facilitate contact tracing in environments with sparse infrastructure.

__DirAct__ v2.x, released in 2023, fully adopts the [InteroperaBLE Identifier](https://reelyactive.github.io/interoperable-identifier/), and supports the digest and non-digest variants independently as diract-digest.js and diract.js, respectively.


Contributing
------------

Discover [how to contribute](CONTRIBUTING.md) to this open source project which upholds a standard [code of conduct](CODE_OF_CONDUCT.md).


Security
--------

Consult our [security policy](SECURITY.md) for best practices using this open source software and to report vulnerabilities.


License
-------

MIT License

Copyright (c) 2019-2023 [reelyActive](https://www.reelyactive.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
