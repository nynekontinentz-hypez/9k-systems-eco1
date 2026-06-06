/** Faceless-video production pipeline stages, in order. */
export const STUDIO_STAGES = [
  { key: "idea", label: "Idea", hint: "Hook + angle" },
  { key: "script", label: "Script", hint: "Written + reviewed" },
  { key: "assets", label: "Assets", hint: "VO, b-roll, art" },
  { key: "render", label: "Render", hint: "Cut + exported" },
  { key: "published", label: "Published", hint: "Live on channel" },
] as const;

export type StudioStage = (typeof STUDIO_STAGES)[number]["key"];

export const STAGE_KEYS = STUDIO_STAGES.map((s) => s.key) as StudioStage[];

export function nextStage(stage: StudioStage): StudioStage | null {
  const i = STAGE_KEYS.indexOf(stage);
  return i >= 0 && i < STAGE_KEYS.length - 1 ? STAGE_KEYS[i + 1] : null;
}

export function isStudioStage(value: unknown): value is StudioStage {
  return typeof value === "string" && STAGE_KEYS.includes(value as StudioStage);
}
