//export const HOST = "127.0.0.1:3000";
export const HOST = window.location.host;// will return the host name and port

export const URL_PREFIX = "https://"+HOST;
export const WS_PREFIX = "wss://"+HOST;
export const WS_URL = WS_PREFIX + "/webmanager_ws";
export const WS_URL_ESP32_AP = "wss://192.168.4.1:443/webmanager_ws"
export const WS_URL_ESP32_STA = "wss://labathome_6550c0/webmanager_ws"
export const HOST_PREFIX_ESP32_STA = "https://labathome_6550c0"
export const UPLOAD_URL=URL_PREFIX+"/ota";
export const LABBY_URL = URL_PREFIX+"/labathome"