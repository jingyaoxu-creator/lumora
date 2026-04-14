/** A site the user wants monitored on a schedule */
export interface MonitoredSite {
  id: string;
  userId: string;
  url: string;
  domain: string;
  frequency: "daily" | "weekly";
  notifyOnDrop: boolean; // Email when score drops > threshold
  dropThreshold: number; // e.g. 5 means alert if score drops by 5+
  lastScore: number | null;
  lastScannedAt: string | null;
  createdAt: string;
}

/** Score change event for alerts */
export interface ScoreChange {
  url: string;
  domain: string;
  previousScore: number;
  currentScore: number;
  change: number; // negative = drop
  scannedAt: string;
}
