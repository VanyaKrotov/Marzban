import type { ComponentProps } from "react";
import { LoaderCircle, Save } from "lucide-react";
import {
  Controller,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type InputProps = ComponentProps<typeof Input>;

export function Section({ children }: { children: React.ReactNode }) {
  return (
    <FieldSet className="grid gap-4 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
      {children}
    </FieldSet>
  );
}

export function TextInput<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  type = "text",
  inputMode,
  min,
  max,
  step,
}: {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
  type?: InputProps["type"];
  inputMode?: InputProps["inputMode"];
  min?: InputProps["min"];
  max?: InputProps["max"];
  step?: InputProps["step"];
}) {
  const error = form.getFieldState(name, form.formState).error;
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        type={type}
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        {...form.register(name)}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}

export function TextareaInput<TFieldValues extends FieldValues>({
  form,
  name,
  label,
}: {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
}) {
  const error = form.getFieldState(name, form.formState).error;
  return (
    <Field className="md:col-span-2 xl:col-span-3">
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Textarea id={name} rows={4} {...form.register(name)} />
      <FieldError errors={[error]} />
    </Field>
  );
}

export function SwitchInput<TFieldValues extends FieldValues>({
  form,
  name,
  label,
}: {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Field
          orientation="horizontal"
          className="justify-between rounded-md border p-3"
        >
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Switch
            id={name}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
          />
        </Field>
      )}
    />
  );
}

export function SettingsActionItem({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Item variant="outline" className="md:col-span-2 xl:col-span-3">
      <ItemContent className="min-w-0 basis-full sm:basis-0">
        <ItemTitle className="w-full">{title}</ItemTitle>
        <ItemDescription className="whitespace-normal break-words">
          {description}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="w-full sm:ms-auto sm:w-auto [&>button]:w-full sm:[&>button]:w-auto [&>[data-slot=dropdown-menu]]:w-full sm:[&>[data-slot=dropdown-menu]]:w-auto [&_[data-slot=dropdown-menu-trigger]]:w-full sm:[&_[data-slot=dropdown-menu-trigger]]:w-auto">
        {children}
      </ItemActions>
    </Item>
  );
}

export function SettingsSaveButton({
  isPending,
  isValid,
  label,
}: {
  isPending: boolean;
  isValid: boolean;
  label: string;
}) {
  return (
    <Button type="submit" size="sm" disabled={isPending || !isValid}>
      {isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
      {label}
    </Button>
  );
}
