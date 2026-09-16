import { Bone, BoneCard, PageSkeleton } from "@/components/status/skeleton";

/** Guest mode while the sample polls load: the banner's place, then a dashboard shape. */
export default function GuestLoading() {
  return (
    <>
      <div aria-hidden="true" className="border-b-2 border-cocoa-faint bg-cream-deep px-4 py-2.5">
        <Bone className="mx-auto h-5 w-full max-w-xl bg-cream" />
      </div>
      <PageSkeleton label="Loading the sample polls…">
        <Bone className="h-5 w-52" />
        <Bone className="mt-2 h-12 w-56" />
        <BoneCard className="mt-8">
          <Bone className="h-8 w-36 rounded-full" />
          <Bone className="mt-4 h-8 w-3/4" />
          <Bone className="mt-3 h-4 w-40" />
          <Bone className="mt-5 h-5 w-2/3" />
        </BoneCard>
        <div className="mt-10 flex flex-col gap-3">
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
    </>
  );
}
