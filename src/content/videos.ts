export type VideoSlot = {
  id: string;
  scene: string;
  label: string;
  intendedContent: string;
  suggestedLength: string;
  aspectRatio: "9:16" | "16:9";
  filePath: string;
  webmPath: string;
};

/**
 * Hannah supplies every clip. Keep paths stable: a matching file dropped into
 * public/videos/ appears automatically; missing files render a labelled poster.
 */
export const videos: VideoSlot[] = [
  {
    id: "feed-cat-opera",
    scene: "AI slop feed",
    label: "cat opera",
    intendedContent: "An obviously synthetic cat performing a tiny, overdramatic opera. No real app UI or logos.",
    suggestedLength: "6–10 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/feed-cat-opera.mp4",
    webmPath: "videos/feed-cat-opera.webm",
  },
  {
    id: "feed-flooded-kitchen",
    scene: "AI slop feed",
    label: "flooded kitchen",
    intendedContent: "An obviously impossible kitchen filling with blue jelly or water; playful rather than disaster footage.",
    suggestedLength: "6–10 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/feed-flooded-kitchen.mp4",
    webmPath: "videos/feed-flooded-kitchen.webm",
  },
  {
    id: "feed-motivational-ceo",
    scene: "AI slop feed",
    label: "motivational CEO",
    intendedContent: "A fictional, obviously synthetic hustle-guru monologue. No likeness of a real person.",
    suggestedLength: "6–10 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/feed-motivational-ceo.mp4",
    webmPath: "videos/feed-motivational-ceo.webm",
  },
  {
    id: "doorbell-porch",
    scene: "Doorbell notification",
    label: "front-door camera",
    intendedContent: "A staged porch clip with a consenting performer or an empty porch. Avoid faces of passers-by and real addresses.",
    suggestedLength: "5–8 seconds, seamless loop",
    aspectRatio: "16:9",
    filePath: "videos/doorbell-porch.mp4",
    webmPath: "videos/doorbell-porch.webm",
  },
  {
    id: "ai-gadget-ad",
    scene: "Ben of the Week interlude",
    label: "fictional AI gadget ad",
    intendedContent: "An original, obviously AI-made ad for the fictional Everything Gadget. No product, platform or creator footage.",
    suggestedLength: "6–10 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/ai-gadget-ad.mp4",
    webmPath: "videos/ai-gadget-ad.webm",
  },
];

export const videoById = Object.fromEntries(videos.map((video) => [video.id, video]));
