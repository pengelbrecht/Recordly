import { useState, useCallback, useEffect } from 'react';
import { X, Upload, Check, Copy, Link2, Loader2, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ShareSettingsDialog } from './ShareSettingsDialog';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportedFilePath?: string;
}

type ShareState = 'idle' | 'uploading' | 'success' | 'error' | 'not-configured';

export function ShareDialog({ isOpen, onClose, exportedFilePath }: ShareDialogProps) {
  const [state, setState] = useState<ShareState>('idle');
  const [progress, setProgress] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Check if sharing is configured when dialog opens
  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getShareSettings().then((result: any) => {
        if (!result.success || !result.settings?.endpoint || !result.settings?.token) {
          setState('not-configured');
        } else {
          setState('idle');
        }
      });
    }
  }, [isOpen]);

  const handleShare = useCallback(async () => {
    if (!exportedFilePath) return;

    setState('uploading');
    setProgress(0);
    setError('');

    try {
      const result = await window.electronAPI.shareVideo(exportedFilePath, (p: number) => {
        setProgress(p);
      });

      if (result.success && result.url) {
        setShareUrl(result.url);
        setState('success');
      } else {
        if (result.error?.includes('not configured')) {
          setState('not-configured');
        } else {
          setError(result.error || 'Upload failed');
          setState('error');
        }
      }
    } catch (err) {
      setError(String(err));
      setState('error');
    }
  }, [exportedFilePath]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [shareUrl]);

  const handleOpenUrl = useCallback(() => {
    if (shareUrl) {
      window.electronAPI.openExternalUrl(shareUrl);
    }
  }, [shareUrl]);

  const handleClose = useCallback(() => {
    setState('idle');
    setProgress(0);
    setShareUrl('');
    setError('');
    setCopied(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200"
        onClick={state === 'uploading' ? undefined : handleClose}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-[#09090b] rounded-2xl shadow-2xl border border-white/10 p-8 w-[90vw] max-w-md animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#2563EB]/20 flex items-center justify-center ring-1 ring-[#2563EB]/50">
              {state === 'success' ? (
                <Check className="w-6 h-6 text-[#2563EB]" />
              ) : state === 'uploading' ? (
                <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-[#2563EB]" />
              )}
            </div>
            <div>
              <span className="text-xl font-bold text-slate-200 block">
                {state === 'success'
                  ? 'Shared!'
                  : state === 'uploading'
                    ? 'Uploading...'
                    : state === 'error'
                      ? 'Upload Failed'
                      : 'Share Recording'}
              </span>
              <span className="text-sm text-slate-400">
                {state === 'success'
                  ? 'Your recording is live'
                  : state === 'uploading'
                    ? `${progress}% complete`
                    : state === 'error'
                      ? 'Please try again'
                      : 'Get a shareable link'}
              </span>
            </div>
          </div>
          {state !== 'uploading' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Upload progress */}
        {state === 'uploading' && (
          <div className="space-y-3 mb-4">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-[#2563EB] shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success: share URL */}
        {state === 'success' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={shareUrl}
                  readOnly
                  className="pl-10 bg-white/5 border-white/10 text-slate-200 font-mono text-sm"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
              <Button
                onClick={handleCopy}
                className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={handleOpenUrl}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Browser
            </Button>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <div className="p-1 bg-red-500/20 rounded-full">
                <X className="w-3 h-3 text-red-400" />
              </div>
              <p className="text-sm text-red-400 leading-relaxed">{error}</p>
            </div>
            <Button
              onClick={handleShare}
              className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Not configured */}
        {state === 'not-configured' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Set up your Cloudflare share endpoint to start sharing recordings via link.
            </p>
            <Button
              onClick={() => setShowSettings(true)}
              className="w-full py-6 bg-[#2563EB] text-white hover:bg-[#1D4ED8] text-base font-medium rounded-xl"
            >
              <Settings className="w-5 h-5 mr-2" />
              Configure Share Settings
            </Button>
          </div>
        )}

        {/* Idle: start upload */}
        {state === 'idle' && (
          <div className="space-y-3">
            <Button
              onClick={handleShare}
              className="w-full py-6 bg-[#2563EB] text-white hover:bg-[#1D4ED8] text-base font-medium rounded-xl"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload & Get Link
            </Button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Share settings
            </button>
          </div>
        )}
      </div>

      <ShareSettingsDialog
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          // Re-check config after settings closed
          window.electronAPI.getShareSettings().then((result: any) => {
            if (result.success && result.settings?.endpoint && result.settings?.token) {
              setState('idle');
            }
          });
        }}
      />
    </>
  );
}
