import { Bone, BoneCard, PageSkeleton } from "@/components/status/skeleton";

export default function DashboardLoading() {
  return (
    <PageSkeleton label="Loading your polls…">
      <Bone className="h-12 w-56" />
      <BoneCard className="mt-8">
        <Bone className="h-8 w-36 rounded-full" />
        <Bone className="mt-4 h-8 w-3/4" />
        <Bone className="mt-3 h-4 w-40" />
        <Bone className="mt-5 h-5 w-2/3" />
        <div className="mt-5 flex gap-2">
          <Bone className="h-12 w-40 rounded-full" />
          <Bone className="h-12 w-32 rounded-full" />
        </div>
      </BoneCard>
      <Bone className="mt-10 h-6 w-32" />
      <div className="mt-3 flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <BoneCard key={row} className="flex items-center gap-4 !p-4">
            <div className="flex-1">
              <Bone className="h-5 w-2/3" />
              <Bone className="mt-2 h-4 w-1/2" />
            </div>
            <Bone className="h-9 w-28 rounded-full" />
          </BoneCard>
        ))}
      </div>
    </PageSkeleton>
  );
}
