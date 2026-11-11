import type { AiExtraction, TripExtraction } from "@/lib/schemas";

export const baseExtraction: TripExtraction = {
  pickupArea: "Brgy. San Antonio, Pasig",
  destination: "St. Luke's Medical Center BGC",
  appointmentDate: "2026-11-17",
  appointmentTime: "09:00",
  tripPurpose: "checkup",
  mobility: "wheelchair_can_transfer",
  floorsWithoutElevator: 0,
  equipment: [],
  companions: 1,
  recurring: false,
  recurrenceNote: null,
  emergencySignals: false,
  missingInfo: [],
  caregiverSummary: "Wheelchair user going to a check-up.",
};

export const x = (over: Partial<TripExtraction> = {}): TripExtraction => ({ ...baseExtraction, ...over });

export const aiRaw = (over: Partial<AiExtraction> = {}): AiExtraction => ({ ...baseExtraction, ...over });
