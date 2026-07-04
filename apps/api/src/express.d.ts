declare module 'express' {
  export interface Request {
    headers: { authorization?: string };
  }
}
