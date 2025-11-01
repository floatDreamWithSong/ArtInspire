export interface OpenRequest {
  type: 'front-auth';
  token: string;
}
export interface AuthResponse {
  type: 'backend-auth';
  token: string;
}
export interface TtsRequest {
  type: 'front-tts';
  text: string;
  voice: string;
}
export interface TtsResponse {
  type: 'backend-tts';
  order: number;
  text: string;
  audio: Buffer | string; // Buffer或base64字符串
}
export interface TtsError {
  type: 'backend-error';
  message: string;
}
export interface TtsEnd {
  type: 'backend-end';
}
export type FrontMessage = OpenRequest | TtsRequest;
export type BackendMessage = AuthResponse | TtsResponse | TtsError | TtsEnd;