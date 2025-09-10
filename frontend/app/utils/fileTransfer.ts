import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

export async function exportToFile(jsonText: string) {
  try {
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory || FileSystem.temporaryDirectory || FileSystem.cacheDirectory;
    const fileUri = `${dir}scarletts-export-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(fileUri, jsonText, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Daten exportieren' });
    }
    return fileUri;
  } catch (e) {
    throw new Error('Export fehlgeschlagen: ' + (e as Error).message);
  }
}

export async function importFromFile(): Promise<string | null> {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', multiple: false });
    if (res.canceled || !res.assets || res.assets.length === 0) return null;
    const uri = res.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    return content;
  } catch (e) {
    throw new Error('Import fehlgeschlagen: ' + (e as Error).message);
  }
}