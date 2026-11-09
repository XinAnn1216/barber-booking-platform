import { useEffect, useState } from "react";
import { Scissors, ZoomIn } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { photoUrl, type Photo } from "@/lib/barbers";

/** Product-detail style gallery: main image, prev/next, thumbnails, click to zoom. */
export function PhotoCarousel({ photos, name }: { photos: Photo[]; name: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState<Photo | null>(null);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  if (photos.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-[2rem] bg-leather text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <Scissors className="h-10 w-10" />
          <span className="text-sm">還沒有作品照</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Carousel setApi={setApi} opts={{ loop: photos.length > 1 }} className="relative">
        <CarouselContent>
          {photos.map((p, i) => (
            <CarouselItem key={p.id}>
              <button
                type="button"
                onClick={() => setZoom(p)}
                className="group relative block w-full overflow-hidden rounded-[2rem] bg-leather"
                aria-label={`放大第 ${i + 1} 張作品照`}
              >
                <img
                  src={photoUrl(p.storage_path)}
                  alt={p.caption || `${name} 的作品 ${i + 1}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="absolute right-4 top-4 rounded-full bg-background/80 p-2 opacity-0 transition group-hover:opacity-100">
                  <ZoomIn className="h-4 w-4" />
                </span>
                {p.caption && (
                  <span className="absolute bottom-4 left-4 rounded-full bg-background/80 px-3 py-1 text-sm">
                    {p.caption}
                  </span>
                )}
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        {photos.length > 1 && (
          <>
            <CarouselPrevious className="left-4 bg-background/80" />
            <CarouselNext className="right-4 bg-background/80" />
          </>
        )}
      </Carousel>

      {photos.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="作品照">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={current === i}
              aria-label={`第 ${i + 1} 張`}
              onClick={() => api?.scrollTo(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${current === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <img src={photoUrl(p.storage_path)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{zoom?.caption || `${name} 的作品`}</DialogTitle>
          {zoom && (
            <img
              src={photoUrl(zoom.storage_path)}
              alt={zoom.caption || `${name} 的作品`}
              className="max-h-[85vh] w-full rounded-2xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
