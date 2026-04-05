import type { ImageSourcePropType } from 'react-native';

/** App icon — same file as Expo `icon` in app.json (`assets/Icons/icon.png`). */
export const APP_ICON: ImageSourcePropType = require('../assets/Icons/icon.png');

export const APP_SPLASH_IMAGE: ImageSourcePropType = require('../assets/Icons/splash-icon.png');

export const APP_FAVICON: ImageSourcePropType = require('../assets/Icons/favicon.png');

/** Store listing / marketing (not used in app bundle UI by default). */
export const PLAY_STORE_IMAGE: ImageSourcePropType = require('../assets/Icons/playstore.png');
export const APP_STORE_IMAGE: ImageSourcePropType = require('../assets/Icons/appstore.png');
