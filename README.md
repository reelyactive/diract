DirAct
======

Who is interacting with whom?  Who is interacting with what?

Proximity interaction detection software for Bluetooth beacons jointly developed by [reelyActive](https://www.reelyactive.com) and [Code Blue Consulting](https://consultcodeblue.com/).  Written in JavaScript and runs on [Espruino devices](https://shop.espruino.com/ble) and Espruino-capable devices with the nRF52 series microcontroller which can easily be programmed through the web browser using the [Espruino Web IDE](https://www.espruino.com/ide/).

![DirAct Logo](https://reelyactive.github.io/diract/images/diract-logo-black.png)

Learn more about __DirAct__ at [reelyactive.github.io/diract](https://reelyactive.github.io/diract/) and the proximity identification use case at [getpareto.com/use-cases/interaction-detection](https://getpareto.com/use-cases/interaction-detection/).


Programming Espruino devices with DirAct
----------------------------------------

The following Espruino devices are supported.

### Puck.js

Code is available in the __puckjs__ folder of this repository.  See our [Develop BLE applications with Puck.js](https://reelyactive.github.io/diy/puckjs-dev/) tutorial for detailed programming instructions.

### Bangle.js

Code is available in the __banglejs__ folder of [release-0.1](https://github.com/reelyactive/diract/tree/release-0.1) of this repository.  See our [Develop BLE applications with Bangle.js](https://reelyactive.github.io/diy/banglejs-dev/) tutorial for detailed programming instructions.

### ca-va-bracelet

Code is available in the __ca-va-bracelet__ folder of this repository.  See the [ca-va-bracelet](https://upverter.com/profile/cavabracelet/) open hardware project based on the MDBT42Q module, which runs Espruino.


DirAct Identifiers
------------------

Each __DirAct__ device shall use a unique INSTANCE_ID.  Set this user-configurable constant to a unique value before programming each device such that __DirAct__ devices may uniquely identify themselves and their peers.

__DirAct__ devices also recognise [Eddystone-UID](https://github.com/google/eddystone/tree/master/eddystone-uid#eddystone-uid) beacons which use a _Namespace ID_ which matches the NAMESPACE_FILTER_ID.  Such beacons are then uniquely identified by the lower 32 bits of their _Instance ID_.

__DirAct__ devices transmit advertising packets which include _manufacturer specific data_ using the [Bluetooth-SIG-assigned Company Identifier](https://www.bluetooth.com/specifications/assigned-numbers/company-identifiers/) of Code Blue Consulting (0x0583), which co-developed __DirAct__.  Developers may continue to use this company identifier for experimental and educational purposes.  However, __company identifier 0x0583 may NOT be used for commercial use of the DirAct software__.  An entity may [request a company identifier from the Bluetooth SIG](https://www.bluetooth.com/specifications/assigned-numbers/company-identifiers/) and use this instead.  [Contact us](https://www.reelyactive.com/contact/) if in doubt.


License
-------

MIT License

Copyright (c) 2019-2021 [reelyActive](https://www.reelyactive.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
