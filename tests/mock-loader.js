import { pathToFileURL } from 'node:url';
import { resolve as pathResolve } from 'node:path';

const mockPath = pathToFileURL(pathResolve('./tests/d3-mock.js')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('https://')) {
    return {
      shortCircuit: true,
      url: mockPath
    };
  }
  return nextResolve(specifier, context);
}
