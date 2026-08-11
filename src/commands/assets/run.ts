import { Command, Option } from 'commander';
import { Schema } from '../../schema.js';
import { BaseOptions } from '../../options.js';
import { handleLoadableError } from '../../client/TolgeeClient.js';
import { info, loading, success } from '../../utils/logger.js';
import {
  formatBytes,
  resolveAsset,
  resolveLanguageId,
} from '../../utils/binaryAsset.js';

type RunOptions = BaseOptions & {
  lang: string;
  tool: string;
  voice?: string;
  model?: string;
  baseVersion?: string;
  removeNoise?: boolean;
};

const runHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: RunOptions = this.optsWithGlobals();
    const asset = await resolveAsset(opts.client, this.processedArgs[0]);
    const languageId = await resolveLanguageId(opts.client, opts.lang);

    info('AI generation runs synchronously and can take several minutes.');

    const loadable = await loading(
      `Running ${opts.tool} on "${asset.name}" (${opts.lang})...`,
      opts.client.POST(
        '/v2/projects/{projectId}/binary-assets/{assetId}/translations/{languageId}/versions/run',
        {
          params: {
            path: {
              projectId: opts.client.getProjectId(),
              assetId: asset.id,
              languageId,
            },
          },
          body: {
            tool: opts.tool,
            baseVersionId: opts.baseVersion
              ? Number(opts.baseVersion)
              : undefined,
            params: {
              voiceId: opts.voice,
              modelId: opts.model,
              removeBackgroundNoise: opts.removeNoise,
            },
          },
        }
      )
    );
    handleLoadableError(loadable);

    const version = loadable.data!;
    success(
      `Created version [${version.id}] ${version.originalFilename} (${formatBytes(version.byteSize)}).`
    );
    info(
      `Make it the final file with \`tolgee assets versions ${asset.id} --lang ${opts.lang} --choose ${version.id}\`.`
    );
  };

export default (config: Schema) =>
  new Command('run')
    .description(
      'Run an AI tool (tts / voice-changer) to produce a new version'
    )
    .argument('<asset>', 'Asset name or id')
    .addOption(
      new Option(
        '-l, --lang <tag>',
        'Target language tag'
      ).makeOptionMandatory()
    )
    .addOption(
      new Option('-t, --tool <tool>', 'Tool to run')
        .choices(['tts', 'voice-changer'])
        .default('tts')
    )
    .addOption(
      new Option(
        '--voice <voiceId>',
        'Voice to use (defaults to the language, then project, default voice)'
      )
    )
    .addOption(new Option('--model <modelId>', 'Model to use'))
    .addOption(
      new Option(
        '--base-version <versionId>',
        'Run on this existing version instead of the source'
      )
    )
    .addOption(
      new Option(
        '--remove-noise',
        'Remove background noise (voice-changer only)'
      )
    )
    .action(runHandler(config));
