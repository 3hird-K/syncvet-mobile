import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Downloads announcement media into the app's persistent document directory so
 * Facebook-style posts (images and author avatars) remain viewable offline.
 *
 * The remote URL is used as the identity of a cached file. When the feed is
 * refreshed, unchanged images resolve to the existing local file immediately
 * and are not downloaded again.
 */

const MAX_CACHED_IMAGES = 60;

let imagesDirectory: Directory | null = null;

function getImagesDirectory(): Directory {
  if (!imagesDirectory) {
    imagesDirectory = new Directory(Paths.document, 'announcement-images');
  }
  if (!imagesDirectory.exists) {
    imagesDirectory.create();
  }
  return imagesDirectory;
}

function hashUrl(url: string): string {
  // FNV-1a 32-bit: stable filename from the remote URL without extra deps.
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function extensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split('/').pop() || '';
    const extension = lastSegment.includes('.') ? lastSegment.split('.').pop() : '';
    if (extension && /^[a-z0-9]{2,5}$/i.test(extension)) {
      return `.${extension.toLowerCase()}`;
    }
  } catch {
    // Fall through to the generic extension.
  }
  return '.jpg';
}

function pruneOldImages(directory: Directory): void {
  try {
    const files = directory
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));

    for (const file of files.slice(MAX_CACHED_IMAGES)) {
      if (file.exists) file.delete();
    }
  } catch (error) {
    console.warn('[announcementImageCache] Prune skipped:', error);
  }
}

/**
 * Returns a local file URI for a remote image, downloading it when needed.
 * Returns null when caching is unavailable so the caller can keep the remote URL.
 */
export async function cacheAnnouncementImage(url?: string | null): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    // Local file/content/data URIs are already usable offline.
    return trimmed.startsWith('file:') ? trimmed : null;
  }

  if (Platform.OS === 'web') return null;

  try {
    const directory = getImagesDirectory();
    const file = new File(directory, `${hashUrl(trimmed)}${extensionFromUrl(trimmed)}`);

    if (file.exists && file.size > 0) {
      return file.uri;
    }

    const downloaded = await File.downloadFileAsync(trimmed, file);
    if (!downloaded || !downloaded.exists || downloaded.size === 0) {
      return null;
    }

    pruneOldImages(directory);
    return downloaded.uri;
  } catch (error) {
    console.warn('[announcementImageCache] Download failed:', error);
    return null;
  }
}

/** Caches a post image and its author avatar in parallel. */
export async function cacheAnnouncementMedia(item: {
  image_url?: string | null;
  author?: { avatar_url?: string | null } | null;
}): Promise<{ imageUrl: string | null; avatarUrl: string | null }> {
  const [imageUrl, avatarUrl] = await Promise.all([
    cacheAnnouncementImage(item.image_url),
    cacheAnnouncementImage(item.author?.avatar_url),
  ]);
  return { imageUrl, avatarUrl };
}
