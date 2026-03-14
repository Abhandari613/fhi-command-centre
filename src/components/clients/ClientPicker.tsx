"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { createClientAction } from "@/app/actions/client-actions";
import { useTransition } from "react";
import { Search, Plus, User, Check, Loader2, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
interface Client {
  id: string;
  name: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
}

interface ClientPickerProps {
  onSelect: (client: Client) => void;
  selectedClientId?: string | null;
}

export function ClientPicker({
  onSelect,
  selectedClientId,
}: ClientPickerProps) {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [isPending, startTransition] = useTransition();

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      const { data } = await supabase.from("clients").select("*").order("name");
      if (data) setClients(data);
      setLoading(false);
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter((c) =>
    (c.name || "").toLowerCase().includes((search || "").toLowerCase()),
  );

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;

    startTransition(async () => {
      const result = await createClientAction({ name: newClientName.trim() });

      if (result.success && result.data) {
        const newClient = result.data as Client;
        setClients((prev) => [...prev, newClient]);
        onSelect(newClient);
        setIsCreating(false);
        setNewClientName("");
        setSearch("");
      } else {
        alert(result.error || "Failed to create client");
      }
    });
  };

  if (isCreating) {
    return (
      <GlassCard className="p-4 animate-in fade-in zoom-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">New Client</h3>
          <button
            onClick={() => setIsCreating(false)}
            className="p-1 hover:bg-white/10 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs opacity-60 uppercase font-bold tracking-wider">
              Client Name
            </label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-lg font-bold focus:outline-none focus:border-primary/50"
              placeholder="e.g. John Doe"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              autoFocus
            />
          </div>
          <button
            disabled={isPending || !newClientName.trim()}
            onClick={handleCreateClient}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2"
          >
            {isPending ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Create Client
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
        <input
          className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all text-white placeholder:text-gray-500"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        <button
          onClick={() => setIsCreating(true)}
          className="w-full text-left px-4 py-3 rounded-lg hover:bg-primary/20 text-primary transition-colors flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm">Create new client</span>
        </button>

        {filteredClients.map((client) => (
          <button
            key={client.id}
            onClick={() => onSelect(client)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between group",
              selectedClientId === client.id
                ? "bg-white/10 border border-white/5"
                : "hover:bg-white/5",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <User className="w-4 h-4 opacity-70" />
              </div>
              <div>
                <p className="font-bold text-sm leading-none">{client.name}</p>
                <p className="text-[10px] opacity-50 mt-1">
                  {client.email || "No email"}
                </p>
              </div>
            </div>
            {selectedClientId === client.id && (
              <Check className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
