export type VideoSlot = {
  id: string;
  scene: string;
  label: string;
  intendedContent: string;
  suggestedLength: string;
  aspectRatio: "9:16" | "16:9";
  filePath: string;
  webmPath?: string;
  /** Set once Hannah has supplied the clip: the slot then shows this frame instead of the TODO label. */
  posterPath?: string;
};

/**
 * Hannah supplies every clip. Keep paths stable: a matching file dropped into
 * public/videos/ appears automatically; missing files render a labelled poster.
 */
export const videos: VideoSlot[] = [
  {
    id: "toothpaste-ad",
    scene: "Toothpaste ad",
    label: "toothpaste ad",
    intendedContent: "The sponsored toothpaste ad that appears in the feed after the ‘we need toothpaste’ message. Supplied by Hannah.",
    suggestedLength: "8 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/toothpaste-ad.mp4",
    posterPath: "videos/toothpaste-ad-poster.jpg",
  },
  {
    id: "feed-cat-opera",
    scene: "AI slop feed",
    label: "cat opera",
    intendedContent: "An obviously synthetic cat performing a tiny, overdramatic opera. No real app UI or logos.",
    suggestedLength: "6–10 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/feed-cat-opera.mp4",
    posterPath: "videos/feed-cat-opera-poster.jpg",
  },
  {
    id: "feed-flooded-kitchen",
    scene: "AI slop feed",
    label: "flooded kitchen",
    intendedContent: "An obviously impossible kitchen filling with blue jelly or water; playful rather than disaster footage.",
    suggestedLength: "6–10 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/feed-flooded-kitchen.mp4",
    posterPath: "videos/feed-flooded-kitchen-poster.jpg",
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
    id: "ai-gadget-ad",
    scene: "Ben of the Week interlude",
    label: "fictional AI gadget ad",
    intendedContent: "An original, obviously AI-made ad for the fictional Everything Gadget. No product, platform or creator footage.",
    suggestedLength: "6–10 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/ai-gadget-ad.mp4",
    webmPath: "videos/ai-gadget-ad.webm",
  },
  {
    id: "booking-ad",
    scene: "Angela holiday text",
    label: "booking.com ad",
    intendedContent: "The sponsored Booking.com ad that appears in the feed after Angela’s holiday text. Supplied by Hannah.",
    suggestedLength: "8 seconds, seamless loop",
    aspectRatio: "9:16",
    filePath: "videos/booking-ad.mp4",
    posterPath: "videos/booking-ad-poster.jpg",
  },
];

export const videoById = Object.fromEntries(videos.map((video) => [video.id, video]));
