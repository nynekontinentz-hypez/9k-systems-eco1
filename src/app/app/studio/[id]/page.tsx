import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { loadProjectScoped } from "@/lib/studio-server";
import {
  ProjectWorkspace,
  type WorkspaceProject,
} from "@/components/studio/project-workspace";
import { isStudioAiConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function StudioProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) notFound();

  const { db, project } = await loadProjectScoped(id, userId, orgId);
  if (!db || !project) notFound();

  const { data: assets } = await db
    .from("studio_assets")
    .select("id, kind, name, size_bytes, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const wp: WorkspaceProject = {
    id: project.id,
    title: project.title,
    channel: project.channel,
    status: project.status,
    idea: project.idea,
    hook: project.hook,
    titles: project.titles,
    script: project.script,
  };

  return (
    <ProjectWorkspace
      project={wp}
      initialAssets={assets ?? []}
      aiConfigured={isStudioAiConfigured}
    />
  );
}
