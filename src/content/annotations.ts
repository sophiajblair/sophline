export type TipId =
  | "feed"
  | "ben"
  | "study"
  | "toothpaste"
  | "holiday"
  | "phishing"
  | "call"
  | "location"
  | "deepfake"
  | "wrapped";

export type Annotation = {
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  sourceIds: string[];
  accuracy?: string;
};

export const annotations: Record<TipId, Annotation> = {
  feed: {
    eyebrow: "the algorithm",
    title: "you never said you liked that.",
    body: "you just stopped scrolling for two seconds. that counts. the app’s policy lists usage, inferred interests and even keystroke patterns among the data it can collect.",
    detail: "the slop statistic in the plan is from a test of YouTube Shorts, not this fictional feed. we are not calling TikTok ‘21% slop’.",
    sourceIds: ["wsj", "ttuk", "ttrow", "slop", "ttai"],
  },
  ben: {
    eyebrow: "a real person did the experiment",
    title: "someone bought every ai ad they saw for a week.",
    body: "BENOFTHEWEEK tested products advertised with AI-made ads, so you do not have to. the source plan only verified the video metadata, chapters and auto-captions, so this site does not make claims about product safety.",
    sourceIds: ["ben", "bbg"],
  },
  study: {
    eyebrow: "who is the homework helper telling?",
    title: "it answered the maths. it kept the feeling.",
    body: "AI tutors and homework chatbots are moving into schools, and 2026 reporting has questioned them, including an investigation that found faulty lesson plans and unhappy students. a chat is also data: what a child says about how they feel, and who can see it, is worth checking before they use one.",
    detail: "this is a made-up app. none of its settings come from a real product, and we are not saying any real homework helper does this.",
    sourceIds: ["alphacnn", "alpha404", "alphawbur"],
  },
  toothpaste: {
    eyebrow: "it didn’t need to listen",
    title: "the text itself was private.",
    body: "personal whatsapp chats are end-to-end encrypted. the ad doesn’t prove anyone was listening either. advertisers can still match customer lists, infer from activity, and connect accounts you choose to link.",
    detail: "we can’t tell you which mechanism caused one ad. you can’t audit it. that’s the point.",
    sourceIds: ["wapq", "wae2e", "waads", "metaca", "bbcmyth", "neu"],
  },
  holiday: {
    eyebrow: "same trick, different ad",
    title: "you said ‘sure’ to a friend. a travel ad showed up.",
    body: "the chat itself was end-to-end encrypted, so the ad didn’t need the words. advertisers can still match customer lists, infer from what you watch and search, and connect accounts you choose to link. a friend looking at flights is a strong signal too.",
    detail: "we can’t tell you which mechanism put this ad here. you can’t audit it. that’s the point.",
    sourceIds: ["wapq", "wae2e", "waads", "metaca", "bbcmyth", "neu"],
  },
  phishing: {
    eyebrow: "this is a fake",
    title: "the typos are gone.",
    body: "ai can make social engineering cleaner and more specific. the made-up buttons here cannot submit anything; the story, urgency and sender address are the red flags.",
    detail: "the FBI numbers are US complaint data. an AI mention does not prove AI caused a loss.",
    sourceIds: ["ic3", "ncsc", "govphish"],
  },
  call: {
    eyebrow: "this is a fake · synthetic demo",
    title: "that wasn’t mum.",
    body: "the voice can be built from a few seconds of someone talking in a video they posted. the story is the tell: urgent, secret, send it now.",
    detail: "a made-up word beats a perfect voice. text your family to choose one today; don’t type the word itself in the chat. and call back on a number you already trust. jennifer destefano warned this tech “will erode our sense of ‘familiar’”: the voice you trust most can now be the easiest one to fake.",
    accuracy: "‘as little as three seconds’ is a Starling Bank and McAfee claim, not independent field testing. Starling’s 28% is people who think they were targeted. safe words reduce risk; they do not remove it.",
    sourceIds: ["starling", "starlingsp", "ic3psa", "ftcfam", "ftcai", "destefano", "crvoice", "himum"],
  },
  location: {
    eyebrow: "family circle",
    title: "care can become a coordinate.",
    body: "The Markup reported in 2021 that Life360 sold precise family-location data to brokers. Life360 said in 2022 it would stop most precise-data sales. the dates matter; this is not presented as current policy.",
    sourceIds: ["life360"],
  },
  deepfake: {
    eyebrow: "consent, not detection",
    title: "someone ran the photo through an app.",
    body: "no altered image is shown here. UK law now criminalises making or supplying certain intimate-image generators, and under-18s can use Childline’s Report Remove service.",
    detail: "Ofcom’s investigation cited here was ongoing when the planning source was checked.",
    sourceIds: ["nudify", "rr", "ofdf", "ofgrok"],
  },
  wrapped: {
    eyebrow: "your tiny fake profile",
    title: "this was a guess from about ten taps.",
    body: "the real profile can be built over years, and you have never seen it. TikTok’s policy says it infers interests, gender and age range. UK users can request copies of personal information.",
    sourceIds: ["ttuk", "sar"],
  },
};

export const guide = [
  { title: "feed", copy: "use ‘not interested’, keyword filters and AI-content topic controls where available.", ids: ["ttai", "ttads"] },
  { title: "homework bots", copy: "before a child uses an AI study helper, check what it saves: chat history, voice and mood notes. ask who can see it.", ids: ["alphacnn", "alpha404"] },
  { title: "messages", copy: "keep accounts unlinked if you do not want activity combined. business and AI chats differ from personal chats.", ids: ["wapq", "wae2e"] },
  { title: "scams", copy: "forward suspicious email to report@phishing.gov.uk, texts to 7726, and call back on a number you trust.", ids: ["govphish", "which"] },
  { title: "family safe word", copy: "agree a phrase offline. never share it digitally. use it and the call-back rule together.", ids: ["starling", "starlingsp", "ic3psa"] },
  { title: "your data", copy: "make a subject access request. organisations normally have one month to respond.", ids: ["sar"] },
  { title: "under 18", copy: "Childline’s Report Remove can help remove nude images of under-18s.", ids: ["rr", "osa"] },
];
