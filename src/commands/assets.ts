import { Command } from 'commander';

import assetsList from './assets/list.js';
import assetsUpload from './assets/upload.js';
import assetsTranscribe from './assets/transcribe.js';
import assetsRun from './assets/run.js';
import assetsVersions from './assets/versions.js';
import assetsDownload from './assets/download.js';
import { Schema } from '../schema.js';

export default (config: Schema) =>
  new Command('assets')
    .description('Manage binary assets and their localization pipeline')
    .addCommand(assetsList(config))
    .addCommand(assetsUpload(config))
    .addCommand(assetsTranscribe(config))
    .addCommand(assetsRun(config))
    .addCommand(assetsVersions(config))
    .addCommand(assetsDownload(config));
