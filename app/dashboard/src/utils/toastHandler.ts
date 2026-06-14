import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

export const generateErrorMessage = (e: any, form?: UseFormReturn<any>) => {
  if (e.response?.data) {
    if (typeof e.response.data.detail === "string")
      return toast.error(e.response.data.detail, {
        closeButton: true,
        duration: 3000,
      });

    if (typeof e.response.data.detail === "object")
      if (form) {
        Object.keys(e.response.data.detail).forEach((errorKey) =>
          form.setError(errorKey, {
            message: e.response.data.detail[errorKey],
          }),
        );
        return;
      }
  }
  return toast.error("Something went wrong!", {
    closeButton: true,
    duration: 3000,
  });
};

export const generateSuccessMessage = (message: string) => {
  return toast.success(message, {
    closeButton: true,
    duration: 3000,
  });
};
