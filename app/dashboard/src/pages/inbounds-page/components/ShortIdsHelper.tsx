import { useState } from "react";
import { Dices } from "lucide-react";
import shuffle from "lodash/shuffle";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSet(ids: string[]): void;
}

function ShortIdsHelper({ onSet }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          shortIds
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={10} align="start">
        <Content
          onSet={(ids) => {
            onSet(ids);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function Content({ onSet }: Props) {
  const [ids, setIds] = useState<string[]>(generateShortIds);

  function generateShortIds(length: number = 8) {
    return shuffle(
      Array.from({ length }).map((_, index) =>
        generateRealityShortId(index + 1),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea readOnly value={ids.join(", ")} />
      <div className="flex gap-1 items-center justify-end">
        <Button
          size="icon-sm"
          variant="secondary"
          onClick={() => setIds(generateShortIds())}
        >
          <Dices />
        </Button>
        <Button onClick={() => onSet(ids)}>Setup</Button>
      </div>
    </div>
  );
}

function generateRealityShortId(length = 8) {
  const bytes = new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default ShortIdsHelper;
