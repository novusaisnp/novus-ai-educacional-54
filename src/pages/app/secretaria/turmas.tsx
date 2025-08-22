
import { Navigate, useLocation } from "react-router-dom";

export default function RedirectTurmas() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/app/turmas", search }} replace />;
}
