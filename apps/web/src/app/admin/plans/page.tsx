import { adminOnlyApi } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

interface Entitlement {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  period: string;
}
interface Plan {
  key: string;
  name: string;
  isDefault: boolean;
  entitlements: Entitlement[];
}

export default async function PlansPage() {
  const { plans } = await adminOnlyApi<{ plans: Plan[] }>("/admin/plans");
  return (
    <div>
      <h1 className="text-2xl font-bold">Plans &amp; entitlements</h1>
      {plans.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No plans yet</p>
      ) : (
        plans.map((p) => (
          <section key={p.key} className="mt-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {p.name} <span className="font-mono text-sm font-normal text-muted">{p.key}</span>
              {p.isDefault && (
                <span className="rounded-control bg-sidebar-active px-2 py-0.5 text-xs font-medium text-sidebar-active-text">
                  Default plan
                </span>
              )}
            </h2>
            <div className="mt-2 overflow-x-auto rounded-card border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">Feature key</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Enabled</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Limit</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {p.entitlements.map((e) => (
                    <tr key={e.featureKey} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-mono">{e.featureKey}</td>
                      <td className="px-4 py-2">{e.enabled ? "Yes" : "No"}</td>
                      <td className="px-4 py-2">{e.limitValue === null ? (e.enabled ? "Unlimited" : "—") : e.limitValue}</td>
                      <td className="px-4 py-2">{e.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
