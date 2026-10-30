export const submissionLimits = { name: 120, message: 3000, companions: 10, token: 2048 } as const;

export interface MessageSubmission {
  name: string;
  message: string;
  turnstileToken: string;
}

export interface RsvpSubmission {
  name: string;
  attending: boolean;
  companions: string[];
  turnstileToken: string;
}
