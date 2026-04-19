import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import {
  listFiles,
  uploadFile,
  deleteFile,
  getFreshUrl,
  formatFileSize,
  type ProjectFile,
} from '@/lib/docVault/api';
import {
  getCachedPathSync,
  downloadToCache,
  deleteFromCache,
  getCacheSize,
  clearAllCache,
} from '@/lib/docVault/fileCache';

// ─── Allowed extensions (whitelist) ─────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'docx', 'doc',
  'xlsx', 'xls',
  'pptx', 'ppt',
  'dwg', 'dxf',
  'jpg', 'jpeg', 'png', 'tiff', 'tif',
]);

const ALLOWED_LABEL = 'PDF, Word, Excel, PowerPoint, DWG, DXF, JPG, PNG, TIFF';

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function isAllowed(filename: string): boolean {
  return ALLOWED_EXTENSIONS.has(getExtension(filename));
}

// ─── File type config ─────────────────────────────────────────────────────────

const FILE_TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  pdf:     { icon: 'document-text',    color: '#dc2626', bg: '#fee2e2', label: 'PDF' },
  docx:    { icon: 'document',         color: '#1d4ed8', bg: '#dbeafe', label: 'Word' },
  doc:     { icon: 'document',         color: '#1d4ed8', bg: '#dbeafe', label: 'Word' },
  xlsx:    { icon: 'grid',             color: '#16a34a', bg: '#dcfce7', label: 'Excel' },
  xls:     { icon: 'grid',             color: '#16a34a', bg: '#dcfce7', label: 'Excel' },
  pptx:    { icon: 'easel',            color: '#d97706', bg: '#fef3c7', label: 'PowerPoint' },
  dwg:     { icon: 'construct',        color: '#7c3aed', bg: '#ede9fe', label: 'AutoCAD DWG' },
  dxf:     { icon: 'git-network',      color: '#0891b2', bg: '#cffafe', label: 'DXF' },
  jpg:     { icon: 'image',            color: '#be185d', bg: '#fce7f3', label: 'Image' },
  jpeg:    { icon: 'image',            color: '#be185d', bg: '#fce7f3', label: 'Image' },
  png:     { icon: 'image',            color: '#be185d', bg: '#fce7f3', label: 'Image' },
  tiff:    { icon: 'image',            color: '#be185d', bg: '#fce7f3', label: 'Image' },
  unknown: { icon: 'document-outline', color: '#6b7280', bg: '#f3f4f6', label: 'File' },
};

function getTypeCfg(fileType: string) {
  return FILE_TYPE_CONFIG[fileType.toLowerCase()] ?? FILE_TYPE_CONFIG['unknown']!;
}

// ─── Viewer component ─────────────────────────────────────────────────────────

function FileViewer({ file, onClose }: { file: ProjectFile; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const ft = file.file_type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ft;
  const isOfflineCapable = ['pdf', 'dxf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'].includes(ft);
  const isDocType = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ft);

  const [url, setUrl] = useState(() => getCachedPathSync(file.id, ext) ?? file.file_url);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isCached, setIsCached] = useState(() => getCachedPathSync(file.id, ext) !== null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let remoteUrl = file.file_url;
      try { remoteUrl = await getFreshUrl(file.id); } catch {}
      const localUri = await downloadToCache(file.id, ext, remoteUrl);
      setUrl(localUri);
      setIsCached(true);
    } catch (e) {
      Alert.alert('Download Failed', e instanceof Error ? e.message : 'Could not download file');
    } finally {
      setDownloading(false);
    }
  };

  const handleRemoveCache = () => {
    deleteFromCache(file.id, ext);
    setUrl(file.file_url);
    setIsCached(false);
  };

  const refreshUrl = async () => {
    setRefreshing(true);
    try {
      const fresh = await getFreshUrl(file.id);
      setUrl(fresh);
    } catch {
      Alert.alert('Error', 'Could not refresh file URL');
    } finally {
      setRefreshing(false);
    }
  };

  const buildViewerUrl = (rawUrl: string): string => {
    // Google Docs Viewer for office docs (online only)
    if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ft)) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    }
    // PDF, images, DXF — served directly in WebView
    return rawUrl;
  };

  const isDxf = ft === 'dxf';
  const isDwg = ft === 'dwg';

  const dxfHtml = `<!DOCTYPE html><html><head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>body{margin:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column}
  #canvas{background:#fff;max-width:100%;border-radius:8px}
  .msg{color:#fff;font-family:sans-serif;text-align:center;padding:20px}
  .btn{background:#4A90C4;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;margin-top:12px;cursor:pointer}</style>
  <script src="https://cdn.jsdelivr.net/npm/dxf@4.4.0/dist/dxf.js"></script>
  </head><body>
  <div class="msg">
    <div style="font-size:48px">📐</div>
    <div style="font-size:18px;font-weight:700;margin-top:8px">DXF Drawing</div>
    <div style="font-size:14px;opacity:0.7;margin-top:4px">${file.name}</div>
    <div id="status" style="font-size:13px;margin-top:16px;opacity:0.8">Loading DXF file…</div>
    <canvas id="canvas" width="800" height="600" style="display:none;margin-top:16px"></canvas>
  </div>
  <script>
  (async function() {
    const status = document.getElementById('status');
    const canvas = document.getElementById('canvas');
    try {
      const res = await fetch('${url}');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const parsed = window.dxf.parseString(text);
      const helper = new window.dxf.Helper(text);
      const svgStr = helper.toSVG();
      const img = new Image();
      const blob = new Blob([svgStr], {type:'image/svg+xml'});
      const objUrl = URL.createObjectURL(blob);
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        canvas.width = img.width || 800; canvas.height = img.height || 600;
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.style.display = 'block';
        status.textContent = 'DXF rendered successfully';
        URL.revokeObjectURL(objUrl);
      };
      img.onerror = () => { status.textContent = 'Could not render DXF — file may be too complex'; };
      img.src = objUrl;
    } catch(e) {
      status.textContent = 'Error loading DXF: ' + e.message;
    }
  })();
  </script></body></html>`;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
          <Pressable onPress={onClose} hitSlop={10} style={{ padding: 6, marginRight: 8 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: '#fff', fontFamily: 'Inter_500Medium' }} numberOfLines={1}>{file.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter_400Regular' }}>{getTypeCfg(ft).label} · {formatFileSize(file.size_bytes)}</Text>
              {isCached && (
                <View style={{ backgroundColor: '#14532d', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, color: '#4ade80', fontFamily: 'Inter_500Medium' }}>● Offline</Text>
                </View>
              )}
              {isDocType && !isCached && (
                <View style={{ backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter_400Regular' }}>Online only</Text>
                </View>
              )}
            </View>
          </View>
          {isOfflineCapable && (
            <Pressable
              onPress={isCached ? handleRemoveCache : handleDownload}
              hitSlop={10}
              style={{ padding: 6, marginRight: 2 }}
            >
              {downloading
                ? <ActivityIndicator size="small" color="#4A90C4" />
                : <Ionicons name={isCached ? 'checkmark-circle' : 'download-outline'} size={20} color={isCached ? '#16a34a' : '#4A90C4'} />}
            </Pressable>
          )}
          {!isCached && (
            <Pressable onPress={refreshUrl} hitSlop={10} style={{ padding: 6 }}>
              {refreshing
                ? <ActivityIndicator size="small" color="#4A90C4" />
                : <Ionicons name="refresh" size={20} color="#4A90C4" />}
            </Pressable>
          )}
        </View>

        {/* DWG — no in-app viewer, show info */}
        {isDwg ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Ionicons name="construct" size={64} color="#7c3aed" />
            <Text style={{ fontSize: 18, color: '#fff', fontFamily: 'Poppins_700Bold', marginTop: 16, textAlign: 'center' }}>AutoCAD DWG File</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
              DWG files require the Autodesk viewer. Tap below to open in your browser.
            </Text>
            <Pressable
              onPress={refreshUrl}
              style={{ marginTop: 24, backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_500Medium' }}>Refresh URL to Open</Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: '#475569', marginTop: 8, fontFamily: 'Inter_400Regular' }}>URL: {url.slice(0, 60)}…</Text>
          </View>
        ) : isDxf ? (
          // DXF — render via bundled DXF.js
          <WebView
            style={{ flex: 1 }}
            source={{ html: dxfHtml }}
            originWhitelist={['*']}
            javaScriptEnabled
            allowFileAccess
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' }}>
                <ActivityIndicator color="#4A90C4" size="large" />
                <Text style={{ color: '#fff', marginTop: 12, fontFamily: 'Inter_400Regular' }}>Rendering DXF…</Text>
              </View>
            )}
          />
        ) : (
          // PDF, images, DOCX via Google Docs Viewer
          <WebView
            style={{ flex: 1 }}
            source={{ uri: buildViewerUrl(url) }}
            originWhitelist={['*']}
            javaScriptEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
                <ActivityIndicator color="#4A90C4" size="large" />
                <Text style={{ color: '#fff', marginTop: 12, fontFamily: 'Inter_400Regular' }}>Loading document…</Text>
              </View>
            )}
            onError={() => Alert.alert('Load Error', 'Could not load file. Try refreshing the URL.')}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── File card ────────────────────────────────────────────────────────────────

function FileCard({ file, onView, onDelete }: { file: ProjectFile; onView: () => void; onDelete: () => void }) {
  const cfg = getTypeCfg(file.file_type);
  const date = new Date(file.created_at).toLocaleDateString();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? file.file_type;
  const cached = getCachedPathSync(file.id, ext) !== null;

  return (
    <Pressable
      onPress={onView}
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: cached ? '#bbf7d0' : '#e5e7eb', marginBottom: 10, padding: 12, gap: 12 }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: '#111827', fontFamily: 'Inter_500Medium' }} numberOfLines={1}>{file.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: cfg.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, color: cfg.color, fontFamily: 'Inter_500Medium' }}>{cfg.label}</Text>
          </View>
          {cached && (
            <View style={{ backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="checkmark-circle" size={10} color="#16a34a" />
              <Text style={{ fontSize: 10, color: '#16a34a', fontFamily: 'Inter_500Medium' }}>Offline</Text>
            </View>
          )}
          <Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>{formatFileSize(file.size_bytes)}</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>{date}</Text>
        </View>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={{ padding: 6 }}>
        <Ionicons name="trash-outline" size={17} color="#9ca3af" />
      </Pressable>
      <Ionicons name="chevron-forward" size={17} color="#d1d5db" />
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DocumentVaultScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [viewingFile, setViewingFile] = useState<ProjectFile | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['doc-vault-files'],
    queryFn: () => listFiles(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doc-vault-files'] }),
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed'),
  });

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0]!;
      const ext = getExtension(asset.name);

      if (!isAllowed(asset.name)) {
        Alert.alert(
          'File Type Not Allowed',
          `".${ext}" files cannot be uploaded.\n\nAllowed types:\n${ALLOWED_LABEL}\n\nTip: AutoCAD users — export your drawing as DXF (File → Save As → DXF) before uploading.`,
          [{ text: 'OK' }]
        );
        return;
      }

      setUploading(true);
      await uploadFile({
        fileUri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      });
      await queryClient.invalidateQueries({ queryKey: ['doc-vault-files'] });
    } catch (err) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Could not upload file');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (file: ProjectFile) => {
    Alert.alert('Delete File', `Delete "${file.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(file.id) },
    ]);
  };

  const FILE_TYPES = ['all', 'pdf', 'docx', 'xlsx', 'dwg', 'dxf', 'jpg', 'png'];

  const filtered = files.filter((f) => {
    const matchType = filterType === 'all' || f.file_type.toLowerCase() === filterType;
    const matchSearch = !search.trim() || f.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Document Vault" level="Advanced" />

      {/* AutoCAD hint banner */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, backgroundColor: '#ede9fe', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#c4b5fd' }}>
        <Ionicons name="information-circle" size={18} color="#7c3aed" />
        <Text style={{ flex: 1, fontSize: 12, color: '#5b21b6', fontFamily: 'Inter_400Regular', lineHeight: 17 }}>
          <Text style={{ fontFamily: 'Inter_500Medium' }}>AutoCAD users:</Text>
          {' '}Save your drawing as DXF before uploading.{'\n'}
          <Text style={{ color: '#7c3aed', fontFamily: 'Inter_400Regular' }}>File → Save As → DXF (.dxf) → Upload here ✓</Text>
        </Text>
      </View>

      {/* Search + upload */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb', paddingHorizontal: 12, height: 42 }}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search files…"
              placeholderTextColor="#9ca3af"
              style={{ flex: 1, marginLeft: 8, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#111' }}
            />
          </View>
          <Pressable
            onPress={handleUpload}
            disabled={uploading}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.brand[900], borderRadius: 12, paddingHorizontal: 14, height: 42 }}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="cloud-upload-outline" size={16} color="#fff" />}
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter_500Medium' }}>{uploading ? 'Uploading…' : 'Upload'}</Text>
          </Pressable>
        </View>

        {/* Type filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
          {FILE_TYPES.map((type) => {
            const selected = filterType === type;
            const cfg = type === 'all' ? null : getTypeCfg(type);
            return (
              <Pressable
                key={type}
                onPress={() => setFilterType(type)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  backgroundColor: selected ? (cfg?.bg ?? Colors.brand[100]) : '#f3f4f6',
                  borderWidth: 1,
                  borderColor: selected ? (cfg?.color ?? Colors.brand[700]) : '#e5e7eb',
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: selected ? (cfg?.color ?? Colors.brand[700]) : '#6b7280' }}>
                  {type === 'all' ? 'All Files' : type.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ flex: 1, fontSize: 12, color: '#6b7280', fontFamily: 'Inter_400Regular' }}>
          {filtered.length} file{filtered.length !== 1 ? 's' : ''}
          {filterType !== 'all' ? ` · ${filterType.toUpperCase()} only` : ''}
        </Text>
        <Pressable
          onPress={() => {
            const size = getCacheSize();
            Alert.alert(
              'Clear Offline Cache',
              `Cache size: ${formatFileSize(size)}\nThis will remove all offline-cached files.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => { clearAllCache(); } },
              ]
            );
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="cloud-offline-outline" size={14} color="#9ca3af" />
          <Text style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>Clear cache</Text>
        </Pressable>
      </View>

      {/* File list */}
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.brand[700]} style={{ marginTop: 48 }} />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
          <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
          <Text style={{ fontSize: 16, color: '#9ca3af', fontFamily: 'Poppins_700Bold', marginTop: 16 }}>
            {files.length === 0 ? 'No files yet' : 'No matching files'}
          </Text>
          <Text style={{ fontSize: 13, color: '#d1d5db', fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            {files.length === 0 ? 'Tap Upload to add your first document' : 'Try a different filter'}
          </Text>
          {files.length === 0 && (
            <Pressable
              onPress={handleUpload}
              style={{ marginTop: 20, backgroundColor: Colors.brand[900], borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_500Medium' }}>Upload File</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          renderItem={({ item }) => (
            <FileCard
              file={item}
              onView={() => setViewingFile(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}

      {/* Viewer modal */}
      {viewingFile && (
        <FileViewer
          file={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </SafeAreaView>
  );
}
