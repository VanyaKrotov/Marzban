import { FC } from "react";
import { useTranslation } from "react-i18next";

import Page from "@/components/page";
import UsersTable from "@/components/users-table";

import { Statistics } from "./components/Statistics";
import { UsersPageActions } from "./components/UsersPageActions";

export const UsersPage: FC = () => {
  const { t } = useTranslation();

  return (
    <Page>
      <Page.Header actions={<UsersPageActions />}>
        <h1 className="font-semibold">{t("users")}</h1>
      </Page.Header>
      <div className="flex flex-col gap-y-5">
        <Statistics />
        <UsersTable />
      </div>
    </Page>
  );
};

export default UsersPage;
