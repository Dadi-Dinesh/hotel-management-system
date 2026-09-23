import type { PrintAdapter, PrintJobInput, PrintResult } from "../types";
import { buildEscPosBuffer } from "../escposEncoder";

// Common GATT service UUIDs exposed by generic ESC/POS Bluetooth LE thermal
// printer modules (the many unbranded "58mm/80mm BLE thermal printer"
// boards share these). Real hardware varies by vendor — Web Bluetooth only
// grants access to services listed here or matched by a filter, so this
// list can't be exhaustive. Treat this adapter as best-effort, exactly as
// the Phase 8 brief frames it ("where browser APIs allow").
const CANDIDATE_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // generic printer service used by many BLE thermal modules
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC/Microchip transparent UART, common in cheap BLE printer boards
];

const BLE_CHUNK_SIZE = 180; // conservative write chunk; most stacks negotiate an MTU well above this

let cachedDevice: any = null;
let cachedCharacteristic: any = null;

function isSupported(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as any).bluetooth;
}

/** Must run inside a user gesture (button click) — the browser requires it. */
async function pickDevice(): Promise<any> {
  const bluetooth = (navigator as any).bluetooth;
  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: CANDIDATE_SERVICES,
  });
  return device;
}

async function findWritableCharacteristic(device: any): Promise<any> {
  const server = await device.gatt.connect();
  for (const serviceUuid of CANDIDATE_SERVICES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const service = await server.getPrimaryService(serviceUuid);
      // eslint-disable-next-line no-await-in-loop
      const characteristics = await service.getCharacteristics();
      const writable = characteristics.find((c: any) => c.properties?.write || c.properties?.writeWithoutResponse);
      if (writable) return writable;
    } catch {
      // This device doesn't expose that service — try the next candidate.
    }
  }
  throw new Error("No writable printer characteristic found on this device. It may not be ESC/POS-compatible over BLE.");
}

async function writeBuffer(characteristic: any, buffer: Uint8Array): Promise<void> {
  for (let offset = 0; offset < buffer.length; offset += BLE_CHUNK_SIZE) {
    const chunk = buffer.slice(offset, offset + BLE_CHUNK_SIZE);
    // eslint-disable-next-line no-await-in-loop
    if (characteristic.properties?.writeWithoutResponse) {
      // eslint-disable-next-line no-await-in-loop
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      // eslint-disable-next-line no-await-in-loop
      await characteristic.writeValue(chunk);
    }
  }
}

/**
 * BluetoothAdapter — best-effort Web Bluetooth (Chrome/Edge/Android only,
 * requires HTTPS + a user gesture to pair). Feature-detects and returns a
 * clear, actionable error everywhere else rather than failing silently.
 */
class BluetoothAdapter implements PrintAdapter {
  name = "BLUETOOTH" as const;

  isAvailable(): boolean {
    return isSupported();
  }

  /** Opens the browser's device picker — call this from a click handler. */
  async pair(): Promise<PrintResult> {
    if (!isSupported()) {
      return {
        success: false,
        adapter: this.name,
        error: "Bluetooth printing needs Chrome or Edge (desktop or Android) over HTTPS. Safari and Firefox don't support Web Bluetooth — use Network or Browser printing instead.",
      };
    }
    try {
      const device = await pickDevice();
      const characteristic = await findWritableCharacteristic(device);
      cachedDevice = device;
      cachedCharacteristic = characteristic;
      return { success: true, adapter: this.name, requiresUserAction: true };
    } catch (err: any) {
      return { success: false, adapter: this.name, error: err.message || "Bluetooth pairing was cancelled or failed." };
    }
  }

  async print(job: PrintJobInput): Promise<PrintResult> {
    if (!isSupported()) {
      return { success: false, adapter: this.name, error: "Web Bluetooth is not supported in this browser." };
    }
    try {
      if (!cachedCharacteristic || !cachedDevice?.gatt?.connected) {
        const paired = await this.pair();
        if (!paired.success) return paired;
      }
      const buffer = buildEscPosBuffer(job.data, job.paperWidth);
      await writeBuffer(cachedCharacteristic, buffer);
      return { success: true, adapter: this.name };
    } catch (err: any) {
      return { success: false, adapter: this.name, error: err.message || "Bluetooth print failed." };
    }
  }
}

export const bluetoothAdapter = new BluetoothAdapter();
