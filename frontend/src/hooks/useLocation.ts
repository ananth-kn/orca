import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const USE_FAKE_LOCATION = true;

const FAKE_LATITUDE = 12.848333;
const FAKE_LONGITUDE = 74.836389;

export function useLocation() {
  useEffect(() => {
    const { setLocation, refreshMarine } = useAppStore.getState();

    if (USE_FAKE_LOCATION) {
      setLocation({
        lat: FAKE_LATITUDE,
        lng: FAKE_LONGITUDE,
        speedKnots: 0,
        headingDeg: 0,
      });

      void refreshMarine();

      console.log(
        `[GPS] Using FAKE location: ${FAKE_LATITUDE}, ${FAKE_LONGITUDE}`
      );

      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const speedKnots = position.coords.speed
          ? position.coords.speed * 1.94384
          : 0;

        const headingDeg = position.coords.heading ?? 0;

        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speedKnots,
          headingDeg,
        });

        void refreshMarine();

        console.log(
          `[GPS] Real location: ${position.coords.latitude}, ${position.coords.longitude}`
        );
      },
      (error) => {
        console.error('[GPS] Error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);
}