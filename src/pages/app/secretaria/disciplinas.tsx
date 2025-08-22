
import { Navigate, useLocation } from "react-router-dom";

export default function RedirectDisciplinas() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/app/disciplinas", search }} replace />;
}
