import { Command, Option } from 'commander';
import { Schema } from '../../schema.js';
import { BaseOptions } from '../../options.js';
import { handleLoadableError } from '../../client/TolgeeClient.js';
import { info, loading, success } from '../../utils/logger.js';
import { resolveAsset, resolveLanguageId } from '../../utils/binaryAsset.js';

type TranscribeOptions = BaseOptions & {
  lang?: string;
};

const transcribeHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: TranscribeOptions = this.optsWithGlobals();
    const asset = await resolveAsset(opts.client, this.processedArgs[0]);

    info('Speech-to-text runs synchronously and can take several minutes.');

    const projectId = opts.client.getProjectId();
    const request = opts.lang
      ? opts.client.POST(
          '/v2/projects/{projectId}/binary-assets/{assetId}/transcript/generate/{languageId}',
          {
            params: {
              path: {
                projectId,
                assetId: asset.id,
                languageId: await resolveLanguageId(opts.client, opts.lang),
              },
            },
          }
        )
      : opts.client.POST(
          '/v2/projects/{projectId}/binary-assets/{assetId}/transcript/generate',
          { params: { path: { projectId, assetId: asset.id } } }
        );

    const loadable = await loading(
      `Transcribing "${asset.name}"${opts.lang ? ` (${opts.lang})` : ''}...`,
      request
    );
    handleLoadableError(loadable);

    const updated = loadable.data!;
    success(
      `Transcribed into key "${updated.transcriptKeyName}". Edit the text with \`tolgee pull\`/\`push\` — it is a normal translation key.`
    );
  };

export default (config: Schema) =>
  new Command('transcribe')
    .description("Generate an asset's transcript with speech-to-text")
    .argument('<asset>', 'Asset name or id')
    .addOption(
      new Option(
        '-l, --lang <tag>',
        "Transcribe this language's localized file instead of the source"
      )
    )
    .action(transcribeHandler(config));
