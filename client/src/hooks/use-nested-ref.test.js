import { resolveNestedRef } from './use-nested-ref';

describe('useNestedRef', () => {
  it('uses the nested ref when it is available', () => {
    const input = {};

    expect(resolveNestedRef({ inputRef: { current: input } }, 'inputRef')).toBe(
      input
    );
  });

  it('uses a direct element ref without throwing', () => {
    const button = {};

    expect(resolveNestedRef(button, 'ref')).toBe(button);
  });
});
