import { ApiClientProps, createApiClient } from './ApiClient.js';
import { createExportClient } from './ExportClient.js';
import { createImportClient } from './ImportClient.js';
import { errorFromLoadable } from './errorFromLoadable.js';

// Structural, not `Awaited<ReturnType<TolgeeClient['GET']>>`: that unions every
// path in the generated schema, and with the binary-asset endpoints added it
// trips TS2589 (excessively deep instantiation). Consumers only read these three.
export type LoadableData = {
  data?: any;
  error?: any;
  response: Response;
};

type Props = ApiClientProps;

export function createTolgeeClient(props: Props) {
  const apiClient = createApiClient(props);

  return {
    ...apiClient,
    import: createImportClient({ apiClient }),
    export: createExportClient({ apiClient }),
  };
}

export const handleLoadableError = (loadable: LoadableData) => {
  if (loadable.error) {
    throw new LoadableError(loadable);
  }
};

export class LoadableError extends Error {
  constructor(public loadable: LoadableData) {
    super(errorFromLoadable(loadable));
  }
}

export type TolgeeClient = ReturnType<typeof createTolgeeClient>;
