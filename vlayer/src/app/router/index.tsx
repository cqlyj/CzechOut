import { BrowserRouter, Routes, Route } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorBoundaryComponent } from "../../shared/errors/ErrorBoundary";
import { Layout } from "../../shared/layout/Layout";
import { getAllSteps } from "./steps";
import { DashboardContainer } from "../../pages/dashboard";
import { WelcomePage } from "../../pages/welcome";

const Router = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={AppErrorBoundaryComponent}>
        <Routes>
          {/* Full-screen routes without modal wrapper */}
          <Route path="/dashboard" element={<DashboardContainer />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/" element={<WelcomePage />} />

          {/* All other routes with modal wrapper */}
          <Route path="/app" element={<Layout />}>
            {getAllSteps()
              .filter(
                (step) => step.path !== "dashboard" && step.path !== "welcome"
              ) // Exclude dashboard and welcome from modal layout
              .map((step) => (
                <Route
                  key={step.path}
                  path={step.path}
                  element={<step.component />}
                />
              ))}
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
export default Router;
