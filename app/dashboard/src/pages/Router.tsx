import { createHashRouter } from "react-router-dom";
import { api } from "../service/http";
import { Dashboard } from "./Dashboard";
import { Login } from "./Login";

const fetchAdminLoader = () => {
  return api.get("/admin");
};

export const router = createHashRouter([
  {
    path: "/",
    element: <Dashboard />,
    errorElement: <Login />,
    loader: fetchAdminLoader,
  },
  {
    path: "/login/",
    element: <Login />,
  },
]);
