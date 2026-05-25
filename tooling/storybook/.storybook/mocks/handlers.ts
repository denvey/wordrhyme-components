import { http, HttpResponse } from 'msw';

interface IconData {
  prefix: string;
  icons: Record<string, unknown>;
  [key: string]: unknown;
}

/*
 * Icon sets are loaded lazily on first request to avoid bundling large JSON
 * files into the initial iframe bundle, which caused a 1-2 second parse delay
 * on every story load.
 */
const iconSetLoaders: Record<string, () => Promise<IconData>> = {
  mdi: async () =>
    import('@iconify-json/mdi/icons.json').then((m) => m.default as IconData),
  fa: async () =>
    import('@iconify-json/fa/icons.json').then((m) => m.default as IconData),
  tabler: async () =>
    import('@iconify-json/tabler/icons.json').then((m) => m.default as IconData),
};

const iconSetCache: Record<string, IconData> = {};

async function getIconSet(prefix: string): Promise<IconData | undefined> {
  if (iconSetCache[prefix] !== undefined) return iconSetCache[prefix];
  const loader = iconSetLoaders[prefix];
  if (!loader) return undefined;
  const data = await loader();
  iconSetCache[prefix] = data;
  return data;
}

export const handlers = [
  // Handle /api/iconify/:prefix.json requests
  http.get('/api/iconify/:prefix.json', async ({ request, params }) => {
    const { prefix } = params;
    const url = new URL(request.url);
    const iconsParam = url.searchParams.get('icons');

    const iconData = await getIconSet(prefix as string);

    if (!iconData) {
      return HttpResponse.json(
        { error: `Icon set "${String(prefix)}" not found` },
        { status: 404 },
      );
    }

    // If specific icons are requested, filter them
    if (iconsParam != null) {
      const iconList = iconsParam.split(',').map((i) => i.trim());

      // Filter icons while preserving all metadata
      const filteredIcons = iconList.reduce(
        (acc, icon) => {
          const data = iconData.icons[icon];
          if (data !== undefined) {
            acc[icon] = data;
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );

      // Create response with all metadata fields from original
      const response = {
        prefix: iconData.prefix,
        lastModified: iconData.lastModified,
        width: iconData.width,
        height: iconData.height,
        icons: filteredIcons,
      };

      return HttpResponse.json(response);
    }

    // Return entire icon set
    return HttpResponse.json(iconData);
  }),

  // Handle /api/iconify/:prefix/icons.json requests
  http.get('/api/iconify/:prefix/icons.json', async ({ params }) => {
    const { prefix } = params;

    const iconData = await getIconSet(prefix as string);

    return HttpResponse.json(iconData);
  }),

  http.get('/uploads/:fileName', async ({ request }) => fetch(request)),

  // Handle file upload requests with delay simulation
  http.post('/api/upload', async ({ request }) => {
    try {
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];

      if (files.length === 0) {
        return HttpResponse.json({ error: 'No files provided' }, { status: 400 });
      }

      // Mock response with file information
      const uploadedFiles = await Promise.all(
        files.map(async (file) => ({
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          url: `/uploads/${file.name}`,
        })),
      );

      return HttpResponse.json({
        success: true,
        files: uploadedFiles,
        message: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      return HttpResponse.json(
        { error: 'File upload failed', details: String(error) },
        { status: 500 },
      );
    }
  }),
];
