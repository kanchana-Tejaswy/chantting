import type { TranslationDictionary } from "./types";
import { en } from "./en";
import { hi } from "./hi";

// Nepali (नेपाली - Devanagari)
export const ne: TranslationDictionary = {
  ...hi,
  common: {
    ...hi.common,
    save: "बचत गर्नुहोस्",
    cancel: "रद्द गर्नुहोस्",
    confirm: "पुष्टि गर्नुहोस्",
    delete: "हटाउनुहोस्",
    loading: "लोड हुँदैछ...",
    error: "त्रुटि",
    success: "सफल",
    back: "पछाडि",
    close: "बन्द गर्नुहोस्",
    search: "खोज्नुहोस्",
    reset: "रिसेट",
    language: "भाषा",
    selectLanguage: "भाषा चयन गर्नुहोस्",
    searchLanguage: "भाषा वा लिपि खोज्नुहोस्...",
    allLanguages: "सबै २० भाषाहरू",
    needsNativeReview: "समीक्षा आवश्यक",
  },
  nav: {
    ...hi.nav,
    returnToSmaran: "स्मरणमा फर्कनुहोस्",
    tagline: "उहाँलाई सम्झनुहोस्। जोडिनुहोस्।",
  },
  auth: {
    ...hi.auth,
    signInTitle: "आफ्नो साधना कक्षमा प्रवेश गर्नुहोस्",
    signInSub: "दैनिक पवित्र जप जारी राख्न इमेल प्रविष्ट गर्नुहोस्।",
    signUpTitle: "आफ्नो साधना सुरु गर्नुहोस्",
    heroTitle: "उहाँलाई सम्झनुहोस्। जोडिनुहोस्।",
    heroSub: "जप, साधना र भक्तिको पवित्र स्थल।",
  },
};

// Maithili (मैथिली - Devanagari)
export const mai: TranslationDictionary = {
  ...hi,
  common: {
    ...hi.common,
    save: "सहेजू",
    cancel: "रद्द करू",
    confirm: "पुष्टि करू",
    delete: "हटाउ",
    loading: "लोड भ रहल अछि...",
    language: "भाषा",
    selectLanguage: "भाषा चुनू",
    allLanguages: "सबहि २० भाषा",
    needsNativeReview: "समीक्षा आवश्यक",
  },
  nav: {
    ...hi.nav,
    tagline: "हुनका स्मरण करू। जुड़ल रहू।",
  },
  auth: {
    ...hi.auth,
    signInTitle: "अपन साधना कक्ष मे प्रवेश करू",
    heroTitle: "हुनका स्मरण करू। जुड़ल रहू।",
    heroSub: "हरिनाम जप, साधना आ भक्तिक पावन ठाम।",
  },
};

// Konkani (कोंकणी - Devanagari)
export const kok: TranslationDictionary = {
  ...hi,
  common: {
    ...hi.common,
    save: "सांभाळात",
    cancel: "रद्द करात",
    confirm: "खात्री करात",
    delete: "काडून उडयात",
    loading: "लोड जाता...",
    language: "भास",
    selectLanguage: "भास वेंचून काढा",
    allLanguages: "सगळ्यो २० भासो",
    needsNativeReview: "तपासणी गरजेची",
  },
  nav: {
    ...hi.nav,
    tagline: "तांकां उगडास दवरात. जोडिल्ले रावात.",
  },
  auth: {
    ...hi.auth,
    signInTitle: "तुमच्या साधना घरांत भितर सरात",
    heroTitle: "तांकां उगडास दवरात. जोडिल्ले रावात.",
  },
};

// Bodo (बड़ो - Devanagari)
export const brx: TranslationDictionary = {
  ...hi,
  common: {
    ...hi.common,
    save: "थिनथुमनाय",
    cancel: "दानखारनाय",
    confirm: "थार खालामनाय",
    delete: "हुखुमानाय",
    language: "राव",
    selectLanguage: "राव सायख'",
    allLanguages: "गासै २० रावफोर",
    needsNativeReview: "नायबिजिरनाय नांगौ",
  },
  nav: {
    ...hi.nav,
    tagline: "बिनो गोसोखां। फोनांजाबना था।",
  },
  auth: {
    ...hi.auth,
    heroTitle: "बिनो गोसोखां। फोनांजाबना था।",
    heroSub: "जप, साधना आरो भक्तीनि मोजां जायगा।",
  },
};

// Dogri (डोगरी - Devanagari)
export const doi: TranslationDictionary = {
  ...hi,
  common: {
    ...hi.common,
    save: "सम्हलो",
    cancel: "रद्द करो",
    confirm: "पक्का करो",
    delete: "मिटाओ",
    language: "भाशा",
    selectLanguage: "भाशा चुनो",
    allLanguages: "सब्भे २० भाशा",
    needsNativeReview: "पड़ताल लोड़दी",
  },
  nav: {
    ...hi.nav,
    tagline: "उंदे गी याद रक्खो। जुड़े रओ।",
  },
  auth: {
    ...hi.auth,
    signInTitle: "अपने साधना कक्ष च प्रवेश करो",
    heroTitle: "उंदे गी याद रक्खो। जुड़े रओ।",
  },
};

// Meitei / Manipuri (মৈতৈলোন্ - Bengali-Meitei)
export const mni: TranslationDictionary = {
  ...en,
  common: {
    ...en.common,
    save: "কনবা",
    cancel: "তোকপা",
    confirm: "শেংদোকপা",
    delete: "মুত্থৎপা",
    loading: "লোদ তৌরি...",
    language: "লোন",
    selectLanguage: "লোন খনবীয়ু",
    allLanguages: "লোন ২০ ময়েক",
    needsNativeReview: "য়েংশিনবা চংই",
  },
  nav: {
    ...en.nav,
    drsti: "দৃষ্টী",
    japa: "জপ",
    lakshya: "লক্ষ্য",
    satsang: "সৎসঙ্গ",
    returnToSmaran: "স্মরণদা হল্লকপা",
    tagline: "মহাকপু নীংশিংবীয়ু। শম্নদুনা লৈয়ু।",
  },
  auth: {
    ...en.auth,
    signInTitle: "অদোমগী গর্ভগৃহদা চঙবীয়ু",
    signUpTitle: "অদোমগী সাধনা হৌবীয়ু",
    heroTitle: "মহাকপু নীংশিংবীয়ু। শম্নদুনা লৈয়ু।",
    heroSub: "জপ, সাধনা অমসুং ভক্তীগী শেংলবা মফম।",
  },
  japa: {
    ...en.japa,
    title: "জপ সাধনা",
    subtitle: "১০৮ লাইরিক্কী শেংলবা মালা",
    beads: "মণি",
    rounds: "মালা",
    plusBead: "+১ মণি",
    completeRound: "মালা লোইশিনবা",
  },
};

// Santali (ᱥᱟᱱᱛᱟᱲᱤ - Ol Chiki)
export const sat: TranslationDictionary = {
  ...en,
  common: {
    ...en.common,
    save: "ᱫᱚᱦᱚ",
    cancel: "ᱵᱟᱹᱛᱤᱞ",
    confirm: "ᱴᱷᱟᱹᱣᱠᱟᱹ",
    delete: "ᱜᱮᱫ ᱜᱤᱰᱤ",
    loading: "ᱞᱟᱫᱮᱜ ᱠᱟᱱᱟ...",
    language: "ᱯᱟᱹᱨᱥᱤ",
    selectLanguage: "ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ",
    allLanguages: "ᱡᱚᱛᱚ ᱒᱐ ᱜᱚᱴᱟᱝ ᱯᱟᱹᱨᱥᱤ",
    needsNativeReview: "ᱧᱮᱞ ᱨᱩᱣᱟᱹᱲ ᱞᱟᱹᱠᱛᱤ",
  },
  nav: {
    ...en.nav,
    drsti: "ᱫᱨᱤᱥᱴᱤ",
    japa: "ᱡᱚᱯ",
    lakshya: "ᱞᱚᱠᱷᱭᱚ",
    satsang: "ᱥᱚᱛᱥᱚᱝ",
    tagline: "ᱩᱱᱤ ᱩᱭᱦᱟᱹᱨᱮᱢ। ᱡᱚᱯᱚᱲᱟᱣ ᱛᱟᱦᱮᱸᱱ ᱢᱮ।",
  },
  auth: {
    ...en.auth,
    signInTitle: "ᱟᱢᱟᱜ ᱥᱟᱫᱷᱱᱟ ᱚᱲᱟᱜ ᱨᱮ ᱵᱚᱞᱚᱱ ᱢᱮ",
    heroTitle: "ᱩᱱᱤ ᱩᱭᱦᱟᱹᱨᱮᱢ। ᱡᱚᱯᱚᱲᱟᱣ ᱛᱟᱦᱮᱸᱱ ᱢᱮ।",
    heroSub: "ᱡᱚᱯ, ᱥᱟᱫᱷᱱᱟ ᱟᱨ ᱵᱷᱚᱠᱛᱤ ᱨᱮᱱᱟᱜ ᱯᱟᱹᱵᱤᱛᱨᱚ ᱴᱷᱟᱶ।",
  },
  japa: {
    ...en.japa,
    title: "ᱡᱚᱯ ᱥᱟᱫᱷᱱᱟ",
    subtitle: "᱑᱐᱘ ᱫᱟᱱᱟ ᱨᱮᱱᱟᱜ ᱢᱟᱞᱟ",
    beads: "ᱫᱟᱱᱟ",
    rounds: "ᱢᱟᱞᱟ",
    plusBead: "+᱑ ᱫᱟᱱᱟ",
    completeRound: "ᱢᱟᱞᱟ ᱪᱟᱵᱟᱭ ᱢᱮ",
  },
};
