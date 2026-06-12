import { CreateToastFnReturn } from "@chakra-ui/react";
import { UseFormReturn } from "react-hook-form";

export const generateErrorMessage = (
  e: any,
  toast: CreateToastFnReturn,
  form?: UseFormReturn<any>
) => {
  if (e.response?.data) {
    if (typeof e.response.data.detail === "string")
      return toast({
        title: e.response.data.detail,
        status: "error",
        isClosable: true,
        position: "top",
        duration: 3000,
      });
    if (typeof e.response.data.detail === "object")
      if (form) {
        Object.keys(e.response.data.detail).forEach((errorKey) =>
          form.setError(errorKey, {
            message: e.response.data.detail[errorKey],
          })
        );
        return;
      }
  }
  return toast({
    title: "Something went wrong!",
    status: "error",
    isClosable: true,
    position: "top",
    duration: 3000,
  });
};

export const generateSuccessMessage = (
  message: string,
  toast: CreateToastFnReturn
) => {
  return toast({
    title: message,
    status: "success",
    isClosable: true,
    position: "top",
    duration: 3000,
  });
};
