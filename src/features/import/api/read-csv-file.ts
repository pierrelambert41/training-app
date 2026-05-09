import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export type PickedFile = {
  name: string;
  content: string;
};

export type ReadFileError =
  | { code: 'cancelled' }
  | { code: 'read_failed'; message: string }
  | { code: 'not_csv'; name: string };

export async function pickAndReadCsvFile(): Promise<PickedFile | ReadFileError> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || result.assets.length === 0) {
    return { code: 'cancelled' };
  }

  const asset = result.assets[0];
  const fileName = asset.name ?? 'file';

  if (!fileName.toLowerCase().endsWith('.csv')) {
    return { code: 'not_csv', name: fileName };
  }

  try {
    const content = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return { name: fileName, content };
  } catch (e) {
    return { code: 'read_failed', message: String(e) };
  }
}
