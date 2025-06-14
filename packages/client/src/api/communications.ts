import { api } from "./client";
import type {
  ApiResponse,
  AudienceCounts,
  EmailCampaign,
  SendCampaignInput,
} from "./types";

/** Back-office refuge : communication (campagnes email / newsletter). */
export const communicationsApi = {
  list: () =>
    api.get<ApiResponse<EmailCampaign[]>>("/api/v1/shelter/communications").then((r) => r.data),
  audiences: () =>
    api.get<ApiResponse<AudienceCounts>>("/api/v1/shelter/communications/audiences").then((r) => r.data),
  send: (input: SendCampaignInput) =>
    api.post<ApiResponse<EmailCampaign>>("/api/v1/shelter/communications", input).then((r) => r.data),
};
