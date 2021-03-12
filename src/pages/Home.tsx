import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  BluetoothLE,
  DescriptorParams,
  WriteCharacteristicParams,
  CharacteristicParams,
  OperationResult,
} from "@ionic-native/bluetooth-le";
import "./Home.css";
import { AndroidPermissions } from "@ionic-native/android-permissions";
import React, { useState } from "react";
let notiMsg: string;
//BleuIO dongle info
const DONGLE_SERVICE_UUID = "0783B03E-8535-B5A0-7140-A304D2495CB7";
const DONGLE_CHAR_TX_UUID = "0783B03E-8535-B5A0-7140-A304D2495CB8";
const DONGLE_CHAR_RX_UUID = "0783B03E-8535-B5A0-7140-A304D2495CBA";
const DONGLE_FLOW_CONTROL_UUID = "0783B03E-8535-B5A0-7140-A304D2495CB9";
const ccc_on = new Uint8Array([0x01]);
let devices: { address: string; name: string }[] = [];
const Home: React.FC = () => {
  const [deviceList, setDeviceList] = useState<any>([]);
  const [dongleID, setDongleID] = useState<string>();
  const [response, setResponse] = useState<string>();
  const [text, setText] = useState<string>();
  const [loading, setLoading] = useState<string>();
  const [deviceConnectionStatus, setDeviceConnectionStatus] = useState<string>(
    "Not Connected"
  );
  //Scan for BleuIO Dongle
  const scanDongle = () => {
    setLoading("Scanning...");
    BluetoothLE.initialize().subscribe((ble) => {
      //console.log("ble stastus", ble.status); // logs 'enabled'
    });
    let scanParam = {
      services: [],
      allowDuplicates: true,
      scanMode: BluetoothLE.SCAN_MODE_LOW_LATENCY,
      matchMode: BluetoothLE.MATCH_MODE_AGGRESSIVE,
      matchNum: BluetoothLE.MATCH_NUM_MAX_ADVERTISEMENT,
      callbackType: BluetoothLE.CALLBACK_TYPE_ALL_MATCHES,
    };
    AndroidPermissions.checkPermission(
      AndroidPermissions.PERMISSION.ACCESS_FINE_LOCATION
    ).then(
      (result) => {
        if (result.hasPermission) {
          //console.log("Has permission?", result.hasPermission);
          BluetoothLE.startScan(scanParam).subscribe((device) => {
            devices.push({ address: device.address, name: device.name });
            //console.log("the devices", JSON.stringify(devices));
          });
        } else {
          AndroidPermissions.requestPermission(
            AndroidPermissions.PERMISSION.ACCESS_FINE_LOCATION
          );
        }
      },
      (err) => console.log("Has permission?", err)
    );

    setTimeout(() => {
      BluetoothLE.stopScan().then(() => {
        //console.log("scan stopped");
        let bleuIOdev = devices.filter((d) => {
          return d.name === "BleuIO";
        });
        //console.log("the devices", JSON.stringify(bleuIOdev));
        setDeviceList(bleuIOdev);
        setLoading("");
      });
    }, 3000);
  };

  const connectToDongle = (e: string) => {
    setDongleID(e);

    BluetoothLE.connect({ address: e, autoConnect: false }).subscribe(
      (peripheralData) => {
        //console.log("peripheral data", JSON.stringify(peripheralData));
        setDeviceConnectionStatus(peripheralData.status);
        //BLE services
        BluetoothLE.discover({ address: e }).then(
          (services) => {
            //console.log("Services: " + JSON.stringify(services));
          },
          (error) => {
            //console.log("Service error: " + JSON.stringify(error));
            BluetoothLE.services({ address: e });
          }
        );
      }
    );
  };

  const sendMessage = () => {
    if (deviceConnectionStatus === "connected") {
      //console.log("Going into settingNotification!");
      let notiService = setupNotification(dongleID!);
      if (notiService !== false) {
        notiService.subscribe(onNotificationSuccess, onNotificationFailure);
        setTimeout(() => {
          let wQwRmsg: WriteCharacteristicParams = {
            address: dongleID!,
            service: DONGLE_SERVICE_UUID,
            characteristic: DONGLE_FLOW_CONTROL_UUID,
            value: BluetoothLE.bytesToEncodedString(ccc_on),
            type: "noResponse",
          };
          BluetoothLE.write(wQwRmsg);
          writeBleData(text!, null);
        }, 1500);
      } else {
        //console.log("setting notification failed!");
      }
    } //end inotificatio set
  };

  function stringToBytes(string: string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
      array[i] = string.charCodeAt(i);
    }
    return array.buffer;
  }

  async function writeBleData(cmd: string, value: string | null) {
    //let ourMsg: string = value ? cmd + value + "    " : cmd + "    ";
    let ourMsg: string = cmd;
    let msgToSend = new Uint8Array(stringToBytes(ourMsg));
    let writeParam: WriteCharacteristicParams = {
      address: dongleID!,
      service: DONGLE_SERVICE_UUID,
      characteristic: DONGLE_CHAR_RX_UUID,
      value: BluetoothLE.bytesToEncodedString(msgToSend),
      type: "noResponse",
    };
    BluetoothLE.write(writeParam);
    //console.log("Send Write Request= " + ourMsg);
  }
  function setupNotification(dongleID: string) {
    let isServiceOK: any = false;
    let isCharacOK: any = false;
    let counter = 0;
    let notiParams: DescriptorParams = {
      address: dongleID,
      service: DONGLE_SERVICE_UUID,
      characteristic: DONGLE_CHAR_TX_UUID,
    };

    while (!isCharacOK && !isServiceOK) {
      counter++;
      if (!isServiceOK) {
        isServiceOK = setupBleServices(dongleID);
      }
      if (!isCharacOK) {
        isCharacOK = setupCharacteristics(dongleID);
      }
      if (counter > 100) {
        return false;
      }
    }

    return BluetoothLE.subscribe(notiParams);
  }

  async function setupBleServices(dongleID: string) {
    let success = false;
    await BluetoothLE.services({ address: dongleID! }).then(
      (services) => {
        //console.log("Services: " + JSON.stringify(services));
        success = true;
      },
      (error) => {
        //console.log("Service error: " + JSON.stringify(error));
        success = false;
      }
    );

    return success;
  }

  async function setupCharacteristics(dongleID: string) {
    let success = false;
    let charParam: CharacteristicParams = {
      address: dongleID!,
      service: DONGLE_SERVICE_UUID,
    };

    await BluetoothLE.characteristics(charParam).then(
      (characteristics) => {
        //console.log("Services: " + JSON.stringify(characteristics));
        success = true;
      },
      (error) => {
        //console.log("Service error: " + JSON.stringify(error));
        success = false;
      }
    );

    return success;
  }

  function onNotificationSuccess(buffer: OperationResult) {
    if (buffer.status === "subscribed") {
      //isNotificationSet = true;
      //setIsNotificationSet((isNotificationSet) => (isNotificationSet = true));
    }
    if (buffer.value) {
      var byteString = BluetoothLE.encodedStringToBytes(buffer.value);
      notiMsg = BluetoothLE.bytesToString(byteString);
      //console.log("Value: " + buffer.value);
      //console.log("Value parsed: " + notiMsg);
      //console.log("Notification msg: " + notiMsg);
      setResponse(notiMsg);
    }
  }
  function retrySubscribe() {
    let notiParams: DescriptorParams = {
      address: dongleID!,
      service: DONGLE_SERVICE_UUID,
      characteristic: DONGLE_CHAR_TX_UUID,
    };
    BluetoothLE.subscribe(notiParams).subscribe(
      onNotificationSuccess,
      onNotificationFailure
    );
  }

  function onNotificationFailure(error: any) {
    if (error.message !== "Already subscribed") {
      //isNotificationSet = false;
      //setIsNotificationSet((isNotificationSet) => (isNotificationSet = false));
      //console.log("Failed to get Notification: " + JSON.stringify(error));
      if (error.error !== "neverConnected") {
        retrySubscribe();
      }
    }
    if (error.message === "Device isn't connected") {
      BluetoothLE.close({
        address: dongleID!,
      });
    }
    if (error.error === "isDisconnected") {
      //console.log("Disconnected...");
    }
  }
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle slot="start">BleuIO SPS</IonTitle>
          <IonTitle size="small" slot="end">
            {deviceConnectionStatus}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="container ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle slot="start">BleuIO SPS</IonTitle>
            <IonTitle size="small" slot="end">
              {deviceConnectionStatus}
            </IonTitle>
          </IonToolbar>
        </IonHeader>
        <br />
        <br />
        <IonButton color="primary" onClick={scanDongle}>
          Scan for BleuIO devices
        </IonButton>
        <br />
        {loading}
        <ul>
          {deviceList &&
            deviceList.length > 0 &&
            deviceList.map((d: any) => (
              <IonButton
                color="success"
                onClick={() => connectToDongle(d.address)}
              >
                Connect to {d.name} <br /> Address: {d.address}
              </IonButton>
            ))}
        </ul>
        <br />
        <IonInput
          value={text}
          placeholder="Write message"
          onIonChange={(e) => setText(e.detail.value!)}
        ></IonInput>
        <IonButton
          disabled={deviceConnectionStatus !== "connected" && !text}
          color="warning"
          onClick={sendMessage}
        >
          Write Message
        </IonButton>
        {response && (
          <>
            Response : {response} <br />
          </>
        )}
        <br />
        <br />
        <br />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          Learn more about BleuIO https://www.bleuio.com/
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
