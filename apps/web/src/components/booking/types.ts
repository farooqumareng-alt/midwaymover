export interface AddressFormState {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

export type CargoType = "BOXES_PACKAGES" | "PALLETS" | "EQUIPMENT_MACHINERY" | "OTHER";

export const EMPTY_ADDRESS: AddressFormState = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
};

export interface BookingFormState {
  pickup: AddressFormState;
  delivery: AddressFormState;
  scheduleNow: boolean;
  scheduledFor: string; // datetime-local input value, only used when !scheduleNow
  cargoType: CargoType | null;
  palletCount: number | null;
  approxWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  pickupForkliftAvailable: boolean;
  pickupDockAvailable: boolean;
  pickupCustomerLoading: boolean;
  pickupDriverAssistNeeded: boolean;
  deliveryForkliftAvailable: boolean;
  deliveryDockAvailable: boolean;
  deliveryReceiverUnloading: boolean;
  deliveryDriverAssistNeeded: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export const INITIAL_FORM_STATE: BookingFormState = {
  pickup: { ...EMPTY_ADDRESS },
  delivery: { ...EMPTY_ADDRESS },
  scheduleNow: true,
  scheduledFor: "",
  cargoType: null,
  palletCount: null,
  approxWeightKg: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  pickupForkliftAvailable: false,
  pickupDockAvailable: false,
  pickupCustomerLoading: false,
  pickupDriverAssistNeeded: false,
  deliveryForkliftAvailable: false,
  deliveryDockAvailable: false,
  deliveryReceiverUnloading: false,
  deliveryDriverAssistNeeded: false,
  contactName: "",
  contactPhone: "",
  contactEmail: "",
};

export interface PriceBreakdown {
  baseFeeCents: number;
  distanceFeeCents: number;
  weightFeeCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export type QuoteApiResult =
  | {
      status: "quoted";
      quoteId: string;
      shipmentId: string;
      expiresAt: string;
      vehicleClass: string;
      specialReviewRequired: boolean;
      price: PriceBreakdown;
    }
  | { status: "specialReviewRequired"; shipmentId: string; message: string };
