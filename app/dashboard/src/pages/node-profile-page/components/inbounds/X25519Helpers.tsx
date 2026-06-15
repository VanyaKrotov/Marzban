import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dices } from "lucide-react";

import { api } from "@/service/http";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  onSet(publicKey: string, privateKey: string): void;
}

function X25519Helpers({ onSet }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary">
          x25519
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={10} align="start" className="w-sm">
        <Content
          onSet={(...args) => {
            onSet(...args);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function Content({ onSet }: Props) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["x25519"],
    queryFn: ({ signal }) =>
      api.get<{ public_key: string; private_key: string }>("/core/x25519", {
        signal,
      }),
    retry: 1,
  });

  return (
    <div className="flex flex-col gap-2">
      <Field>
        <FieldLabel>Public key</FieldLabel>
        <Input readOnly value={data?.public_key ?? ""} />
      </Field>
      <Field>
        <FieldLabel>Private key</FieldLabel>
        <Input readOnly value={data?.private_key ?? ""} />
      </Field>
      <div className="flex gap-1 items-center justify-end">
        <Button size="icon-sm" variant="secondary" onClick={() => refetch()}>
          <Dices />
        </Button>
        <Button
          onClick={() => onSet(data!.public_key, data!.private_key)}
          disabled={isFetching || !data}
        >
          Setup
        </Button>
      </div>
    </div>
  );
}

export default X25519Helpers;
