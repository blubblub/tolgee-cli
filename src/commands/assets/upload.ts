import { readFile } from 'fs/promises';
import { basename } from 'path';
import { Command, Option } from 'commander';
import { Schema } from '../../schema.js';
import { BaseOptions } from '../../options.js';
import { handleLoadableError } from '../../client/TolgeeClient.js';
import { loading, success } from '../../utils/logger.js';
import {
  formatBytes,
  resolveAsset,
  resolveLanguageId,
} from '../../utils/binaryAsset.js';

type UploadOptions = BaseOptions & {
  name?: string;
  description?: string;
  sourceLanguage?: string;
  replace?: string;
};

const uploadHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: UploadOptions = this.optsWithGlobals();
    const file: string = this.processedArgs[0];

    const data = await readFile(file);
    const fileName = basename(file);

    if (opts.replace) {
      const asset = await resolveAsset(opts.client, opts.replace);
      const body = new FormData();
      body.append('file', new Blob([data]), fileName);

      const loadable = await loading(
        `Replacing source of "${asset.name}"...`,
        opts.client.PUT(
          '/v2/projects/{projectId}/binary-assets/{assetId}/source',
          {
            params: {
              path: {
                projectId: opts.client.getProjectId(),
                assetId: asset.id,
              },
            },
            body: body as any,
            bodySerializer: (r: any) => r,
          }
        )
      );
      handleLoadableError(loadable);
      success(
        `Replaced source of "${asset.name}" with ${fileName} (${formatBytes(data.byteLength)}).`
      );
      return;
    }

    const body = new FormData();
    body.append('name', opts.name ?? fileName);
    body.append('file', new Blob([data]), fileName);
    if (opts.description) {
      body.append('description', opts.description);
    }
    if (opts.sourceLanguage) {
      const languageId = await resolveLanguageId(
        opts.client,
        opts.sourceLanguage
      );
      body.append('sourceLanguageId', String(languageId));
    }

    const loadable = await loading(
      `Uploading ${fileName}...`,
      opts.client.POST('/v2/projects/{projectId}/binary-assets', {
        params: { path: { projectId: opts.client.getProjectId() } },
        body: body as any,
        bodySerializer: (r: any) => r,
      })
    );
    handleLoadableError(loadable);

    const asset = loadable.data!;
    success(
      `Created asset "${asset.name}" [${asset.id}] (${formatBytes(asset.byteSize)}).`
    );
  };

export default (config: Schema) =>
  new Command('upload')
    .description('Upload a file as a new asset, or replace an existing source')
    .argument('<file>', 'Path to the file to upload')
    .addOption(
      new Option('-n, --name <name>', 'Asset name (defaults to the file name)')
    )
    .addOption(
      new Option('-d, --description <description>', 'Asset description')
    )
    .addOption(
      new Option('--source-language <tag>', 'Language tag of the source file')
    )
    .addOption(
      new Option(
        '--replace <asset>',
        'Replace the source of this existing asset (name or id) instead of creating one'
      ).conflicts(['name', 'description', 'sourceLanguage'])
    )
    .action(uploadHandler(config));
