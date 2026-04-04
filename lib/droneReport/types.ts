export interface DroneReportEntry {
  id: string;
  createdAt: number;
  title: string;
  /** YYYY-MM-DD flight / capture date */
  reportDate: string;
  /** Address, grid, or lat/long — entered manually */
  locationNotes: string;
  description: string;
  photoUrls: string[];
}

export const MAX_DRONE_PHOTOS = 12;
