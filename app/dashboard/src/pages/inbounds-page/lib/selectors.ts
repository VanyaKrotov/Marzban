import { InboundModel } from "./types";

export function tryParseInbound(json: string): InboundModel | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
