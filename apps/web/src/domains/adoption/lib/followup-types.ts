export interface FollowupRow {
  id: string;
  applicationId: string;
  stage: "j15" | "j90" | "j365";
  status: "pending" | "sent" | "skipped";
  dueAt: Date;
  sentAt: Date | null;
}
