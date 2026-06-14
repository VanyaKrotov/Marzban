import { forwardRef, type ComponentProps } from "react";
import { type Control, Controller } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { HostFormValues } from "../lib/form";
import { InfoTooltip } from "./InfoTooltip";

export const HostTextField = forwardRef<
  HTMLInputElement,
  ComponentProps<typeof Input> & {
    id: string;
    label: string;
    description?: string;
    error?: string;
  }
>(({ id, label, description, error, ...props }, ref) => {
  return (
    <Field data-invalid={Boolean(error)}>
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && <InfoTooltip content={description} />}
      </div>
      <Input id={id} ref={ref} {...props} />
      <FieldError errors={error ? [{ message: error }] : []} />
    </Field>
  );
});

export function HostSelectField({
  name,
  label,
  description,
  options,
  control,
  disabled,
}: {
  name: "security" | "alpn" | "fingerprint";
  label: string;
  description?: string;
  options: { title: string; value: string }[];
  control: Control<HostFormValues>;
  disabled: boolean;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field>
          <div className="flex items-center gap-1.5">
            <FieldLabel>{label}</FieldLabel>
            {description && <InfoTooltip content={description} />}
          </div>
          <Select
            value={field.value || "__empty__"}
            disabled={disabled}
            onValueChange={(value) =>
              field.onChange(value === "__empty__" ? "" : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem
                    key={option.value || "__empty__"}
                    value={option.value || "__empty__"}
                  >
                    {option.title || "—"}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}
