/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  readonly PUBLIC_E2E_FIXTURE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
