import { requireTeacher } from "@/lib/admin-guard";
import { NovoForm } from "./novo-form";

export const dynamic = "force-dynamic";

export default async function NovoPage() {
  const { supabase } = await requireTeacher();

  const { data: services } = await supabase
    .from("make_services")
    .select("id, slug, name, price_cents, duration_min")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  return <NovoForm services={services ?? []} />;
}
