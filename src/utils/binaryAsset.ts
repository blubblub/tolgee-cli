import type { TolgeeClient } from '../client/TolgeeClient.js';
import type { components } from '../client/internal/schema.generated.js';
import { handleLoadableError } from '../client/TolgeeClient.js';
import { exitWithError, success } from './logger.js';

export type BinaryAsset = components['schemas']['BinaryAssetModel'];
export type AssetTranslation =
  components['schemas']['BinaryAssetTranslationModel'];
export type AssetVersion =
  components['schemas']['BinaryAssetTranslationVersionModel'];

export async function fetchAssets(
  client: TolgeeClient,
  query?: { search?: string; filterMediaType?: string[] }
) {
  const loadable = await client.GET('/v2/projects/{projectId}/binary-assets', {
    params: {
      path: { projectId: client.getProjectId() },
      query: { ...query, size: 1000 },
    },
  });
  handleLoadableError(loadable);
  return loadable.data?._embedded?.binaryAssets ?? [];
}

/**
 * Assets are addressed by name on the command line, because that is what people
 * actually know. A fully numeric argument is treated as an id instead.
 */
export async function resolveAsset(
  client: TolgeeClient,
  ref: string
): Promise<BinaryAsset> {
  if (/^\d+$/.test(ref)) {
    const loadable = await client.GET(
      '/v2/projects/{projectId}/binary-assets/{assetId}',
      {
        params: {
          path: { projectId: client.getProjectId(), assetId: Number(ref) },
        },
      }
    );
    handleLoadableError(loadable);
    return loadable.data!;
  }

  const matches = (await fetchAssets(client, { search: ref })).filter(
    (a) => a.name === ref
  );
  if (matches.length === 1) {
    return matches[0];
  }
  if (matches.length > 1) {
    exitWithError(
      `Several assets are named "${ref}". Pass one of these ids instead: ${matches
        .map((a) => a.id)
        .join(', ')}.`
    );
  }
  exitWithError(
    `No asset named "${ref}" in project ${client.getProjectId()}. Run \`tolgee assets list\` to see them.`
  );
}

export async function resolveLanguageId(
  client: TolgeeClient,
  tag: string
): Promise<number> {
  const loadable = await client.GET('/v2/projects/{projectId}/languages', {
    params: {
      path: { projectId: client.getProjectId() },
      query: { size: 1000 },
    },
  });
  handleLoadableError(loadable);

  const languages = loadable.data?._embedded?.languages ?? [];
  const match = languages.find((l) => l.tag === tag);
  if (!match) {
    exitWithError(
      `Language "${tag}" is not in this project. Available: ${languages
        .map((l) => l.tag)
        .join(', ')}.`
    );
  }
  return match.id;
}

/** The per-language row of an asset, which carries the chosen version and review state. */
export function assetTranslation(
  asset: BinaryAsset,
  languageTag: string
): AssetTranslation | undefined {
  return asset.translations?.find((t) => t.languageTag === languageTag);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function translationSummary(t: AssetTranslation) {
  const markers: string[] = [t.status];
  if (t.reviewed) markers.push('reviewed');
  if (t.versionCount) markers.push(`${t.versionCount} versions`);
  return `${t.languageTag} (${markers.join(', ')})`;
}

export function printAssets(assets: BinaryAsset[]) {
  if (!assets.length) {
    success('No assets found.');
    return;
  }

  console.log('Assets:');
  assets.forEach((asset) => {
    console.log(
      `- [${asset.id}] ${asset.name} — ${asset.contentType}, ${formatBytes(asset.byteSize)}`
    );
    const translations = asset.translations ?? [];
    if (translations.length) {
      console.log(`    ${translations.map(translationSummary).join(' · ')}`);
    }
    if (asset.transcriptKeyName) {
      console.log(`    transcript key: ${asset.transcriptKeyName}`);
    }
  });
}

export function printVersions(versions: AssetVersion[]) {
  if (!versions.length) {
    success('No versions yet.');
    return;
  }

  console.log('Versions:');
  versions.forEach((v) => {
    const markers = [v.tool];
    if (v.chosen) markers.push('chosen');
    console.log(
      `- [${v.id}] ${v.originalFilename} — ${markers.join(', ')}, ${formatBytes(v.byteSize)}`
    );
  });
}
