import { Bone, BoneCard, PageSkeleton } from "@/components/status/skeleton";

/** Shaped like the ballot, so a voter on a slow phone sees the page forming, not a blank screen. */
export default function VoteLoading() {
  return (
    <PageSkeleton label="Loading the poll…">
      <div className="flex gap-3">
        <Bone className="h-9 w-32 rounded-full" />
        <Bone className="h-9 w-44 rounded-full" />
      </div>
      <Bone className="mt-5 h-12 w-5/6" />
      <BoneCard className="mt-8">
        <div className="flex items-center gap-4">
          <Bone className="size-16 rounded-full" />
          <Bone className="h-6 w-40" />
        </div>
        <Bone className="mt-5 h-12 w-full" />
        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {Array.from({ length: 8 }, (_, face) => (
            <Bone key={face} className="mx-auto size-13 rounded-full" />
          ))}
        </div>
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
