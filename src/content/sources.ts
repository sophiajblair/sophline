export type Source = {
  id: string;
  title: string;
  site: string;
  date?: string;
  href: string;
  tag: string;
  extractOnly?: boolean;
};

export const sources: Source[] = [
  { id: "ftc", title: "FTC says Ring employees illegally surveilled customers", site: "ftc.gov", date: "31 May 2023", href: "https://www.ftc.gov/news-events/news/press-releases/2023/05/ftc-says-ring-employees-illegally-surveilled-customers-failed-stop-hackers-taking-control-users", tag: "doorbell", extractOnly: true },
  { id: "ftcc", title: "FTC complaint against Ring", site: "ftc.gov", href: "https://www.ftc.gov/system/files/ftc_gov/pdf/complaint_ring.pdf", tag: "doorbell", extractOnly: true },
  { id: "ringpn", title: "Ring Privacy Notice", site: "ring.com", date: "updated 5 June 2026", href: "https://ring.com/privacy-notice", tag: "doorbell" },
  { id: "rfa", title: "Ring sunsets Request for Assistance", site: "blog.ring.com", date: "24 Jan 2024", href: "https://blog.ring.com/about-ring/ring-announces-new-neighbors-app-features-sunsets-request-for-assistance-post/", tag: "doorbell" },
  { id: "axon", title: "Ring announces plans to work with Axon", site: "blog.ring.com", date: "22 Apr 2025", href: "https://blog.ring.com/about-ring/ring-announces-plans-to-work-with-axon-to-bring-community-request-service-to-the-neighbors-app/", tag: "doorbell", extractOnly: true },
  { id: "cr", title: "Ring launches Community Requests", site: "blog.ring.com", date: "4 Sep 2025", href: "https://blog.ring.com/about-ring/ring-launches-community-requests-a-new-way-to-help-your-community/", tag: "doorbell", extractOnly: true },
  { id: "nbc", title: "Amazon no longer working with Flock after Super Bowl ad backlash", site: "nbcnews.com", date: "12 Feb 2026", href: "https://www.nbcnews.com/news/us-news/amazon-no-longer-working-police-tech-flock-safety-super-bowl-ad-rcna258855", tag: "doorbell", extractOnly: true },
  { id: "flock", title: "Ring and Flock cancel partnership", site: "blog.ring.com", date: "12 Feb 2026", href: "https://blog.ring.com/about-ring/ring-and-flock-cancel-partnership/", tag: "doorbell", extractOnly: true },
  { id: "verge", title: "Ring’s lost dog ad sparks surveillance backlash", site: "theverge.com", date: "Feb 2026", href: "https://www.theverge.com/tech/876866/ring-search-party-super-bowl-ad-online-backlash", tag: "doorbell", extractOnly: true },
  { id: "sp", title: "Ring Help: Search Party", site: "ring.com", href: "https://ring.com/support/articles/pkhj7/search-party", tag: "doorbell" },
  { id: "ff", title: "Ring Help: Familiar Faces", site: "ring.com", href: "https://ring.com/support/articles/z3yhg/familiar-faces", tag: "doorbell", extractOnly: true },
  { id: "markey", title: "Amazon’s reply to Sen. Markey on Familiar Faces", site: "markey.senate.gov", date: "21 Nov 2025", href: "https://www.markey.senate.gov/imo/media/doc/amazon_markey_response_ring_frt_november_2025.pdf", tag: "doorbell", extractOnly: true },
  { id: "ffsuit", title: "Ring sued over facial recognition feature", site: "reuters.com", date: "2 Jun 2026", href: "https://www.reuters.com/legal/government/amazons-ring-sued-over-facial-recognition-feature-latest-privacy-concern-2026-06-02/", tag: "doorbell", extractOnly: true },
  { id: "eff", title: "Ring doorbell app packed with third-party trackers", site: "eff.org", date: "Jan 2020", href: "https://www.eff.org/deeplinks/2020/01/ring-doorbell-app-packed-third-party-trackers", tag: "doorbell", extractOnly: true },
  { id: "ap22", title: "Amazon handed Ring footage to police without user consent", site: "apnews.com", date: "Jul 2022", href: "https://apnews.com/article/technology-edward-markey-congress-government-and-politics-244f59188ee3414495452c955c11b89b", tag: "doorbell", extractOnly: true },
  { id: "icocctv", title: "ICO: Home CCTV systems", site: "ico.org.uk", href: "https://ico.org.uk/for-the-public/home-cctv-systems/", tag: "doorbell" },
  { id: "wapq", title: "WhatsApp: Answering your privacy questions", site: "whatsapp.com", href: "https://www.whatsapp.com/privacyquestions", tag: "messages & ads" },
  { id: "wae2e", title: "WhatsApp Help: About end-to-end encryption", site: "faq.whatsapp.com", href: "https://faq.whatsapp.com/820124435853543", tag: "messages & ads" },
  { id: "waads", title: "WhatsApp Ads: advertising built with privacy in mind", site: "whatsappbusiness.com", href: "https://whatsappbusiness.com/whatsapp-ads/privacy/", tag: "messages & ads" },
  { id: "cmg404", title: "The pitch deck for ‘Active Listening’ ad targeting", site: "404media.co", date: "26 Aug 2024", href: "https://www.404media.co/heres-the-pitch-deck-for-active-listening-ad-targeting/", tag: "messages & ads" },
  { id: "cmgg", title: "Pitch deck details plan to listen for ad targeting", site: "gizmodo.com", date: "26 Aug 2024", href: "https://gizmodo.com/pitch-dek-gives-new-details-on-companys-plan-to-listen-to-your-devices-for-ad-targeting-2000491095", tag: "messages & ads" },
  { id: "bbcmyth", title: "Why phones that secretly listen to us are a myth", site: "bbc.com", date: "5 Sep 2019", href: "https://www.bbc.com/news/technology-49585682", tag: "messages & ads" },
  { id: "neu", title: "Northeastern study of 17,000 apps", site: "news.northeastern.edu", date: "6 Jul 2018", href: "https://news.northeastern.edu/2018/07/06/is-your-smartphone-spying-on-you/", tag: "messages & ads", extractOnly: true },
  { id: "metaca", title: "Meta Business Help: customer list custom audiences", site: "facebook.com", href: "https://www.facebook.com/business/help/170456843145568", tag: "messages & ads" },
  { id: "ttuk", title: "TikTok Privacy Policy: EEA, UK and Switzerland", site: "tiktok.com", date: "updated 30 Nov 2025", href: "https://www.tiktok.com/legal/page/eea/privacy-policy/en", tag: "feed & slop" },
  { id: "ttrow", title: "TikTok Privacy Policy: other regions", site: "tiktok.com", date: "updated 8 Jul 2025", href: "https://www.tiktok.com/legal/page/row/privacy-policy/en", tag: "feed & slop" },
  { id: "ttads", title: "TikTok launches £3.99 no-ads subscription in UK", site: "bbc.co.uk", date: "11 May 2026", href: "https://www.bbc.co.uk/news/articles/cn0pgl0vk0qo", tag: "feed & slop" },
  { id: "wsj", title: "WSJ investigation of TikTok’s algorithm", site: "theverge.com", date: "21 Jul 2021", href: "https://www.theverge.com/2021/7/21/22587113/tiktok-algorithm-wsj-investigation-rabbit-hole", tag: "feed & slop" },
  { id: "ttai", title: "More ways to spot and shape AI-generated content", site: "newsroom.tiktok.com", date: "24 Nov 2025", href: "https://newsroom.tiktok.com/more-ways-to-spot-shape-and-understand-ai-generated-content", tag: "feed & slop" },
  { id: "slop", title: "More than 20% of videos shown to new YouTube users are ‘AI slop’", site: "theguardian.com", date: "27 Dec 2025", href: "http://www.theguardian.com/technology/2025/dec/27/more-than-20-of-videos-shown-to-new-youtube-users-are-ai-slop-study-finds", tag: "feed & slop" },
  { id: "dpc", title: "Irish DPC fines TikTok €530m over EEA data transfers", site: "dataprotection.ie", date: "2 May 2025", href: "https://www.dataprotection.ie/en/news-media/latest-news/irish-data-protection-commission-fines-tiktok-eu530-million-and-orders-corrective-measures-following", tag: "feed & slop" },
  { id: "ben", title: "BENOFTHEWEEK: i bought every ai ad i saw for a week", site: "youtube.com", date: "22 Apr 2025", href: "https://www.youtube.com/watch?v=cHKwNuQ2vYE", tag: "ai ads" },
  { id: "bbg", title: "Benjamin de Almeida for Issue 18", site: "boysbygirls.co.uk", date: "21 Jul 2025", href: "https://boysbygirls.co.uk/news/benjamin-de-almeida-for-issue-18", tag: "ai ads" },
  { id: "ic3", title: "FBI IC3: 2025 Internet Crime Report", site: "ic3.gov", date: "Apr 2026", href: "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf", tag: "scams" },
  { id: "ncsc", title: "NCSC: Impact of AI on cyber threat to 2027", site: "ncsc.gov.uk", date: "7 May 2025", href: "https://www.ncsc.gov.uk/report/impact-ai-cyber-threat-now-2027", tag: "scams" },
  { id: "ofdf", title: "Ofcom: deepfakes that demean, defraud and disinform", site: "ofcom.org.uk", date: "23 Jul 2024", href: "https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/deepfakes-demean-defraud-disinform", tag: "scams" },
  { id: "which", title: "Deepfake phone calls: UK survey", site: "which.co.uk", date: "5 Mar 2025", href: "https://www.which.co.uk/news/article/deepfake-phone-calls-a-quarter-of-scam-calls-in-the-uk-are-powered-by-ai-at1BF3N4qkFb", tag: "scams" },
  { id: "govphish", title: "GOV.UK: report internet scams and phishing", site: "gov.uk", href: "https://www.gov.uk/report-suspicious-emails-websites-phishing", tag: "scams" },
  { id: "alphacnn", title: "Is AI schooling the future, or a risky bet?", site: "cnn.com", date: "29 Jan 2026", href: "https://www.cnn.com/2026/01/29/politics/alpha-school-trump-ai-teaching", tag: "gen alpha" },
  { id: "alpha404", title: "Inside an AI-powered private school", site: "404media.co", date: "17 Feb 2026", href: "https://www.404media.co/students-are-being-treated-like-guinea-pigs-inside-an-ai-powered-private-school/", tag: "gen alpha" },
  { id: "alphawbur", title: "Investigation finds faulty lesson plans and unhappy students", site: "wbur.org", date: "23 Mar 2026", href: "https://www.wbur.org/hereandnow/2026/03/23/alpha-school-ai", tag: "gen alpha" },
  { id: "caicnn", title: "Character.AI and Google agree to settle lawsuits", site: "cnn.com", date: "7 Jan 2026", href: "https://www.cnn.com/2026/01/07/business/character-ai-google-settle-teen-suicide-lawsuit", tag: "gen alpha" },
  { id: "pirg", title: "Trouble in Toyland report spurs AI toy sales suspension", site: "pirg.org", date: "Nov 2025", href: "https://pirg.org/edfund/media-center/breaking-ai-toy-removed/", tag: "gen alpha", extractOnly: true },
  { id: "osa", title: "GOV.UK: children on social media changes from July 2025", site: "gov.uk", date: "24 Jul 2025", href: "https://www.gov.uk/government/news/whats-changing-for-children-on-social-media-from-25-july-2025", tag: "gen alpha" },
  { id: "ban", title: "GOV.UK: planned social media ban for under-16s", site: "gov.uk", date: "15 Jun 2026", href: "https://www.gov.uk/government/news/social-media-to-be-banned-for-under-16s-in-landmark-government-move-to-givekids-their-childhood-back", tag: "gen alpha" },
  { id: "life360", title: "Life360 sold precise location data", site: "themarkup.org", date: "6 Dec 2021", href: "https://themarkup.org/privacy/2021/12/06/the-popular-family-safety-app-life360-is-selling-precise-location-data-on-its-tens-of-millions-of-user", tag: "safety & law" },
  { id: "ofgrok", title: "Ofcom investigates X over Grok sexualised imagery", site: "ofcom.org.uk", date: "12 Jan 2026", href: "https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/ofcom-launches-investigation-into-x-over-grok-sexualised-imagery", tag: "safety & law" },
  { id: "nudify", title: "Home Office guidance on intimate image generators", site: "assets.publishing.service.gov.uk", date: "Oct 2026", href: "https://assets.publishing.service.gov.uk/media/6ad08b93c84c8ff1bc8b81e3/Making_or_Supplying_Purported_Intimate_Image_Generators_-_Non-Statutory_Guidance_for_the_Police_-_in_English__2_.pdf", tag: "safety & law" },
  { id: "rr", title: "Childline: Report Remove", site: "childline.org.uk", href: "https://www.childline.org.uk/info-advice/bullying-abuse-safety/online-mobile-safety/report-remove/", tag: "safety & law", extractOnly: true },
  { id: "sar", title: "ICO: getting copies of your information", site: "ico.org.uk", href: "https://ico.org.uk/for-the-public/getting-copies-of-your-information-subject-access-request", tag: "safety & law", extractOnly: true },
  { id: "starling", title: "Starling Bank launches ‘Safe Phrases’ campaign", site: "starlingbank.com", date: "18 Sep 2024", href: "https://www.starlingbank.com/news/starling-bank-launches-safe-phrases-campaign/", tag: "voice cloning" },
  { id: "starlingsp", title: "Starling Bank: Safe Phrases advice", site: "starlingbank.com", href: "https://www.starlingbank.com/safe-phrases/", tag: "voice cloning", extractOnly: true },
  { id: "mcafee", title: "McAfee: AI voice scams on the rise", site: "businesswire.com", date: "May 2023", href: "https://www.businesswire.com/news/home/20230501005587/en/Artificial-Intelligence-Voice-Scams-on-the-Rise-with-1-in-4-Adults-Impacted", tag: "voice cloning", extractOnly: true },
  { id: "destefano", title: "US mother receives AI ‘kidnapped daughter’ scam call", site: "theguardian.com", date: "14 Jun 2023", href: "https://www.theguardian.com/us-news/2023/jun/14/ai-kidnapping-scam-senate-hearing-jennifer-destefano", tag: "voice cloning" },
  { id: "ftcfam", title: "FTC: fake emergency scams", site: "consumer.ftc.gov", href: "https://consumer.ftc.gov/articles/scammers-use-fake-emergencies-steal-your-money", tag: "voice cloning", extractOnly: true },
  { id: "ftcai", title: "FTC: AI-enhanced family emergency schemes", site: "consumer.ftc.gov", date: "Mar 2023", href: "https://consumer.ftc.gov/consumer-alerts/2023/03/scammers-use-ai-enhance-their-family-emergency-schemes", tag: "voice cloning", extractOnly: true },
  { id: "ic3psa", title: "FBI alert: generative AI facilitates financial fraud", site: "ic3.gov", date: "3 Dec 2024", href: "https://www.ic3.gov/PSA/2024/PSA241203", tag: "voice cloning" },
  { id: "crvoice", title: "Consumer Reports assessment of voice cloning products", site: "consumerreports.org", date: "10 Mar 2025", href: "https://www.consumerreports.org/media-room/press-releases/2025/03/consumer-reports-assessment-of-ai-voice-cloning-products/", tag: "voice cloning" },
  { id: "bbcfraud", title: "UK scam losses hit £1.3bn as criminals turn to AI", site: "bbc.co.uk", date: "15 Jun 2026", href: "https://www.bbc.co.uk/news/articles/cwykp9ygxlvo", tag: "voice cloning" },
  { id: "himum", title: "‘Hi Mum and Dad’ scam spreads to text message", site: "which.co.uk", date: "7 Sep 2022", href: "https://www.which.co.uk/news/article/notorious-hi-mum-and-dad-scam-spreads-from-whatsapp-to-text-message-an7N34c0gVbP", tag: "voice cloning" },
];

export const sourceById = Object.fromEntries(sources.map((source) => [source.id, source]));
