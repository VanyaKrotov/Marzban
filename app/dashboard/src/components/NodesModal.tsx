import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonProps,
  chakra,
  Checkbox,
  Collapse,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  EyeIcon,
  EyeSlashIcon,
  PlusIcon as HeroIconPlusIcon,
  SquaresPlusIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FetchNodesQueryKey,
  getNodeDefaultValues,
  NodeSchema,
  NodeType,
  useNodes,
  useNodesQuery,
} from "contexts/NodesContext";
import { FC, ReactNode, useState } from "react";
import { Controller, useForm, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  UseMutateFunction,
  useMutation,
  useQuery,
  useQueryClient,
} from "react-query";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import { Status } from "types/User";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";
import { useDashboard } from "../contexts/DashboardContext";
import { DeleteNodeModal } from "./DeleteNodeModal";
import { DeleteIcon } from "./DeleteUserModal";
import { ReloadIcon } from "./Filters";
import { Icon } from "./Icon";
import { NodeModalStatusBadge } from "./NodeModalStatusBadge";

import { fetch } from "service/http";
import { Input } from "./Input";

const CustomInput = chakra(Input, {
  baseStyle: {
    bg: "white",
    _dark: {
      bg: "gray.700",
    },
  },
});

const ModalIcon = chakra(SquaresPlusIcon, {
  baseStyle: {
    w: 5,
    h: 5,
  },
});

const PlusIcon = chakra(HeroIconPlusIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    strokeWidth: 2,
  },
});

type AccordionInboundType = {
  toggleAccordion: () => void;
  node: NodeType;
};

const NodeAccordion: FC<AccordionInboundType> = ({ toggleAccordion, node }) => {
  const { updateNode, reconnectNode, setDeletingNode } = useNodes();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<NodeType>({
    defaultValues: node,
    resolver: zodResolver(NodeSchema),
  });
  const handleDeleteNode = setDeletingNode.bind(null, node);

  const { isLoading, mutate } = useMutation(updateNode, {
    onSuccess: () => {
      generateSuccessMessage("Node updated successfully", toast);
      queryClient.invalidateQueries(FetchNodesQueryKey);
    },
    onError: (e) => {
      generateErrorMessage(e, toast, form);
    },
  });

  const { isLoading: isReconnecting, mutate: reconnect } = useMutation(
    reconnectNode.bind(null, node),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(FetchNodesQueryKey);
      },
    }
  );

  const nodeStatus: Status = isReconnecting
    ? "connecting"
    : node.status
    ? node.status
    : "error";

  return (
    <AccordionItem
      border="1px solid"
      _dark={{ borderColor: "gray.600" }}
      _light={{ borderColor: "gray.200" }}
      borderRadius="4px"
      p={1}
      w="full"
    >
      <AccordionButton px={2} borderRadius="3px" onClick={toggleAccordion}>
        <HStack w="full" justifyContent="space-between" pr={2}>
          <Text
            as="span"
            fontWeight="medium"
            fontSize="sm"
            flex="1"
            textAlign="left"
            color="gray.700"
            _dark={{ color: "gray.300" }}
          >
            {node.name}
          </Text>
          <HStack>
            {node.xray_version && (
              <Badge
                colorScheme="blue"
                rounded="full"
                display="inline-flex"
                px={3}
                py={1}
              >
                <Text
                  textTransform="capitalize"
                  fontSize="0.7rem"
                  fontWeight="medium"
                  letterSpacing="tighter"
                >
                  Xray {node.xray_version}
                </Text>
              </Badge>
            )}
            {node.status && <NodeModalStatusBadge status={nodeStatus} compact />}
          </HStack>
        </HStack>
        <AccordionIcon />
      </AccordionButton>
      <AccordionPanel px={2} pb={2}>
        <VStack pb={3} alignItems="flex-start">
          {nodeStatus === "error" && (
            <Alert status="error" size="xs">
              <Box>
                <HStack w="full">
                  <AlertIcon w={4} />
                  <Text marginInlineEnd={0}>{node.message}</Text>
                </HStack>
                <HStack justifyContent="flex-end" w="full">
                  <Button
                    size="sm"
                    aria-label="reconnect node"
                    leftIcon={<ReloadIcon />}
                    onClick={() => reconnect()}
                    disabled={isReconnecting}
                  >
                    {isReconnecting
                      ? t("nodes.reconnecting")
                      : t("nodes.reconnect")}
                  </Button>
                </HStack>
              </Box>
            </Alert>
          )}
        </VStack>
        <NodeForm
          form={form}
          mutate={mutate}
          isLoading={isLoading}
          submitBtnText={t("nodes.editNode")}
          btnLeftAdornment={
            <Tooltip label={t("delete")} placement="top">
              <IconButton
                colorScheme="red"
                variant="ghost"
                size="sm"
                aria-label="delete node"
                onClick={handleDeleteNode}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          }
        />
        {node.id && <NodeCertificates node={node} />}
      </AccordionPanel>
    </AccordionItem>
  );
};

type NodeCertificate = {
  id: number;
  node_id: number;
  domain: string;
  certificate: string;
  expires_at?: string | null;
  active: boolean;
  inbound_tags: string[];
  created_at: string;
  updated_at: string;
};

const NodeCertificates: FC<{ node: NodeType }> = ({ node }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { inbounds } = useDashboard();
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const queryKey = ["node-certificates", node.id];
  const inboundList = [...inbounds.values()].flat();
  const { data: certificates = [] } = useQuery<NodeCertificate[]>({
    queryKey,
    queryFn: () => fetch(`/node/${node.id}/certificates`),
  });
  const issue = useMutation(
    ({ issuedDomain, force = false }: { issuedDomain: string; force?: boolean }) =>
      fetch<NodeCertificate>(`/node/${node.id}/certificates/issue`, {
        method: "POST",
        body: { domain: issuedDomain, email: email || null, force },
      }),
    {
      onSuccess: () => {
        setDomain("");
        queryClient.invalidateQueries(queryKey);
        generateSuccessMessage(t("nodes.certificates.issueSuccess"), toast);
      },
      onError: (error) => {
        generateErrorMessage(error, toast);
      },
    }
  );
  const update = useMutation(
    ({
      certificate,
      body,
    }: {
      certificate: NodeCertificate;
      body: Partial<Pick<NodeCertificate, "active" | "inbound_tags">>;
    }) =>
      fetch(`/node/${node.id}/certificates/${certificate.id}`, {
        method: "PUT",
        body,
      }),
    {
      onSuccess: () => queryClient.invalidateQueries(queryKey),
      onError: (error) => {
        generateErrorMessage(error, toast);
      },
    }
  );
  const remove = useMutation(
    (certificate: NodeCertificate) =>
      fetch(`/node/${node.id}/certificates/${certificate.id}`, {
        method: "DELETE",
      }),
    {
      onSuccess: () => queryClient.invalidateQueries(queryKey),
      onError: (error) => {
        generateErrorMessage(error, toast);
      },
    }
  );

  return (
    <VStack align="stretch" mt={5} spacing={3}>
      <Divider />
      <Text fontWeight="semibold" fontSize="sm">
        {t("nodes.certificates.title")}
      </Text>
      <CustomInput
        label={t("nodes.certificates.domain")}
        size="sm"
        placeholder="node.example.com"
        value={domain}
        onChange={(event) => setDomain(event.target.value)}
      />
      <CustomInput
        label={t("nodes.certificates.email")}
        size="sm"
        placeholder="admin@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button
        size="sm"
        colorScheme="primary"
        isLoading={issue.isLoading}
        isDisabled={!domain}
        onClick={() => issue.mutate({ issuedDomain: domain })}
      >
        {t("nodes.certificates.issue")}
      </Button>
      {!certificates.length && (
        <Text fontSize="xs" color="gray.500">
          {t("nodes.certificates.empty")}
        </Text>
      )}
      {certificates.map((certificate) => (
        <Box
          key={certificate.id}
          borderWidth="1px"
          borderRadius="md"
          p={3}
        >
          <HStack justify="space-between">
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                {certificate.domain}
              </Text>
              {certificate.expires_at && (
                <Text fontSize="xs" color="gray.500">
                  {t("nodes.certificates.expires", {
                    date: new Date(certificate.expires_at).toLocaleDateString(),
                  })}
                </Text>
              )}
            </Box>
            <Switch
              colorScheme="primary"
              isChecked={certificate.active}
              onChange={(event) =>
                update.mutate({
                  certificate,
                  body: { active: event.target.checked },
                })
              }
            />
          </HStack>
          <Text fontSize="xs" mt={3} mb={1} color="gray.500">
            {t("nodes.certificates.inbounds")}
          </Text>
          <VStack align="stretch" spacing={1}>
            {inboundList
              .filter((inbound) => inbound.tls === "tls")
              .map((inbound) => (
                <Checkbox
                  key={inbound.tag}
                  size="sm"
                  isChecked={certificate.inbound_tags.includes(inbound.tag)}
                  onChange={(event) => {
                    const tags = event.target.checked
                      ? [...certificate.inbound_tags, inbound.tag]
                      : certificate.inbound_tags.filter(
                          (tag) => tag !== inbound.tag
                        );
                    update.mutate({
                      certificate,
                      body: { inbound_tags: tags },
                    });
                  }}
                >
                  {inbound.tag}
                </Checkbox>
              ))}
          </VStack>
          <HStack mt={3}>
            <Button
              size="xs"
              variant="outline"
              isLoading={issue.isLoading}
              onClick={() =>
                issue.mutate({ issuedDomain: certificate.domain, force: true })
              }
            >
              {t("nodes.certificates.renew")}
            </Button>
            <Button
              size="xs"
              colorScheme="red"
              variant="ghost"
              isLoading={remove.isLoading}
              onClick={() => remove.mutate(certificate)}
            >
              {t("delete")}
            </Button>
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};

type AddNodeFormType = {
  toggleAccordion: () => void;
  resetAccordions: () => void;
};

const AddNodeForm: FC<AddNodeFormType> = ({
  toggleAccordion,
  resetAccordions,
}) => {
  const toast = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNode } = useNodes();
  const form = useForm<NodeType>({
    resolver: zodResolver(NodeSchema),
    defaultValues: {
      ...getNodeDefaultValues(),
      add_as_new_host: false,
    },
  });
  const { isLoading, mutate } = useMutation(addNode, {
    onSuccess: () => {
      generateSuccessMessage(
        t("nodes.addNodeSuccess", { name: form.getValues("name") }),
        toast
      );
      queryClient.invalidateQueries(FetchNodesQueryKey);
      form.reset();
      resetAccordions();
    },
    onError: (e) => {
      generateErrorMessage(e, toast, form);
    },
  });
  return (
    <AccordionItem
      border="1px solid"
      _dark={{ borderColor: "gray.600" }}
      _light={{ borderColor: "gray.200" }}
      borderRadius="4px"
      p={1}
      w="full"
    >
      <AccordionButton px={2} borderRadius="3px" onClick={toggleAccordion}>
        <Text
          as="span"
          fontWeight="medium"
          fontSize="sm"
          flex="1"
          textAlign="left"
          color="gray.700"
          _dark={{ color: "gray.300" }}
          display="flex"
          gap={1}
        >
          <PlusIcon display={"inline-block"} />{" "}
          <span>{t("nodes.addNewMarzbanNode")}</span>
        </Text>
      </AccordionButton>
      <AccordionPanel px={2} py={4}>
        <NodeForm
          form={form}
          mutate={mutate}
          isLoading={isLoading}
          submitBtnText={t("nodes.addNode")}
          btnProps={{ variant: "solid" }}
          addAsHost
        />
      </AccordionPanel>
    </AccordionItem>
  );
};

type NodeFormType = FC<{
  form: UseFormReturn<NodeType>;
  mutate: UseMutateFunction<unknown, unknown, any>;
  isLoading: boolean;
  submitBtnText: string;
  btnProps?: Partial<ButtonProps>;
  btnLeftAdornment?: ReactNode;
  addAsHost?: boolean;
}>;

const NodeForm: NodeFormType = ({
  form,
  mutate,
  isLoading,
  submitBtnText,
  btnProps = {},
  btnLeftAdornment,
  addAsHost = false,
}) => {
  const { t } = useTranslation();
  const [showCertificate, setShowCertificate] = useState(false);
  const { data: nodeSettings, isLoading: nodeSettingsLoading } = useQuery({
    queryKey: "node-settings",
    queryFn: () =>
      fetch<{
        min_node_version: string;
        certificate: string;
      }>("/node/settings"),
  });
  function selectText(node: HTMLElement) {
    // @ts-ignore
    if (document.body.createTextRange) {
      // @ts-ignore
      const range = document.body.createTextRange();
      range.moveToElementText(node);
      range.select();
    } else if (window.getSelection) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(node);
      selection!.removeAllRanges();
      selection!.addRange(range);
    } else {
      console.warn("Could not select text in node: Unsupported browser.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit((v) => mutate(v))}>
      <VStack>
        {nodeSettings && nodeSettings.certificate && (
          <Alert status="info" alignItems="start">
            <AlertDescription
              display="flex"
              flexDirection="column"
              overflow="hidden"
            >
              <span>{t("nodes.connection-hint")}</span>
              <HStack justify="end" py={2}>
                <Button
                  as="a"
                  colorScheme="primary"
                  size="xs"
                  download="ssl_client_cert.pem"
                  href={URL.createObjectURL(
                    new Blob([nodeSettings.certificate], { type: "text/plain" })
                  )}
                >
                  {t("nodes.download-certificate")}
                </Button>
                <Tooltip
                  placement="top"
                  label={t(
                    !showCertificate
                      ? "nodes.show-certificate"
                      : "nodes.show-certificate"
                  )}
                >
                  <IconButton
                    aria-label={t(
                      !showCertificate
                        ? "nodes.show-certificate"
                        : "nodes.show-certificate"
                    )}
                    onClick={setShowCertificate.bind(null, !showCertificate)}
                    colorScheme="whiteAlpha"
                    color="primary"
                    size="xs"
                  >
                    {!showCertificate ? (
                      <EyeIcon width="15px" />
                    ) : (
                      <EyeSlashIcon width="15px" />
                    )}
                  </IconButton>
                </Tooltip>
              </HStack>
              <Collapse in={showCertificate} animateOpacity>
                <Text
                  bg="rgba(255,255,255,.5)"
                  _dark={{
                    bg: "rgba(255,255,255,.2)",
                  }}
                  rounded="md"
                  p="2"
                  lineHeight="1.2"
                  fontSize="10px"
                  fontFamily="Courier"
                  whiteSpace="pre"
                  overflow="auto"
                  onClick={(e) => {
                    selectText(e.target as HTMLElement);
                  }}
                >
                  {nodeSettings.certificate}
                </Text>
              </Collapse>
            </AlertDescription>
          </Alert>
        )}

        <HStack w="full">
          <FormControl>
            <CustomInput
              label={t("nodes.nodeName")}
              size="sm"
              placeholder="Marzban-S2"
              {...form.register("name")}
              error={form.formState?.errors?.name?.message}
            />
          </FormControl>
          <HStack px={1}>
            <Controller
              name="status"
              control={form.control}
              render={({ field }) => {
                return (
                  <Tooltip
                    key={field.value}
                    placement="top"
                    label={
                      `${t("usersTable.status")}: ` +
                      (field.value !== "disabled" ? t("active") : t("disabled"))
                    }
                    textTransform="capitalize"
                  >
                    <Box mt="6">
                      <Switch
                        colorScheme="primary"
                        isChecked={field.value !== "disabled"}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange("connecting");
                          } else {
                            field.onChange("disabled");
                          }
                        }}
                      />
                    </Box>
                  </Tooltip>
                );
              }}
            />
          </HStack>
        </HStack>
        <HStack alignItems="flex-start" w="100%">
          <Box w="100%">
            <CustomInput
              label={t("nodes.nodeAddress")}
              size="sm"
              placeholder="51.20.12.13"
              {...form.register("address")}
              error={form.formState?.errors?.address?.message}
            />
          </Box>
        </HStack>
        <HStack alignItems="flex-start" w="100%">
        <Box>
            <CustomInput
              label={t("nodes.nodePort")}
              size="sm"
              placeholder="62050"
              {...form.register("port")}
              error={form.formState?.errors?.port?.message}
            />
          </Box>
          <Box>
            <CustomInput
              label={t("nodes.nodeAPIPort")}
              size="sm"
              placeholder="62051"
              {...form.register("api_port")}
              error={form.formState?.errors?.api_port?.message}
            />
          </Box>
          <Box>
            <CustomInput
              label={t("nodes.usageCoefficient")}
              size="sm"
              placeholder="1"
              {...form.register("usage_coefficient")}
              error={form.formState?.errors?.usage_coefficient?.message}
            />
          </Box>
        </HStack>
        {addAsHost && (
          <FormControl py={1}>
            <Checkbox {...form.register("add_as_new_host")}>
              <FormLabel m={0}>{t("nodes.addHostForEveryInbound")}</FormLabel>
            </Checkbox>
          </FormControl>
        )}
        <HStack w="full">
          {btnLeftAdornment}
          <Button
            flexGrow={1}
            type="submit"
            colorScheme="primary"
            size="sm"
            px={5}
            w="full"
            isLoading={isLoading}
            {...btnProps}
          >
            {submitBtnText}
          </Button>
        </HStack>
      </VStack>
    </form>
  );
};

export const NodesDialog: FC = () => {
  const { isEditingNodes, onEditingNodes } = useDashboard();
  const { t } = useTranslation();
  const [openAccordions, setOpenAccordions] = useState<any>({});
  const { data: nodes, isLoading } = useNodesQuery();

  const onClose = () => {
    setOpenAccordions({});
    onEditingNodes(false);
  };

  const toggleAccordion = (index: number | string) => {
    if (openAccordions[String(index)]) {
      delete openAccordions[String(index)];
    } else openAccordions[String(index)] = {};

    setOpenAccordions({ ...openAccordions });
  };

  return (
    <>
      <Modal isOpen={isEditingNodes} onClose={onClose}>
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent mx="3" w="fit-content" maxW="3xl">
          <ModalHeader pt={6}>
            <Icon color="primary">
              <ModalIcon color="white" />
            </Icon>
          </ModalHeader>
          <ModalCloseButton mt={3} />
          <ModalBody w="440px" pb={6} pt={3}>
            <Text mb={3} opacity={0.8} fontSize="sm">
              {t("nodes.title")}
            </Text>
            {isLoading && "loading..."}

            <Accordion
              w="full"
              allowToggle
              index={Object.keys(openAccordions).map((i) => parseInt(i))}
            >
              <VStack w="full">
                {!isLoading &&
                  nodes &&
                  nodes.map((node, index) => {
                    return (
                      <NodeAccordion
                        toggleAccordion={() => toggleAccordion(index)}
                        key={node.name}
                        node={node}
                      />
                    );
                  })}

                <AddNodeForm
                  toggleAccordion={() => toggleAccordion((nodes || []).length)}
                  resetAccordions={() => setOpenAccordions({})}
                />
              </VStack>
            </Accordion>
          </ModalBody>
        </ModalContent>
      </Modal>
      <DeleteNodeModal deleteCallback={() => setOpenAccordions({})} />
    </>
  );
};
