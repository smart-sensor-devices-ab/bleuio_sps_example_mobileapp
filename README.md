With this Ionic mobile app , we're going to send messages back and forth between computer and mobile phone using SPS.
**Requirements**

- [BleuIO](https://www.bleuio.com/) connected to a pc with ionic
- installed. [Ionic framework](https://ionicframework.com/docs/) Mobile
- phone. [Android studio.](https://developer.android.com/studio)
  We will set BleuIO dongle as peripheral and our mobile app will connect to this dongle. Then we can start sending data back and forth.

Connect your BleuIO dongle to computer.

Connect to dongle comport and start advertising using AT+ADVSTART.

Clone this git repo. `git clone https://github.com/smart-sensor-devices-ab/bleuio_sps_example_mobileapp.git`

go inside the folder and run `npm install`

if you run `ionic serve` you will be able to see the layout on the browser. But for this app we need mobile phones native feature. Therefore connect your android phone to your computer and run `ionic cap run android`

Your app will install and open up on your mobile phone.

**Click scan for BleuIO devices**

On the scan result, select one of your dongle to connect.

After successful connection , you can send data back and forth and you will be able to see your messages on both mobile app and the terminal.

For better understanding , watch the video.

https://youtu.be/9GwYnEmdCHI

To learn more about BleuIO AT commands , visit https://www.bleuio.com/getting_started/
