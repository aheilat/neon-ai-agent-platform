import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Mail, Shield, UserPlus, Users, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Team() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.team.list.useQuery();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "agent" | "viewer">("agent");

  const inviteMutation = trpc.team.invite.useMutation({
    onSuccess: async () => {
      await utils.team.list.invalidate();
      setEmail("");
      toast.success("تم إرسال الدعوة وإضافة العضو بنجاح");
    },
    onError: error => toast.error(error.message),
  });

  const updateRoleMutation = trpc.team.updateRole.useMutation({
    onSuccess: async () => {
      await utils.team.list.invalidate();
      toast.success("تم تحديث صلاحيات العضو");
    },
    onError: error => toast.error(error.message),
  });

  const removeMutation = trpc.team.remove.useMutation({
    onSuccess: async () => {
      await utils.team.list.invalidate();
      toast.success("تمت إزالة العضو من مساحة العمل");
    },
    onError: error => toast.error(error.message),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      return toast.error("أدخل بريداً إلكترونياً صحيحاً");
    }
    inviteMutation.mutate({ email, role });
  };

  const members = data?.members ?? [];
  const invites = data?.invites ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 pb-12" dir="rtl">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80" dir="ltr">Team & Permissions / 08</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">إدارة الفريق والصلاحيات <span className="text-slate-500">/ Team</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">تحكم في أعضاء مساحة العمل، أدوارهم في خدمة العملاء (مدرف، مشرف، عميل، مشاهد)، ودعوة أعضاء جدد.</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card className="border-white/10 bg-[#0b1728]/90">
          <CardHeader className="border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-white">دعوة عضو جديد</CardTitle>
                <p className="mt-1 text-xs text-slate-400">امنح الصلاحية المناسبة لخدمة العملاء</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleInvite} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs text-slate-300">البريد الإلكتروني / Email</span>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com" className="border-white/10 bg-white/[0.04] pr-9 text-white" />
                </div>
              </label>
              <label className="block space-y-2">
                <span className="text-xs text-slate-300">الصلاحية / Role</span>
                <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full h-10 rounded-xl border border-white/10 bg-[#0b1728] px-3 text-sm text-white outline-none">
                  <option value="admin">مشرف مساحة العمل (Admin)</option>
                  <option value="agent">وكيل خدمة عملاء (Agent)</option>
                  <option value="viewer">مشاهد فقط (Viewer)</option>
                </select>
              </label>
              <Button type="submit" disabled={inviteMutation.isPending} className="w-full rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                إرسال الدعوة وإضافة العضو
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0b1728]/90">
          <CardHeader className="border-b border-white/10 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-white">أعضاء مساحة العمل الحالية</CardTitle>
                  <p className="mt-1 text-xs text-slate-400">{members.length} عضو مسجل</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading && <p className="p-6 text-center text-sm text-slate-400">جاري تحميل أعضاء الفريق...</p>}
            <div className="divide-y divide-white/[0.07]">
              {members.map(member => (
                <div key={member.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] font-bold text-white">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{member.name}</p>
                      <p className="text-xs text-slate-400" dir="ltr">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="border-white/10 bg-white/[0.06] text-xs text-cyan-300">
                      {member.role}
                    </Badge>
                    {member.role !== "owner" && (
                      <>
                        <select value={member.role} onChange={e => updateRoleMutation.mutate({ memberId: member.id, role: e.target.value as any })} className="h-8 rounded-lg border border-white/10 bg-[#0b1728] px-2 text-xs text-white outline-none">
                          <option value="admin">مشرف</option>
                          <option value="agent">عميل</option>
                          <option value="viewer">مشاهد</option>
                        </select>
                        <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate({ memberId: member.id })} className="h-8 px-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!members.length && !isLoading && (
              <div className="py-12 text-center text-sm text-slate-400">لا يوجد أعضاء إضافيين حالياً</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
