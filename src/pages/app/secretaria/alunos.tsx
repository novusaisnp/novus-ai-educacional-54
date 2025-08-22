
import { Navigate, useLocation } from "react-router-dom";

export default function RedirectAlunos() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/app/alunos", search }} replace />;
}
