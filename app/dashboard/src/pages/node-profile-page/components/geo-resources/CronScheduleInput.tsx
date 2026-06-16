import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type CronScheduleInputProps = {
  id: string;
  name: string;
  value: string;
  required?: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
};

export function CronScheduleInput({
  id,
  name,
  value,
  required,
  onBlur,
  onChange,
}: CronScheduleInputProps) {
  const { t } = useTranslation();

  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        name={name}
        value={value}
        required={required}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0 4 * * *"
      />
      <InputGroupAddon align="inline-end">
        <Popover>
          <PopoverTrigger asChild>
            <InputGroupButton
              aria-label={t("geoResources.cronHelp")}
              className="text-muted-foreground"
              size="icon-xs"
            >
              <Info />
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="block max-w-80 space-y-3 p-3 text-left"
            side="top"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p className="font-medium">{t("geoResources.cronCurrent")}</p>
              <p className="mt-1 ">{describeCron(value, t)}</p>
            </div>
            <div>
              <p className="font-medium">
                {t("geoResources.cronExamplesTitle")}
              </p>
              <ul className="mt-1 space-y-1 ">
                <li>
                  <code>0 12 * * *</code> -{" "}
                  {t("geoResources.cronExampleDailyNoon")}
                </li>
                <li>
                  <code>0 * * * *</code> - {t("geoResources.cronExampleHourly")}
                </li>
                <li>
                  <code>0 0 * * *</code> - {t("geoResources.cronExampleDaily")}
                </li>
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}

function describeCron(
  value: string,
  t: (key: string, options?: Record<string, string>) => string,
) {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 5) {
    return t("geoResources.cronUnknown");
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const everyDay = dayOfMonth === "*" && month === "*" && dayOfWeek === "*";
  if (!everyDay) {
    return t("geoResources.cronUnknown");
  }

  if (minute === "*" && hour === "*") {
    return t("geoResources.cronEveryMinute");
  }

  if (isCronNumber(minute) && hour === "*") {
    return t("geoResources.cronHourlyAtMinute", {
      minute: minute.padStart(2, "0"),
    });
  }

  if (isCronNumber(minute) && isCronNumber(hour)) {
    return t("geoResources.cronDailyAt", {
      time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
    });
  }

  return t("geoResources.cronUnknown");
}

function isCronNumber(value: string) {
  return /^\d+$/.test(value);
}
