import axios from 'axios';
import { publicIpv4 } from 'public-ip';
import DeviceDetector from 'device-detector-js';

export interface CollectedDeviceInfo {
  ip_address: string;
  location_data: {
    country: string;
    city: string;
    region: string;
  };
  device_data: {
    os: DeviceDetector['os'] | null;
    client: DeviceDetector['client'] | null;
    device: DeviceDetector['device'] | null;
    userAgent: string;
  };
}

export const collectDeviceAndLocationData =
  async (): Promise<CollectedDeviceInfo> => {
    let ipAddress = '';
    let locationData = { country: '', city: '', region: '' };

    try {
      ipAddress = await publicIpv4();
      const locationResponse = await axios.get(
        `https://ipapi.co/${ipAddress}/json/`
      );
      locationData = {
        country: locationResponse.data.country_name || 'Unknown',
        city: locationResponse.data.city || 'Unknown',
        region: locationResponse.data.region || 'Unknown',
      };
    } catch (error) {
      console.error('Error collecting device/location data:', error);
      ipAddress = 'unknown';
    }

    const detector = new DeviceDetector();
    const deviceInfo = detector.parse(navigator.userAgent);

    return {
      ip_address: ipAddress,
      location_data: locationData,
      device_data: {
        os: deviceInfo.os,
        client: deviceInfo.client,
        device: deviceInfo.device,
        userAgent: navigator.userAgent,
      },
    };
  };
