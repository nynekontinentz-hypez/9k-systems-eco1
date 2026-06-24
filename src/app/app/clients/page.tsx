import { OrganizationList } from "@clerk/nextjs";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clients"
        description="Each SMB client is its own organization — isolated members, billing, and files. Create one per client."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Your client workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationList
              hidePersonal
              afterCreateOrganizationUrl="/app"
              afterSelectOrganizationUrl="/app"
              skipInvitationScreen
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>How this works</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-text-secondary">
            <p>
              Create one organization per client. Switch the active client from
              the switcher in the top nav — everything you see follows it.
            </p>
            <p>
              Invite the client&apos;s people into their org so they get their
              own login and only see their own billing and downloads.
            </p>
            <p>
              Entitlements, purchases, and deliverables are all scoped to the
              active org, so nothing leaks across clients.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
