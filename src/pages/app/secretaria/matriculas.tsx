
import { Navigate, useLocation } from "react-router-dom";

export default function RedirectMatriculas() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/app/matriculas", search }} replace />;
}
