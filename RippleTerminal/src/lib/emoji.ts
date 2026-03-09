/**
 * Slack emoji shortcode → Unicode mapping.
 * Covers the most commonly used Slack emojis.
 */
const EMOJI_MAP: Record<string, string> = {
  // Smileys
  smile: "\u{1F604}", grinning: "\u{1F600}", joy: "\u{1F602}", rofl: "\u{1F923}",
  wink: "\u{1F609}", blush: "\u{1F60A}", heart_eyes: "\u{1F60D}", kissing_heart: "\u{1F618}",
  thinking_face: "\u{1F914}", sunglasses: "\u{1F60E}", neutral_face: "\u{1F610}",
  rolling_eyes: "\u{1F644}", sweat_smile: "\u{1F605}", sob: "\u{1F62D}",
  angry: "\u{1F620}", rage: "\u{1F621}", scream: "\u{1F631}", skull: "\u{1F480}",
  see_no_evil: "\u{1F648}", speak_no_evil: "\u{1F64A}", sweat: "\u{1F613}",
  // Hands & gestures
  "+1": "\u{1F44D}", thumbsup: "\u{1F44D}", "-1": "\u{1F44E}", thumbsdown: "\u{1F44E}",
  clap: "\u{1F44F}", wave: "\u{1F44B}", raised_hands: "\u{1F64C}", pray: "\u{1F64F}",
  muscle: "\u{1F4AA}", point_up: "\u{261D}\uFE0F", point_right: "\u{1F449}",
  point_left: "\u{1F448}", ok_hand: "\u{1F44C}", raised_hand: "\u{270B}",
  mechanical_arm: "\u{1F9BE}", handshake: "\u{1F91D}",
  // Hearts & love
  heart: "\u2764\uFE0F", broken_heart: "\u{1F494}", sparkling_heart: "\u{1F496}",
  revolving_hearts: "\u{1F49E}", two_hearts: "\u{1F495}", blue_heart: "\u{1F499}",
  green_heart: "\u{1F49A}", yellow_heart: "\u{1F49B}", purple_heart: "\u{1F49C}",
  // Objects & symbols
  fire: "\u{1F525}", star: "\u2B50", sparkles: "\u2728", dizzy: "\u{1F4AB}",
  bulb: "\u{1F4A1}", rocket: "\u{1F680}", tada: "\u{1F389}", confetti_ball: "\u{1F38A}",
  trophy: "\u{1F3C6}", medal: "\u{1F3C5}", crown: "\u{1F451}", gem: "\u{1F48E}",
  moneybag: "\u{1F4B0}", chart_with_upwards_trend: "\u{1F4C8}",
  chart_with_downwards_trend: "\u{1F4C9}", bell: "\u{1F514}",
  mega: "\u{1F4E3}", eyes: "\u{1F440}", eye: "\u{1F441}\uFE0F",
  lock: "\u{1F512}", key: "\u{1F511}", shield: "\u{1F6E1}\uFE0F",
  // Nature & weather
  sun: "\u2600\uFE0F", rainbow: "\u{1F308}", cloud: "\u2601\uFE0F}",
  snowflake: "\u2744\uFE0F", zap: "\u26A1",
  // Food & drink
  coffee: "\u2615", beer: "\u{1F37A}", beers: "\u{1F37B}", wine_glass: "\u{1F377}",
  pizza: "\u{1F355}", hamburger: "\u{1F354}", yum: "\u{1F60B}",
  fork_and_knife: "\u{1F374}", knife_fork_plate: "\u{1F37D}\uFE0F",
  // Animals
  eagle: "\u{1F985}", dog: "\u{1F436}", cat: "\u{1F431}", unicorn: "\u{1F984}",
  // Work & tech
  computer: "\u{1F4BB}", hammer_and_wrench: "\u{1F6E0}\uFE0F", wrench: "\u{1F527}",
  memo: "\u{1F4DD}", clipboard: "\u{1F4CB}", pushpin: "\u{1F4CC}",
  email: "\u{1F4E7}", inbox_tray: "\u{1F4E5}", outbox_tray: "\u{1F4E4}",
  // Faces & reactions (alternate names)
  laughing: "\u{1F606}", stuck_out_tongue: "\u{1F61B}",
  open_mouth: "\u{1F62E}", astonished: "\u{1F632}", flushed: "\u{1F633}",
  expressionless: "\u{1F611}", unamused: "\u{1F612}",
  // Misc
  white_check_mark: "\u2705", x: "\u274C", warning: "\u26A0\uFE0F",
  rotating_light: "\u{1F6A8}", boom: "\u{1F4A5}", collision: "\u{1F4A5}",
  art: "\u{1F3A8}", brain: "\u{1F9E0}", robot_face: "\u{1F916}",
  sunflower: "\u{1F33B}", cherry_blossom: "\u{1F338}",
  // Slack custom reactions (best-effort native fallbacks)
  thankyou: "\u{1F64F}", noted: "\u{1F4DD}", "clapping-all": "\u{1F44F}",
  "thank_you_": "\u{1F64F}", hattip: "\u{1F3A9}",
  woohoo: "\u{1F389}", "+100": "\u{1F4AF}",
  rolling_on_the_floor_laughing: "\u{1F923}",
};

/**
 * Replace :emoji_name: shortcodes in text with Unicode emoji.
 * Unrecognized shortcodes are left as-is.
 */
export function renderEmoji(text: string): string {
  return text.replace(/:([a-zA-Z0-9_+\-]+):/g, (match, code) => {
    // Strip skin-tone modifiers for lookup
    const base = code.replace(/::skin-tone-\d+$/, "").replace(/skin-tone-\d+$/, "");
    return EMOJI_MAP[base] || EMOJI_MAP[code] || match;
  });
}

/**
 * Convert a reaction name to its emoji character.
 */
export function reactionEmoji(name: string): string {
  const base = name.replace(/::skin-tone-\d+$/, "");
  return EMOJI_MAP[base] || `:${name}:`;
}
