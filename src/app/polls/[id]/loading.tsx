import { Bone, BoneCard, PageSkeleton } from "@/components/status/skeleton";

/** Shaped like the live results screen: pills, title, crew, leader card, the pack. */
export default function PollLoading() {
  return (
    <PageSkeleton label="Loading results…">
      <div className="flex gap-3">
        <Bone className="h-9 w-32 rounded-full" />
        <Bone className="h-9 w-48 rounded-full" />
      </div>
      <Bone className="mt-5 h-12 w-5/6" />
      <Bone className="mt-3 h-12 w-1/2" />
      <div className="mt-5 flex items-center gap-3">
        <Bone className="h-9 w-28 rounded-full" />
        <Bone className="h-4 w-48" />
      </div>
      <BoneCard className="mt-10">
        <Bone className="h-8 w-2/3" />
        <Bone className="mt-6 h-14 w-24" />
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: 10 }, (_, tick) => (
            <Bone key={tick} className="h-4 flex-1 rounded-sm" />
          ))}
        </div>
      </BoneCard>
      <BoneCard className="mt-8 flex flex-col gap-6">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-5">
            <Bone className="h-5 flex-1" />
            <Bone className="hidden h-3 w-40 rounded-full sm:block" />
            <Bone className="h-6 w-16" />
          </div>
        ))}
      </BoneCard>
    </PageSkeleton>
  );
}
