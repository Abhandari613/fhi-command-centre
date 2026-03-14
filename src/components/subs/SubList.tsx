"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  User,
  Phone,
  Mail,
  Plus,
  Trash2,
  Loader2,
  Search,
  MapPin,
  MessageSquare,
  Hammer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSubcontractors,
  createSubcontractor,
  deleteSubcontractor,
  Subcontractor,
  CreateSubInput,
} from "@/app/actions/sub-actions";
import { GoogleAddressInput } from "@/components/ui/GoogleAddressInput";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { toast } from "sonner";

export function SubList() {
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSub, setNewSub] = useState<CreateSubInput>({
    name: "",
    email: "",
    phone: "",
    address: "",
    trade: "",
    communication_preference: "email",
  });

  useEffect(() => {
    const fetchSubs = async () => {
      const data = await getSubcontractors();
      setSubs(data);
      setLoading(false);
    };

    fetchSubs();
  }, []);

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createSubcontractor(newSub);

    if (!result.success || !result.data) {
      toast.error("Error adding subcontractor: " + result.error);
    } else {
      setSubs([result.data as Subcontractor, ...subs]);
      setIsAdding(false);
      setNewSub({
        name: "",
        email: "",
        phone: "",
        address: "",
        trade: "",
        communication_preference: "email",
      });
      toast.success("Successfully added team member");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this subcontractor?")) return;
    const result = await deleteSubcontractor(id);
    if (result.success) {
      setSubs(subs.filter((s) => s.id !== id));
    } else {
      alert("Failed to delete: " + result.error);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            placeholder="Search team..."
            className="w-full bg-transparent border-none py-2 pl-9 pr-4 text-sm focus:outline-none placeholder:text-white/30 font-medium"
          />
        </div>
        <AnimatedButton
          onClick={() => setIsAdding(!isAdding)}
          size="sm"
          className="shadow-[0_0_15px_rgba(0,229,255,0.3)]"
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </AnimatedButton>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard intensity="panel" className="p-6 mb-6 border-primary/30">
              <h3 className="font-bold text-lg mb-4 text-white">
                New Team Member
              </h3>
              <form onSubmit={handleAddSub} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase opacity-70 mb-1 tracking-wider">
                      Name
                    </label>
                    <input
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary/50 text-sm"
                      placeholder="e.g. John Doe"
                      value={newSub.name}
                      onChange={(e) =>
                        setNewSub({ ...newSub, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase opacity-70 mb-1 tracking-wider">
                      Trade / Role
                    </label>
                    <input
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary/50 text-sm"
                      placeholder="e.g. Electrician"
                      value={newSub.trade || ""}
                      onChange={(e) =>
                        setNewSub({ ...newSub, trade: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase opacity-70 mb-1 tracking-wider">
                    Address
                  </label>
                  <GoogleAddressInput
                    value={newSub.address || ""}
                    onChange={(address) => setNewSub({ ...newSub, address })}
                    placeholder="Full address..."
                    className="bg-black/20 border-white/10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase opacity-70 mb-1 tracking-wider">
                      Email
                    </label>
                    <input
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary/50 text-sm"
                      placeholder="john@example.com"
                      value={newSub.email || ""}
                      onChange={(e) =>
                        setNewSub({ ...newSub, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase opacity-70 mb-1 tracking-wider">
                      Phone
                    </label>
                    <input
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary/50 text-sm"
                      placeholder="555-0123"
                      value={newSub.phone || ""}
                      onChange={(e) =>
                        setNewSub({ ...newSub, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase opacity-70 mb-1 tracking-wider">
                      Communication
                    </label>
                    <GlassSelect
                      value={newSub.communication_preference}
                      onChange={(val) =>
                        setNewSub({
                          ...newSub,
                          communication_preference: val as any,
                        })
                      }
                      options={[
                        { value: "email", label: "Email" },
                        { value: "sms", label: "SMS" },
                        { value: "phone", label: "Phone Call" },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <AnimatedButton
                    type="button"
                    variant="secondary"
                    onClick={() => setIsAdding(false)}
                    size="sm"
                  >
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton size="sm" type="submit">
                    Save Member
                  </AnimatedButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-3"
      >
        {subs.length === 0 && !loading ? (
          <motion.div variants={item} className="text-center opacity-50 py-10">
            No subcontractors found. Add one to get started.
          </motion.div>
        ) : (
          subs.map((sub) => (
            <motion.div key={sub.id} variants={item}>
              <GlassCard className="p-4 flex justify-between items-center group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                    <User className="w-6 h-6 opacity-80 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      {sub.name}
                      {sub.trade && (
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70 uppercase tracking-wide">
                          {sub.trade}
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs opacity-60 mt-1">
                      {sub.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {sub.phone}
                        </span>
                      )}
                      {sub.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {sub.email}
                        </span>
                      )}
                      {sub.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {sub.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Pref:{" "}
                        {sub.communication_preference}
                      </span>
                      {sub.compliance_status && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            sub.compliance_status === "verified"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : sub.compliance_status === "expired"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {sub.compliance_status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(sub.id)}
                  className="p-2 hover:bg-red-500/20 text-red-500/50 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </GlassCard>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
