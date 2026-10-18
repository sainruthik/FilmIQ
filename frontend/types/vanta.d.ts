declare module "vanta/dist/vanta.fog.min" {
  const FOG: (options: Record<string, unknown>) => { destroy: () => void };
  export default FOG;
}

// Only passed through to Vanta; no direct three.js usage.
declare module "three";
