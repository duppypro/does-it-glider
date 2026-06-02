// Mock D3 for headless testing
const handler = {
  get: (target, prop) => {
    if (prop === '__esModule') return true;
    return mock;
  },
  apply: () => mock
};

const mock = new Proxy(() => {}, handler);

// Export standard named exports that are used in the codebase
export const select = mock;
export const selectAll = mock;
export const zoom = mock;
export const easeQuadOut = mock;
export const interpolateRainbow = mock;

export default mock;
