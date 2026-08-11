import { writeFile } from 'fs/promises';
import { Command, Option } from 'commander';
import { Schema } from '../../schema.js';
import { BaseOptions } from '../../options.js';
import { handleLoadableError } from '../../client/TolgeeClient.js';
import { exitWithError, loading, success } from '../../utils/logger.js';
import {
  assetTranslation,
  formatBytes,
  resolveAsset,
  resolveLanguageId,
} from '../../utils/binaryAsset.js';

type DownloadOptions = BaseOptions & {
  lang?: string;
  version?: string;
  out?: string;
};

const downloadHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: DownloadOptions = this.optsWithGlobals();
    const asset = await resolveAsset(opts.client, this.processedArgs[0]);

    if (opts.version && !opts.lang) {
      exitWithError('--version needs --lang: versions belong to a language.');
    }

    const projectId = opts.client.getProjectId();
    const languageId = opts.lang
      ? await resolveLanguageId(opts.client, opts.lang)
      : undefined;

    let ticket;
    let defaultName: string;

    if (opts.version) {
      ticket = opts.client.POST(
        '/v2/projects/{projectId}/binary-assets/{assetId}/translations/{languageId}/versions/{versionId}/download-ticket',
        {
          params: {
            path: {
              projectId,
              assetId: asset.id,
              languageId: languageId!,
              versionId: Number(opts.version),
            },
          },
        }
      );
      defaultName = `${asset.name}-${opts.lang}-v${opts.version}`;
    } else if (languageId !== undefined) {
      const translation = assetTranslation(asset, opts.lang!);
      if (!translation || translation.status === 'MISSING') {
        exitWithError(
          `"${asset.name}" has no file for ${opts.lang} yet. Produce one with \`tolgee assets run\`.`
        );
      }
      ticket = opts.client.POST(
        '/v2/projects/{projectId}/binary-assets/{assetId}/translations/{languageId}/download-ticket',
        { params: { path: { projectId, assetId: asset.id, languageId } } }
      );
      defaultName =
        translation.chosenVersionFilename ??
        translation.originalFilename ??
        `${asset.name}-${opts.lang}`;
    } else {
      ticket = opts.client.POST(
        '/v2/projects/{projectId}/binary-assets/{assetId}/source/download-ticket',
        { params: { path: { projectId, assetId: asset.id } } }
      );
      defaultName = asset.originalFilename;
    }

    const loadable = await loading('Requesting download ticket...', ticket);
    handleLoadableError(loadable);

    // The ticket is a short-lived public URL — plain fetch, no API key.
    const url = loadable.data!.url;
    const response = await loading('Downloading...', fetch(url));
    if (!response.ok) {
      exitWithError(
        `Downloading the file failed with status ${response.status}.`
      );
    }

    const target = opts.out ?? defaultName;
    const data = Buffer.from(await response.arrayBuffer());
    await writeFile(target, data);
    success(`Wrote ${target} (${formatBytes(data.byteLength)}).`);
  };

export default (config: Schema) =>
  new Command('download')
    .description('Download the source file, a localized file, or one version')
    .argument('<asset>', 'Asset name or id')
    .addOption(
      new Option(
        '-l, --lang <tag>',
        'Download this language instead of the source'
      )
    )
    .addOption(
      new Option(
        '--version <versionId>',
        'Download a specific version rather than the final file'
      )
    )
    .addOption(new Option('-o, --out <path>', 'Where to write the file'))
    .action(downloadHandler(config));
