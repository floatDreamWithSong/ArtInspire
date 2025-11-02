export interface OpenRequest {
  type: 'front-auth';
  token: string;
  resourceId: string;
  connectId: string;
}
export interface AuthResponse {
  type: 'backend-auth';
}
export interface TtsRequest {
  type: 'front-tts';
  text: string;
  voice: string;
  connectId: string;
}
export interface TtsResponse {
  type: 'backend-tts';
  order: number;
  audio: Buffer;
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