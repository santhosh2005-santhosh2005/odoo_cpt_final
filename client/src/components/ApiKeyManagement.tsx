import { useState } from "react";
import { useGetApiKeysQuery, useCreateApiKeyMutation, useRevokeApiKeyMutation, useDeleteApiKeyMutation } from "@/services/apiKeyApi";
import { Key, Plus, Copy, ShieldOff, Trash2, CheckCircle2, Clock, Activity } from "lucide-react";
import { toast } from "react-hot-toast";

const ALL_SCOPES = [
  "orders:read", "orders:write",
  "products:read", "products:write",
  "analytics:read",
  "coupons:read", "coupons:write",
  "customers:read",
];

export const ApiKeyManagement = () => {
  const { data, refetch } = useGetApiKeysQuery();
  const [createApiKey, { isLoading: isCreating }] = useCreateApiKeyMutation();
  const [revokeApiKey] = useRevokeApiKeyMutation();
  const [deleteApiKey] = useDeleteApiKeyMutation();

  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["orders:read", "products:read", "analytics:read"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null); // shown ONCE after creation

  const keys = data?.data || [];

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) { toast.error("Key name is required"); return; }
    try {
      const res = await createApiKey({
        name: newKeyName,
        scopes: selectedScopes,
        expiresAt: expiresAt || undefined,
      }).unwrap();

      setRevealedKey(res.data.key); // Show the full key ONCE
      setShowForm(false);
      setNewKeyName("");
      setSelectedScopes(["orders:read", "products:read", "analytics:read"]);
      setExpiresAt("");
      toast.success("API Key created! Copy it now.");
      refetch();
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to create key");
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id).unwrap();
      toast.success("Key revoked");
      refetch();
    } catch { toast.error("Failed to revoke"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(id).unwrap();
      toast.success("Key deleted");
      refetch();
    } catch { toast.error("Failed to delete"); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* One-time key reveal banner */}
      {revealedKey && (
        <div className="bg-amber-50 border-2 border-amber-400 p-5 rounded-2xl space-y-3">
          <p className="text-xs font-black uppercase text-amber-700 flex items-center gap-2">
            ⚠️ Copy your API key now — it will never be shown again!
          </p>
          <div className="flex items-center gap-3 bg-white border border-amber-300 rounded-xl px-4 py-3">
            <code className="flex-1 text-sm font-mono text-gray-800 break-all">{revealedKey}</code>
            <button
              onClick={() => copyToClipboard(revealedKey)}
              className="shrink-0 p-2 bg-amber-400 rounded-lg hover:bg-amber-500 transition-colors"
            >
              <Copy size={16} />
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-amber-600 font-bold underline"
          >
            I've saved it, dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="text-blue-600 w-5 h-5" />
          <div>
            <p className="text-sm font-black text-gray-800">API Keys</p>
            <p className="text-xs text-gray-400">For external integrations (Odoo, webhooks, etc.)</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Generate Key
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-black text-gray-700">New API Key</p>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Key Name / Label</label>
            <input
              type="text"
              placeholder="e.g. Odoo Integration, Dashboard App"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Permissions (Scopes)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_SCOPES.map(scope => (
                <label key={scope} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs font-bold transition-colors ${selectedScopes.includes(scope) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="w-3 h-3"
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Expiry Date (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Key size={14} /> {isCreating ? "Generating..." : "Generate Key"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Keys List */}
      {keys.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
          <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-black text-gray-400">No API keys yet</p>
          <p className="text-xs text-gray-400">Generate one to integrate with external systems</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k: any) => (
            <div key={k._id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border gap-4 transition-all ${k.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${k.isActive ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-gray-300"}`} />
                <div className="space-y-1">
                  <p className="text-sm font-black text-gray-800">{k.name}</p>
                  <code className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{k.prefix}</code>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {k.scopes.map((s: string) => (
                      <span key={s} className="text-[9px] bg-blue-100 text-blue-600 font-black px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                    <Activity size={10} /> {k.usageCount} calls
                  </div>
                  {k.lastUsedAt && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                      <Clock size={10} /> Last: {new Date(k.lastUsedAt).toLocaleDateString()}
                    </div>
                  )}
                  {k.expiresAt && (
                    <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold">
                      <Clock size={10} /> Expires: {new Date(k.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {k.isActive && (
                    <button
                      onClick={() => handleRevoke(k._id)}
                      title="Revoke Key"
                      className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                    >
                      <ShieldOff size={16} />
                    </button>
                  )}
                  {k.isActive && (
                    <button
                      onClick={() => handleRevoke(k._id)}
                      title="Key is Active"
                      className="p-2 text-green-500"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(k._id)}
                    title="Delete Key"
                    className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How to use */}
      <div className="bg-gray-900 text-gray-300 rounded-2xl p-5 space-y-2">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">How to use your API Key</p>
        <code className="text-xs block">
          curl -X GET https://your-api.com/api/orders \<br />
          &nbsp;&nbsp;-H "X-API-Key: pk_live_your_key_here"
        </code>
      </div>
    </div>
  );
};
