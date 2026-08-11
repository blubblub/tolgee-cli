import { Command, Option } from 'commander';
import { Schema } from '../../schema.js';
import { BaseOptions } from '../../options.js';
import { handleLoadableError } from '../../client/TolgeeClient.js';
import { loading, success } from '../../utils/logger.js';
import {
  printVersions,
  resolveAsset,
  resolveLanguageId,
} from '../../utils/binaryAsset.js';

type VersionsOptions = BaseOptions & {
  lang: string;
  choose?: string;
  reviewed?: boolean;
  notReviewed?: boolean;
};

const versionsHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: VersionsOptions = this.optsWithGlobals();
    const asset = await resolveAsset(opts.client, this.processedArgs[0]);
    const languageId = await resolveLanguageId(opts.client, opts.lang);
    const path = {
      projectId: opts.client.getProjectId(),
      assetId: asset.id,
      languageId,
    };

    if (opts.choose) {
      const loadable = await loading(
        `Choosing version ${opts.choose}...`,
        opts.client.PUT(
          '/v2/projects/{projectId}/binary-assets/{assetId}/translations/{languageId}/versions/chosen-version',
          { params: { path }, body: { versionId: Number(opts.choose) } }
        )
      );
      handleLoadableError(loadable);
      success(`Version ${opts.choose} is now the final file for ${opts.lang}.`);
    }

    if (opts.reviewed || opts.notReviewed) {
      const reviewed = Boolean(opts.reviewed);
      const loadable = await loading(
        reviewed ? 'Marking reviewed...' : 'Clearing reviewed...',
        opts.client.PUT(
          '/v2/projects/{projectId}/binary-assets/{assetId}/translations/{languageId}/reviewed',
          { params: { path }, body: { reviewed } }
        )
      );
      handleLoadableError(loadable);
      success(
        `${opts.lang} is now marked ${reviewed ? 'reviewed' : 'not reviewed'}.`
      );
    }

    const loadable = await loading(
      'Fetching versions...',
      opts.client.GET(
        '/v2/projects/{projectId}/binary-assets/{assetId}/translations/{languageId}/versions',
        { params: { path } }
      )
    );
    handleLoadableError(loadable);
    printVersions(loadable.data ?? []);
  };

export default (config: Schema) =>
  new Command('versions')
    .description('List versions of a localized asset, choose the final one')
    .argument('<asset>', 'Asset name or id')
    .addOption(
      new Option('-l, --lang <tag>', 'Language tag').makeOptionMandatory()
    )
    .addOption(
      new Option('--choose <versionId>', 'Make this version the final file')
    )
    .addOption(
      new Option('--reviewed', 'Mark this language reviewed').conflicts(
        'notReviewed'
      )
    )
    .addOption(
      new Option('--not-reviewed', 'Clear the reviewed flag').conflicts(
        'reviewed'
      )
    )
    .action(versionsHandler(config));
