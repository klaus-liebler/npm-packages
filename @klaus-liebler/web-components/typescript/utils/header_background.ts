// Wellen-Hintergrund des App-Headers (AppController und Standalone-Apps wie function_block_web).
export const HEADER_BACKGROUND_SVG = `<svg viewBox="0 0 1440 360" xmlns="http://www.w3.org/2000/svg"><path fill="#9EAFFD" opacity="0.3" d="M0 432 V216 Q432 43.2 864 216 V432z" /><path fill="#9EAFFD" opacity="0.7" d="M0 432 V172.8 Q432 244.8 792 172.8 T1440 158.4 V432z" /></svg>`;

export const HEADER_BACKGROUND_DATA_URL = `data:image/svg+xml;base64,${btoa(HEADER_BACKGROUND_SVG)}`;
