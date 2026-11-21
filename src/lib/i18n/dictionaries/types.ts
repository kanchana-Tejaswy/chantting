/**
 * SMARAN (स्मरण) — Internationalization Translation Schema
 *
 * Defines the canonical keys required across the application for complete
 * user-facing multilingual support.
 */

export interface TranslationDictionary {
  common: {
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    loading: string;
    error: string;
    success: string;
    back: string;
    close: string;
    search: string;
    reset: string;
    edit: string;
    active: string;
    completed: string;
    language: string;
    selectLanguage: string;
    searchLanguage: string;
    allLanguages: string;
    needsNativeReview: string;
    rtlScript: string;
  };
  nav: {
    drsti: string;
    drstiSub: string;
    japa: string;
    japaSub: string;
    lakshya: string;
    lakshyaSub: string;
    satsang: string;
    satsangSub: string;
    account: string;
    settings: string;
    signOut: string;
    signIn: string;
    returnToSmaran: string;
    tagline: string;
    designSystem: string;
  };
  auth: {
    signInTitle: string;
    signInSub: string;
    signUpTitle: string;
    signUpSub: string;
    forgotTitle: string;
    forgotSub: string;
    tabSignIn: string;
    tabSignUp: string;
    tabForgot: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    displayNameHint: string;
    forgotPasswordLink: string;
    newHereLink?: string;
    continueWithGoogle: string;
    orDivider: string;
    btnSignIn: string;
    btnSignUp: string;
    btnSendReset: string;
    btnResendVerification: string;
    signingIn: string;
    signingUp: string;
    sendingReset: string;
    heroTitle: string;
    heroSub: string;
    heroDescription: string;
    featurePrivate: string;
    featureSynced: string;
    featureGita: string;
    accountCreatedNotice: string;
    checkSpamNotice: string;
  };
  japa: {
    title: string;
    subtitle: string;
    beads: string;
    rounds: string;
    roundProgress: string;
    currentRound: string;
    roundBeadCount: string;
    plusBead: string;
    completeRound: string;
    undoLast: string;
    undoRound: string;
    resetSession: string;
    audioFeedback: string;
    tactileFeedback: string;
    manualCounter: string;
    japaMala: string;
    sessionSaved: string;
    mahamantra: string;
    beadsChantedLabel: string;
    dailyGoalProgress: string;
  };
  drsti: {
    sanctuaryTitle: string;
    greeting: string;
    todaySadhana: string;
    dailyVow: string;
    roundsToday: string;
    remainingToday: string;
    targetMet: string;
    lifetimeRounds: string;
    currentStreak: string;
    streakDays: string;
    bestStreak: string;
    monthlyVolume: string;
    quickChant: string;
    reflectionPrompt: string;
    reflectionPlaceholder: string;
    consistency: string;
    recentSessions: string;
    noSessions: string;
    sacredVerseRef: string;
  };
  sadhana: {
    title: string;
    dailyTarget: string;
    targetRounds: string;
    carryForward: string;
    effectiveTarget: string;
    pendingBalance: string;
    policyAutomatic: string;
    policyOptional: string;
    policyFresh: string;
    policyCap: string;
    vowStatus: string;
    disciplineNote: string;
    carriedOver: string;
  };
  sankalpa: {
    title: string;
    activeSankalpa: string;
    noActiveSankalpa: string;
    createNew: string;
    sankalpaName: string;
    targetRounds: string;
    progress: string;
    startDate: string;
    endDate: string;
    includeLifetime: string;
    statusActive: string;
    statusFulfilled: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    heatmapTitle: string;
    less: string;
    more: string;
    totalRounds: string;
    avgPerDay: string;
    completionRate: string;
    dayDetail: string;
    date: string;
    roundsCompleted: string;
  };
  rooms: {
    title: string;
    subtitle: string;
    createRoom: string;
    joinRoom: string;
    myRooms: string;
    members: string;
    roomGoal: string;
    shareMode: string;
    leaveRoom: string;
    inviteLink: string;
    privacyNotice: string;
  };
  account: {
    title: string;
    profileSection: string;
    languageSection: string;
    languageDescription: string;
    currentLanguage: string;
    changeLanguage: string;
    displayName: string;
    username: string;
    bio: string;
    timezone: string;
    preferencesSection: string;
    privacySection: string;
    dataExport: string;
    dangerZone: string;
    savePreferences: string;
    savedSuccess: string;
    fontSizeOption: string;
    sanctuaryControls?: string;
    devoteeSince?: string;
    securitySection?: string;
    dataSection?: string;
    notifications?: string;
    milestones?: string;
    identityTitle?: string;
    identityDesc?: string;
    devotionalAvatar?: string;
    avatarPrompt?: string;
    registeredEmail?: string;
    emailVerification?: string;
    verified?: string;
    pendingVerification?: string;
    saveProfile?: string;
    chantingPreferencesTitle?: string;
    chantingPreferencesDesc?: string;
    defaultChantingMode?: string;
    reducedMotion?: string;
    dailyRoundTarget?: string;
    carryForwardPolicy?: string;
    autoCarryForward?: string;
    customCarryCap?: string;
    saveSadhanaPreferences?: string;
  };
}

export type TranslationKey =
  | `common.${keyof TranslationDictionary["common"]}`
  | `nav.${keyof TranslationDictionary["nav"]}`
  | `auth.${keyof TranslationDictionary["auth"]}`
  | `japa.${keyof TranslationDictionary["japa"]}`
  | `drsti.${keyof TranslationDictionary["drsti"]}`
  | `sadhana.${keyof TranslationDictionary["sadhana"]}`
  | `sankalpa.${keyof TranslationDictionary["sankalpa"]}`
  | `analytics.${keyof TranslationDictionary["analytics"]}`
  | `rooms.${keyof TranslationDictionary["rooms"]}`
  | `account.${keyof TranslationDictionary["account"]}`;
