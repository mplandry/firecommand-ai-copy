import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Camera, X, ZoomIn, Loader2, ImageIcon } from 'lucide-react';

export default function PhotoPanel({ isReadOnly }) {
  const { incidentId } = useParams();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState(null); // { file, url }
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['incident-photos', incidentId],
    queryFn: () =>
      base44.entities.Contact.filter(
        { incident_id: incidentId, category: 'photo' },
        '-created_date'
      ),
    enabled: !!incidentId,
    staleTime: 0,
  });

  const handleCapture = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPreview({ file: files[0], url: URL.createObjectURL(files[0]) });
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file: preview.file });
      await base44.entities.Contact.create({
        incident_id: incidentId,
        category: 'photo',
        name: `Photo — ${new Date().toLocaleTimeString()}`,
        notes: upload.file_url,
      });
      queryClient.invalidateQueries({ queryKey: ['incident-photos', incidentId] });
      setPreview(null);
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Camera capture button */}
      {!isReadOnly && !preview && (
        <>
          <input
            type="file"
            id="panel-camera-input"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleCapture}
          />
          <label
            htmlFor="panel-camera-input"
            className="flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors font-mono text-xs font-bold uppercase tracking-wider"
          >
            <Camera className="w-4 h-4" /> Take Photo
          </label>
        </>
      )}

      {/* Preview + save/discard */}
      {preview && (
        <div className="rounded-lg border-2 border-primary/40 overflow-hidden bg-secondary/20">
          <img
            src={preview.url}
            alt="Preview"
            className="w-full object-cover"
            style={{ maxHeight: 200 }}
          />
          <div className="flex gap-2 p-2.5 border-t border-border bg-secondary/40">
            <button
              onClick={handleSave}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-60"
            >
              {uploading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : <><Camera className="w-3.5 h-3.5" /> Save to Incident</>
              }
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-3 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Photo count header */}
      {photos.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
            {photos.length} Photo{photos.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Gallery grid */}
      {isLoading ? (
        <p className="text-xs font-mono text-muted-foreground text-center py-6">Loading…</p>
      ) : photos.length === 0 && !preview ? (
        <div className="text-center py-10">
          <ImageIcon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs font-mono text-muted-foreground">No photos yet for this incident</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative rounded-lg overflow-hidden border border-border cursor-pointer group aspect-square"
              onClick={() => setExpanded(p)}
            >
              <img
                src={p.notes}
                alt={p.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                <p className="text-[9px] font-mono text-white/90 truncate">{p.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setExpanded(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setExpanded(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={expanded.notes}
            alt={expanded.name}
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-3 text-xs font-mono text-white/50">{expanded.name}</p>
        </div>
      )}
    </div>
  );
}
