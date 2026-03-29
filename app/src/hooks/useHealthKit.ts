import { useState, useEffect } from "react";
import { Platform, Alert } from "react-native";

// HealthKit only works on real iOS devices, not simulators
const isIOS = Platform.OS === "ios";

interface HealthData {
  steps?: number;
  weight?: number;
  water_ml?: number;
  body_fat?: number;
}

export function useHealthKit() {
  const [authorized, setAuthorized] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!isIOS) return;
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const AppleHealthKit = require("react-native-health").default;
      AppleHealthKit.isAvailable((err: any, result: boolean) => {
        setAvailable(result && !err);
      });
    } catch {
      setAvailable(false);
    }
  };

  const requestPermissions = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!isIOS || !available) {
        resolve(false);
        return;
      }
      try {
        const AppleHealthKit = require("react-native-health").default;
        const { Permissions } = require("react-native-health");
        const permissions = {
          permissions: {
            read: [
              Permissions.Steps,
              Permissions.Weight,
              Permissions.BodyFatPercentage,
              Permissions.Water,
              Permissions.HeartRate,
            ],
            write: [],
          },
        };
        AppleHealthKit.initHealthKit(permissions, (err: any) => {
          if (err) { resolve(false); return; }
          setAuthorized(true);
          resolve(true);
        });
      } catch {
        resolve(false);
      }
    });
  };

  const fetchTodayData = (): Promise<HealthData> => {
    return new Promise(async (resolve) => {
      if (!isIOS || !available) { resolve({}); return; }

      const auth = authorized || await requestPermissions();
      if (!auth) { resolve({}); return; }

      const AppleHealthKit = require("react-native-health").default;
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const now = new Date().toISOString();
      const options = { startDate: startOfDay, endDate: now };
      const result: HealthData = {};

      const promises = [
        // Steps
        new Promise<void>((res) => {
          AppleHealthKit.getStepCount(options, (err: any, data: any) => {
            if (!err && data?.value) result.steps = Math.round(data.value);
            res();
          });
        }),
        // Weight (most recent)
        new Promise<void>((res) => {
          AppleHealthKit.getLatestWeight({}, (err: any, data: any) => {
            if (!err && data?.value) result.weight = Math.round(data.value * 10) / 10;
            res();
          });
        }),
        // Body fat (most recent)
        new Promise<void>((res) => {
          AppleHealthKit.getLatestBodyFatPercentage({}, (err: any, data: any) => {
            if (!err && data?.value) result.body_fat = Math.round(data.value * 10) / 10;
            res();
          });
        }),
        // Water
        new Promise<void>((res) => {
          AppleHealthKit.getWaterSamples(options, (err: any, data: any[]) => {
            if (!err && data?.length) {
              const total = data.reduce((sum, d) => sum + (d.value ?? 0), 0);
              result.water_ml = Math.round(total * 1000); // L to ml
            }
            res();
          });
        }),
      ];

      await Promise.all(promises);
      resolve(result);
    });
  };

  return { available, authorized, requestPermissions, fetchTodayData };
}
