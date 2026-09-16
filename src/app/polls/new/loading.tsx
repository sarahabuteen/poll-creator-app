import { Bone, BoneCard, PageSkeleton } from "@/components/status/skeleton";

/** Shaped like the create form: question and options, then the rules. */
export default function NewPollLoading() {
  return (
    <PageSkeleton label="Loading…" width="form">
      <Bone className="h-12 w-48" />
      <Bone className="mt-3 h-5 w-3/4" />
      <BoneCard className="mt-8">
        <Bone className="h-6 w-56" />
        <Bone className="mt-4 h-12 w-full" />
        <div className="mt-6 flex flex-col gap-3">
          <Bone className="h-12 w-full" />
          <Bone className="h-12 w-full" />
        </div>
      </BoneCard>
      <BoneCard className="mt-8">
        <Bone className="h-6 w-40" />
        <div className="mt-4 flex gap-2">
          <Bone className="h-12 flex-1" />
          <Bone className="h-12 flex-1" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {[28, 36, 32, 24, 28].map((width, pick) => (
            <Bone key={pick} className="h-11 rounded-full" style={{ width: `${width / 4}rem` }} />
          ))}
        </div>
      </BoneCard>
    </PageSkeleton>
  );
}
