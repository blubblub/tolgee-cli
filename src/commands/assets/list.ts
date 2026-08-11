import { Command, Option } from 'commander';
import { Schema } from '../../schema.js';
import { BaseOptions } from '../../options.js';
import { loading } from '../../utils/logger.js';
import { fetchAssets, printAssets } from '../../utils/binaryAsset.js';

type ListOptions = BaseOptions & {
  search?: string;
  type?: string[];
};

const listHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: ListOptions = this.optsWithGlobals();

    const assets = await loading(
      'Fetching assets...',
      fetchAssets(opts.client, {
        search: opts.search,
        filterMediaType: opts.type,
      })
    );

    printAssets(assets);
  };

export default (config: Schema) =>
  new Command('list')
    .description('List binary assets and their per-language status')
    .addOption(new Option('-s, --search <search>', 'Filter assets by name'))
    .addOption(
      new Option('-t, --type <types...>', 'Only these media types').choices([
        'audio',
        'video',
        'image',
      ])
    )
    .action(listHandler(config));
