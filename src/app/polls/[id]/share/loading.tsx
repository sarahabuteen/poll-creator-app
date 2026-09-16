import { Bone, BoneCard, PageSkeleton } from "@/components/status/skeleton";

export default function ShareLoading() {
  return (
    <PageSkeleton label="Getting your link ready…" width="form">
      <Bone className="size-16 rounded-full" />
      <Bone className="mt-4 h-11 w-3/4" />
      <Bone className="mt-3 h-5 w-full" />
      <BoneCard className="mt-8">
        <Bone className="h-6 w-2/3" />
        <Bone className="mt-4 h-14 w-full rounded-full" />
        <Bone className="mt-6 h-20 w-3/4" />
      </BoneCard>
    </PageSkeleton>
  );
}
