import { useState, useEffect, useCallback } from 'react';
import { X, Settings, Save, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ShareSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareSettingsDialog({ isOpen, onClose }: ShareSettingsDialogProps) {
  const [endpoint, setEndpoint] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getShareSettings().then((result: any) => {
        if (result.success && result.settings) {
          setEndpoint(result.settings.endpoint || '');
          setToken(result.settings.token || '');
        }
      });
    }
  }, [isOpen]);

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.saveShareSettings({
        endpoint: endpoint.replace(/\/+$/, ''),
        token,
      });
      if (result.success) {
        toast.success('Share settings saved');
        onClose();
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }, [endpoint, token, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[80] bg-[#09090b] rounded-2xl shadow-2xl border border-white/10 p-8 w-[90vw] max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#2563EB]/20 flex items-center justify-center ring-1 ring-[#2563EB]/50">
              <Settings className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-200 block">Share Settings</span>
              <span className="text-sm text-slate-400">Configure your Cloudflare share endpoint</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-endpoint" className="text-sm text-slate-300">
              Endpoint URL
            </Label>
            <Input
              id="share-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://share.example.com"
              className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
            />
            <p className="text-xs text-slate-500">
              Your Cloudflare Worker URL (see{' '}
              <button
                onClick={() => window.electronAPI.openExternalUrl('https://github.com/pengelbrecht/Recordly/tree/main/share-worker')}
                className="text-[#60a5fa] hover:underline"
              >
                setup guide
              </button>
              )
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-token" className="text-sm text-slate-300">
              Auth Token
            </Label>
            <Input
              id="share-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Your SHARE_SECRET value"
              className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading || !endpoint || !token}
            className="w-full py-5 bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-xl mt-2"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </>
  );
}
