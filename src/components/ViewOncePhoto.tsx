import { useState } from "react";
import { Eye } from "lucide-react";

interface ViewOncePhotoProps {
  src: string;
  opened: boolean;
  onOpen: () => void;
}

const ViewOncePhoto = ({ src, opened, onOpen }: ViewOncePhotoProps) => {
  const [viewing, setViewing] = useState(false);

  if (opened && !viewing) {
    return (
      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground italic">
        <Eye className="w-3.5 h-3.5" />
        <span>Foto aberta</span>
      </div>
    );
  }

  if (viewing) {
    return (
      <div
        className="relative cursor-pointer"
        onClick={() => setViewing(false)}
      >
        <img
          src={src}
          alt="Foto"
          className="rounded-lg max-w-full max-h-[400px] object-cover"
        />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-3 py-1 rounded-full flex items-center gap-1">
          <Eye className="w-3 h-3" />
          visualização única
        </div>
      </div>
    );
  }

  // Not opened yet - show blurred preview
  return (
    <div
      className="relative cursor-pointer rounded-lg overflow-hidden w-48 h-64"
      onClick={() => {
        setViewing(true);
        onOpen();
      }}
    >
      <img
        src={src}
        alt="Foto"
        className="w-full h-full object-cover blur-xl scale-110"
      />
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Eye className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs font-medium">Foto</span>
        <span className="text-white/70 text-[10px]">Toque para abrir</span>
      </div>
    </div>
  );
};

export default ViewOncePhoto;
