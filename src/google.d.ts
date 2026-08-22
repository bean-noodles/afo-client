// Minimal ambient types for Google Identity Services (loaded at runtime via
// a <script> tag in LoginView, not installed as a package) — just enough of
// the surface this app actually calls.
interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonOptions {
  theme?: string;
  size?: string;
  width?: number;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfiguration) => void;
        renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
        prompt: () => void;
      };
    };
  };
}
