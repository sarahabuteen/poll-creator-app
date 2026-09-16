import { Bone, BoneCard, PageSkeleton } from "@/components/status/skeleton";

/** The moment between the server's samples and this browser's saved copy: a poll-shaped placeholder. */
export function GuestPageSkeleton({ label }: { label: string }) {
  return (
    <PageSkeleton label={label}>
      <div className="flex gap-3">
        <Bone className="h-9 w-32 rounded-full" />
        <Bone className="h-9 w-44 rounded-full" />
      </div>
      <Bone className="mt-5 h-12 w-5/6" />
      <BoneCard className="mt-8">
        <Bone className="h-7 w-2/3" />
        <Bone className="mt-5 h-14 w-28" />
        <Bone className="mt-5 h-4 w-full" />
      </BoneCard>
      <div className="mt-8 flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <BoneCard key={row} className="flex items-center gap-4 !p-4">
            <Bone className="size-7 rounded-full" />
            <Bone className="h-5 flex-1" />
          </BoneCard>
        ))}
      </div>
    </PageSkeleton>
  );
}
