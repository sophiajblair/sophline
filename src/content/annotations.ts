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
    eyebrow: "tiktok, 2021",
    title: "the wall street journal built bot accounts to see how fast tiktok learns.",
    body: "in 2021 the wall street journal investigated tiktok’s algorithm using automated accounts. it reported that the app learned interests mainly from how long a viewer lingered on a video, then narrowed what it showed. tiktok’s own policy lists usage and inferred interests among the data it collects.",
    detail: "on this phone: you only paused on a clip for a couple of seconds. that was enough of a signal. the slop statistic in the planning notes is from a YouTube Shorts test, not this fictional feed.",
    sourceIds: ["wsj", "ttuk", "ttrow"],
  },
  ben: {
    eyebrow: "a creator, 2025",
    title: "someone bought every ai ad they saw for a week.",
    body: "in april 2025 the youtuber BENOFTHEWEEK bought the products shown to him in ai-made ads for a week, and made a video about what showed up. the ads are made to look real, so the only way to find out was to buy.",
    detail: "this site doesn’t make any claim about the safety of the products in that video.",
    sourceIds: ["ben", "bbg"],
  },
  study: {
    eyebrow: "alpha school, 2026",
    title: "an ai-powered school, under the microscope.",
    body: "alpha school is a private school built around ai teaching. in early 2026, cnn asked whether ai schooling is “the future, or a risky bet”, 404 media reported students “being treated like guinea pigs”, and a wbur investigation reported faulty lesson plans and unhappy students.",
    detail: "the study buddy app on this phone is made up, and we aren’t saying any real product keeps these things. the real question: what does an ai tutor save about a child, and who can see it?",
    sourceIds: ["alphacnn", "alpha404", "alphawbur"],
  },
  toothpaste: {
    eyebrow: "‘active listening’, 2024",
    title: "an ad company pitched targeting you by what you say.",
    body: "in august 2024 404 media published a pitch deck for ‘active listening’, an ad-targeting product said to use what people say near their devices. whether it works as claimed hasn’t been shown, and the bbc has argued that phones secretly listening is a myth. personal whatsapp chats are end-to-end encrypted.",
    detail: "on this phone: the toothpaste ad came after a chat about toothpaste. we can’t tell you which route caused it. advertisers can match customer lists, infer from your activity, and connect accounts you’ve linked. you can’t audit any of it.",
    sourceIds: ["cmg404", "cmgg", "bbcmyth", "wae2e", "metaca", "neu"],
  },
  holiday: {
    eyebrow: "whatsapp, 2025",
    title: "a messaging app started showing ads. your chats weren’t the source.",
    body: "whatsapp introduced ads in its updates tab in 2025, and says personal chats stay end-to-end encrypted and aren’t used to target them. so when a travel ad follows a chat about holidays, the cause is more likely other signals: what you search and watch, shops that have your details, or accounts you’ve linked.",
    detail: "on this phone: you said ‘sure’ to a friend, then a booking ad appeared. we can’t tell you which route caused it, and neither can you. that’s the point.",
    sourceIds: ["waads", "wapq", "wae2e", "metaca"],
  },
  phishing: {
    eyebrow: "uk cyber agency, 2025",
    title: "the uk’s cyber agency says ai makes scam emails harder to spot.",
    body: "in may 2025 the ncsc assessed that ai will make social engineering, including phishing, more effective through 2027. the fbi’s 2025 internet crime report also counts the cost of online fraud in the us.",
    detail: "on this phone: the email has no typos and a believable story. the made-up buttons can’t submit anything. urgency, secrecy and the sender address are the red flags. the FBI numbers are US complaint data, and an AI mention doesn’t prove AI caused a loss.",
    sourceIds: ["ncsc", "ic3", "govphish"],
  },
  call: {
    eyebrow: "jennifer destefano, 2023",
    title: "a mother heard her daughter’s voice. it wasn’t her.",
    body: "in 2023 jennifer destefano told a us senate hearing about a call in which she heard what sounded like her daughter’s voice, in an ai ‘kidnapping’ scam. she warned that the technology “will erode our sense of ‘familiar’”: the voice you trust most can now be the easiest to fake.",
    detail: "on this phone: the call used a made-up number and a voice that claimed to be family. a safe word you agreed offline beats a perfect voice, and so does calling back on a number you already trust. ‘as little as three seconds’ is a Starling Bank and McAfee claim, not independent testing. safe words reduce risk; they don’t remove it.",
    sourceIds: ["destefano", "starling", "starlingsp", "ic3psa", "ftcai", "crvoice", "himum"],
  },
  location: {
    eyebrow: "life360, 2021",
    title: "a family-safety app sold where families were.",
    body: "the markup reported in 2021 that life360 sold precise location data from its users to data brokers. life360 said in 2022 it would stop selling most precise location data. the dates matter: this is a past case, not current policy.",
    detail: "on this phone: your family circle shows a child leaving school in real time. care can become a coordinate.",
    sourceIds: ["life360"],
  },
  deepfake: {
    eyebrow: "x and grok, 2026",
    title: "a chatbot’s image tool led to a regulator’s investigation.",
    body: "in january 2026 ofcom opened an investigation into x over sexualised imagery made with its grok ai tool. in the uk, making or supplying certain intimate-image generators is now a crime, and under-18s can use childline’s report remove service.",
    detail: "on this phone: no altered image is shown. someone ran a party photo through an app. it’s about consent, not detection. the ofcom investigation was ongoing when the planning source was checked.",
    sourceIds: ["ofgrok", "nudify", "rr", "ofdf"],
  },
  wrapped: {
    eyebrow: "tiktok, 2025",
    title: "a regulator fined tiktok €530m over european users’ data.",
    body: "in may 2025 ireland’s data protection commission fined tiktok €530 million over transfers of european users’ data and ordered corrective measures. tiktok’s own policy says it infers interests, gender and age range, and in the uk you can ask any company for a copy of what it holds on you.",
    detail: "on this phone: your fake profile was a guess from about ten taps. the real one can be built over years, and you’ve never seen it.",
    sourceIds: ["dpc", "ttuk", "sar"],
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
