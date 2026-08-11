import {
  formatBytes,
  resolveAsset,
  assetTranslation,
} from '#cli/utils/binaryAsset.js';

const ASSETS = [
  { id: 10, name: 'intro', byteSize: 100, translations: [] },
  { id: 11, name: 'intro-long', byteSize: 200, translations: [] },
] as any[];

/** Stands in for TolgeeClient: `search` is a fuzzy match, like the real API. */
function fakeClient(assets = ASSETS) {
  return {
    getProjectId: () => 2,
    async GET(path: string, opts: any) {
      if (path.endsWith('{assetId}')) {
        return {
          data: assets.find((a) => a.id === opts.params.path.assetId),
          response: { status: 200 },
        };
      }
      const search = opts.params.query?.search;
      return {
        data: {
          _embedded: {
            binaryAssets: search
              ? assets.filter((a) => a.name.includes(search))
              : assets,
          },
        },
        response: { status: 200 },
      };
    },
  } as any;
}

describe('resolveAsset', () => {
  it('treats a fully numeric ref as an id', async () => {
    expect(await resolveAsset(fakeClient(), '11')).toMatchObject({
      id: 11,
      name: 'intro-long',
    });
  });

  it('picks the exact name even when search returns fuzzy siblings', async () => {
    expect(await resolveAsset(fakeClient(), 'intro')).toMatchObject({ id: 10 });
  });
});

describe('assetTranslation', () => {
  const asset = {
    translations: [
      { languageTag: 'en', status: 'CURRENT' },
      { languageTag: 'sl', status: 'MISSING' },
    ],
  } as any;

  it('finds the row for a language tag', () => {
    expect(assetTranslation(asset, 'sl')).toMatchObject({ status: 'MISSING' });
  });

  it('returns undefined for a language the asset has no row for', () => {
    expect(assetTranslation(asset, 'de')).toBeUndefined();
  });
});

describe('formatBytes', () => {
  it('scales units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
