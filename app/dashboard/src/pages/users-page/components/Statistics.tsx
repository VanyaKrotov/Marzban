import { useQuery } from "@tanstack/react-query";
import { Network, PieChart, Users } from "lucide-react";
import { FC, PropsWithChildren, ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { api } from "service/http";
import { formatBytes, numberWithCommas } from "utils/formatByte";

import { Card, CardContent } from "../../../components/ui/card";

type StatisticCardProps = {
  title: string;
  content: ReactNode;
  icon: ReactElement;
};

type SystemStats = {
  users_active: number;
  total_user: number;
  incoming_bandwidth: number;
  outgoing_bandwidth: number;
  mem_used: number;
  mem_total: number;
};

const StatisticCard: FC<PropsWithChildren<StatisticCardProps>> = ({
  title,
  content,
  icon,
}) => {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-x-3">
        <div className="w-fit rounded-lg bg-secondary/80 p-3 [&>svg]:size-5">
          {icon}
        </div>
        <div className="text-lg">{title}</div>
        <div className="ml-auto text-xl font-medium">{content}</div>
      </CardContent>
    </Card>
  );
};

export const StatisticsQueryKey = ["statistics-query-key"] as const;

export const Statistics: FC = () => {
  const { t } = useTranslation();
  const { data: systemData } = useQuery({
    queryKey: StatisticsQueryKey,
    queryFn: () => api.get<SystemStats>("/system"),
    refetchInterval: 5000,
  });

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <StatisticCard
        title={t("activeUsers")}
        content={
          systemData &&
          `${numberWithCommas(systemData.users_active)} / ${numberWithCommas(systemData.total_user)}`
        }
        icon={<Users />}
      />
      <StatisticCard
        title={t("dataUsage")}
        content={
          systemData &&
          formatBytes(
            systemData.incoming_bandwidth + systemData.outgoing_bandwidth,
          )
        }
        icon={<Network />}
      />
      <StatisticCard
        title={t("memoryUsage")}
        content={
          systemData &&
          `${formatBytes(systemData.mem_used, 1, true)[0]} ${formatBytes(systemData.mem_used, 1, true)[1]} / ${formatBytes(systemData.mem_total, 1)}`
        }
        icon={<PieChart />}
      />
    </div>
  );
};
